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

Stores the user's profile collected during onboarding and the nutritional
targets calculated by the LLM.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `created_at` | timestamptz | |
| `name` | text | |
| `email` | text unique | |
| `age` | int | |
| `gender` | text | `male` / `female` / `other` |
| `weight_kg` | numeric(5,2) | |
| `height_cm` | numeric(5,2) | |
| `activity_level` | text | `sedentary` → `very_active` |
| `goal` | text | `lose_weight` / `maintain` / `gain_muscle` |
| `dietary_restrictions` | text[] | e.g. `['gluten_free', 'vegetarian']` |
| `notes` | text | Free text for special needs |
| `target_kcal` | int | Set by LLM after onboarding |
| `target_protein_g` | int | Set by LLM after onboarding |
| `target_carbs_g` | int | Set by LLM after onboarding |
| `target_fat_g` | int | Set by LLM after onboarding |

**Design note:** Nutritional targets live on `users` (not on `meal_plans`)
because they represent a stable baseline tied to the person's profile, not to a
specific week. They are recalculated only if the user updates their profile.

---

### `meal_plans`

One record per weekly plan. A user can have multiple plans (current + history);
only one should have `is_active = true` at any given time.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | Cascade delete |
| `created_at` | timestamptz | |
| `week_start` | date | Always a Monday |
| `is_active` | boolean | Only one active plan per user |
| `notes` | text | Weekly context (e.g. "business trip Wed") |

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
| `meal_plan_id` | uuid FK → meal_plans | Cascade delete |
| `day_index` | int | 0 = Monday … 6 = Sunday |
| `meal_type` | text | `breakfast` / `lunch` / `dinner` / `snack` |
| `sort_order` | int | Enables drag-and-drop reordering within a slot |
| `name` | text | Meal name |
| `description` | text | Short description |
| `ingredients` | text[] | List of ingredients |
| `kcal` | int | LLM estimate |
| `protein_g` | int | LLM estimate |
| `carbs_g` | int | LLM estimate |
| `fat_g` | int | LLM estimate |
| `was_as_planned` | boolean | Default `true`; set to `false` via chat check-in |
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

---

## Key Architectural Choices

### 1. Single `meals` table (no separate `consumed_meals`)

An earlier version of the model used two tables: `meals` for the plan and
`consumed_meals` for tracking. This was simplified to a single table with
`was_as_planned` + `actual_*` columns for three reasons:

- **Query simplicity.** Every Kanban card is one row. No JOIN required to
  display a card with its tracking status.
- **Atomic updates.** Marking a meal as consumed and logging the difference is a
  single `UPDATE`, not an `INSERT` on a second table.
- **Demo performance.** Fewer round-trips to Supabase = faster UI updates.

The trade-off is a wider row with nullable columns. Acceptable for MVP scale.

### 2. `ingredients` as `text[]`

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

### 3. `sort_order` for drag-and-drop

Each meal has a `sort_order` integer within its `(meal_plan_id, day_index,
meal_type)` group. When the user drags a card to a new position, only
`sort_order` (and optionally `day_index` / `meal_type` if moved across columns)
is updated. This avoids rewriting the entire plan on every interaction.

### 4. Tracking defaults to "as planned"

`was_as_planned` defaults to `true`. The LLM only asks for differences at the
end of the day. This means:

- No friction for users who followed the plan.
- The `actual_*` columns stay `null` for the majority of meals, keeping storage
  lean.
- The daily check-in is a single chat interaction, not a manual logging UI.

### 5. Row Level Security (RLS)

RLS is enabled on all three tables. Users can only read and write their own
data. Policies are tied to `auth.uid()` from Supabase Auth. This is the
minimum viable security posture for a multi-user app.

---

## Entity Relationship Diagram

```
users
  │
  └─< meal_plans (user_id)
          │
          └─< meals (meal_plan_id)
```

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
| Multi-user / family | Add `household_id` to `users`; update RLS policies |
