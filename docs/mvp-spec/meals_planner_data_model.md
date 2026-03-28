# Meals Planner — Data Model Documentation

## Overview

The data model is intentionally flat and minimal. Three tables cover the full
MVP scope — user profiling, weekly plan management, and meal-level detail
including tracking — while leaving clear extension points for future features
(recipe book, shopping list, plan history).

All identifiers are UUIDs. All timestamps are `timestamptz`. The schema is
written in English throughout.

---

## Tables

### `users`

Stores exclusively the 13 fields collected during the onboarding survey.
No authentication data, no computed targets — those are derived by the LLM
at runtime and passed as context, not persisted here.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `created_at` | timestamptz | |
| `age` | int | Survey: Personal Data |
| `sex` | text | `male` / `female` |
| `height_cm` | numeric(5,2) | Survey: Personal Data |
| `weight_kg` | numeric(5,2) | Survey: Personal Data |
| `goal_weight_kg` | numeric(5,2) | Optional; `null` if "same as now / not sure" |
| `activity_level` | text | `sedentary` / `lightly_active` / `moderately_active` / `very_active` |
| `diet_style` | text | `no_preference` / `mediterranean` / `high_protein` / `vegetarian_vegan` / `keto_low_carb` / `other` |
| `diet_style_other` | text | Free text; populated only when `diet_style = 'other'` |
| `goal` | text | `lose_weight` / `maintain` / `gain_muscle` / `eat_healthier` |
| `meals_per_day` | int | `3` / `4` / `5` |
| `intolerances` | text[] | Multi-select: `gluten`, `lactose`, `nuts`, `eggs`, `shellfish` |
| `dislikes` | text | Free text, e.g. "no fish, hate broccoli" |
| `cooking_time_weekday` | text | `under_20min` / `20_40min` / `no_limit` |
| `meal_prep` | boolean | Whether the user cooks in bulk |

**Survey → LLM JSON mapping:** At plan generation time, these columns are
serialised into the profile JSON object passed as system context to the LLM:

```json
{
  "profile": {
    "age": 32,
    "sex": "male",
    "height_cm": 178,
    "weight_kg": 82,
    "goal_weight_kg": 76,
    "activity_level": "moderately_active",
    "diet_style": "high_protein",
    "goal": "lose_weight",
    "meals_per_day": 4,
    "intolerances": ["lactose"],
    "dislikes": "no fish",
    "cooking_time_weekday": "20_40min",
    "meal_prep": false
  }
}
```

**Design note:** Nutritional targets (TDEE, macro split) are intentionally
**not stored** on `users`. They are calculated by the LLM on each plan
generation using the profile above. This avoids stale cached values and removes
the need for a recalculation trigger when the user updates their profile.

---

### `meal_plans`

One record per weekly plan. A user can have multiple plans (current + history);
only one should have `is_active = true` at any given time.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `users.id` | Cascade delete |
| `created_at` | timestamptz | |
| `week_start` | date | Always a Monday |
| `is_active` | boolean | Only one active plan per user at a time |
| `notes` | text | Weekly context (e.g. "business trip Wed") |

**Dependency on `users`:** `meal_plans.user_id` references `users.id` with
`ON DELETE CASCADE`. Deleting a user removes all their plans automatically.
The plan inherits the user's profile indirectly — when the LLM generates meals
for a plan, it reads `users` at generation time and embeds the results in the
`meals` rows (macros, ingredients). The `meal_plans` table itself holds no
profile data; it only anchors the week.

**Design note:** Keeping `meal_plans` as a separate table (rather than embedding
the week directly on `meals`) allows plan history to be stored cleanly. Future
features — plan comparison, "use last week's plan as template" — are trivial to
implement with this structure.

---

### `meals`

The core table. Each row represents one meal slot in the Kanban (one card).
It holds both the **planned** meal and, if different, the **actually consumed**
meal in the same record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `meal_plan_id` | uuid FK → `meal_plans.id` | Cascade delete |
| `day_index` | int | `0` = Monday … `6` = Sunday |
| `meal_type` | text | `breakfast` / `lunch` / `dinner` / `snack` |
| `sort_order` | int | Enables drag-and-drop reordering within a slot |
| `name` | text not null | Meal name |
| `description` | text | Short description |
| `ingredients` | text[] | List of ingredients |
| `kcal` | int | LLM estimate at plan generation |
| `protein_g` | int | LLM estimate at plan generation |
| `carbs_g` | int | LLM estimate at plan generation |
| `fat_g` | int | LLM estimate at plan generation |
| `was_as_planned` | boolean | Default `true`; set to `false` via end-of-day chat |
| `actual_name` | text | Populated only if `was_as_planned = false` |
| `actual_kcal` | int | Populated only if `was_as_planned = false` |
| `actual_protein_g` | int | Populated only if `was_as_planned = false` |
| `actual_carbs_g` | int | Populated only if `was_as_planned = false` |
| `actual_fat_g` | int | Populated only if `was_as_planned = false` |
| `consumed_note` | text | Free-text note from the end-of-day chat |
| `consumed_at` | date | Populated at check-in |
| `calendar_event_id` | text | Google Calendar event ID after export |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

**Dependency on `meal_plans`:** `meals.meal_plan_id` references `meal_plans.id`
with `ON DELETE CASCADE`. Deleting a plan removes all its meals automatically.
There is no direct FK from `meals` to `users` — user context flows through
`meal_plans` — but the full chain is always resolvable via a single JOIN:
`meals → meal_plans → users`.

---

## Dependency Map

```
users
  │  id (PK)
  │
  └─< meal_plans
        │  user_id → users.id  (ON DELETE CASCADE)
        │  id (PK)
        │
        └─< meals
              meal_plan_id → meal_plans.id  (ON DELETE CASCADE)
```

### Cascade behaviour

| Action | Effect |
|---|---|
| `DELETE FROM users WHERE id = ?` | Deletes all `meal_plans` for that user, which in turn deletes all their `meals` |
| `DELETE FROM meal_plans WHERE id = ?` | Deletes all `meals` belonging to that plan |
| `DELETE FROM meals WHERE id = ?` | No downstream effect (leaf table) |

### Data flow at plan generation

```
users (profile) ──► LLM ──► meals (name, macros, ingredients)
                       │
                       └──► meal_plans (week_start, is_active)
```

The LLM reads `users` once per generation request, calculates TDEE and macro
targets in-context, and writes structured meal data directly into `meals`.
No intermediate computed table is needed.

### Data flow at end-of-day check-in

```
chat input ──► LLM ──► UPDATE meals SET
                          was_as_planned = false,
                          actual_* = ...,
                          consumed_note = ...,
                          consumed_at = today
                        WHERE id = ?
```

---

## Key Architectural Choices

### 1. `users` holds only survey data

`users` contains exactly the 13 fields from the onboarding wizard. No email,
no display name, no computed nutritional targets. Authentication is handled
by Supabase Auth (`auth.users`) — a separate system table. The RLS policies
join on `auth.uid() = public.users.id`, which means the Auth user ID is reused
as the profile PK, keeping the link implicit and zero-cost.

### 2. Single `meals` table (no separate `consumed_meals`)

An earlier version of the model used two tables: `meals` for the plan and
`consumed_meals` for tracking. This was simplified to a single table with
`was_as_planned` + `actual_*` columns for three reasons:

- **Query simplicity.** Every Kanban card is one row. No JOIN required to
  display a card with its tracking status.
- **Atomic updates.** Marking a meal as consumed and logging the difference is a
  single `UPDATE`, not an `INSERT` on a second table.
- **Demo performance.** Fewer round-trips to Supabase = faster UI updates.

The trade-off is a wider row with nullable columns. Acceptable for MVP scale.

### 3. `ingredients` as `text[]`

Ingredients are stored as a flat array on `meals`, not in a normalised
`ingredients` table. This is an intentional MVP shortcut that still enables
two important future features:

- **Shopping list:** aggregate all `ingredients` arrays for the active plan →
  deduplicate → present as a list. Implementable with a single query and an LLM
  call to clean up duplicates.
- **Recipe book:** each `meals` row is already a proto-recipe (name +
  ingredients + macros). A `recipes` table can be introduced later by promoting
  selected meals.

Normalising ingredients in the MVP would add complexity (ingredient master
table, many-to-many join) with no benefit until quantities and units are tracked.

### 4. `sort_order` for drag-and-drop

Each meal has a `sort_order` integer within its `(meal_plan_id, day_index,
meal_type)` group. When the user drags a card to a new position, only
`sort_order` (and optionally `day_index` / `meal_type` if moved across columns)
is updated. This avoids rewriting the entire plan on every interaction.

### 5. Tracking defaults to "as planned"

`was_as_planned` defaults to `true`. The LLM only asks for differences at the
end of the day. This means:

- No friction for users who followed the plan.
- The `actual_*` columns stay `null` for the majority of meals, keeping storage
  lean.
- The daily check-in is a single chat interaction, not a manual logging UI.

### 6. Row Level Security (RLS)

RLS is enabled on all three tables. Policies are tied to `auth.uid()`:

| Table | Policy |
|---|---|
| `users` | `auth.uid() = id` |
| `meal_plans` | `user_id = auth.uid()` |
| `meals` | `meal_plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid())` |

Users can only read and write their own data at every level of the hierarchy.

---

## Indexes

| Table | Columns | Purpose |
|---|---|---|
| `meal_plans` | `(user_id, week_start)` | Fast lookup of a user's plans by week |
| `meals` | `(meal_plan_id, day_index, meal_type)` | Kanban column queries |
| `meals` | `(meal_plan_id, was_as_planned)` | Tracking/reporting queries |

---

## Extension Points (not in MVP)

| Feature | What to add |
|---|---|
| Shopping list | Query `ingredients` array; LLM deduplicates |
| Recipe book | New `recipes` table; meals can reference or be promoted to a recipe |
| Plan history UI | Query `meal_plans` where `is_active = false` |
| Micronutrients | Add columns to `meals` (fibre, sugar, saturated fat) |
| Cached macro targets | Add `target_kcal/protein/carbs/fat` back to `users` if LLM latency becomes an issue |
| Multi-user / family | Add `household_id` to `users`; update RLS policies |