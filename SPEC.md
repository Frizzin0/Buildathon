# Meal Planner MVP

## Purpose

An MCP-powered meal planning assistant that generates a personalized weekly meal plan from a user profile and lets you modify it via natural language chat — visualized as a live Kanban board.

## UX Flows

### Onboarding

1. User opens app → LLM shows onboarding form
2. User fills profile (lifestyle, goal, intolerances)
3. User clicks "Generate My Week"
4. LLM calculates kcal + macro targets from profile
5. LLM generates a 7-day meal plan

### View & Modify Meal Plan

1. Kanban renders: 7 columns (Mon–Sun), 5 cards per column (Breakfast, Snack, Lunch, Snack, Dinner)
2. User types modification request (e.g., "Replace Wednesday dinner with something light")
3. LLM re-invokes show-meal-plan with surgically updated data
4. Exactly the affected card updates — no full regeneration

## Tools and Widgets

**Widget: collect-profile**
- **Input**: (none — the widget IS the form)
- **Output**: `{}`
- **Views**: Single-page onboarding form
- **Behavior**: Stores form state in `useWidgetState`; on submit, triggers LLM via `useSendFollowUpMessage` to calculate targets and generate the plan

**Widget: show-meal-plan**
- **Input**: `{ weekStart, targets: { kcal, protein, carbs, fat }, days: DayPlan[7] }` where each day has `breakfast`, `morningSnack`, `lunch`, `afternoonSnack`, `dinner` — each meal includes `name`, `description`, `kcal`, `protein`, `carbs`, `fat`, `price` (estimated USD cost), and `recipe` (`{ ingredients: string[], instructions: string[] }`)
- **Output**: Same as input (pass-through)
- **Views**: 7-column Kanban board (fullscreen), 5 compact cards per column; clicking a card opens a detail modal
- **Behavior**: Renders meal plan; cards show name, kcal, macros, and price (no description on cards). Clicking a card opens a modal with the full description, a visual nutrition breakdown with macro bars, and the complete recipe (ingredients + instructions). LLM re-invokes with updated data for surgical modifications; `data-llm` on each card for natural references

## Nice to have

**Data & planning**

- Shopping list: aggregate `ingredients` from the active week, dedupe (query + LLM cleanup).
- Recipe book: promote saved meals to a `recipes` table; reuse in future plans.
- Plan history: browse past weeks (`is_active = false` or equivalent).
- Micronutrients on meals (e.g. fibre, sugar, saturated fat).
- Cached macro targets on the user profile if LLM latency becomes painful.
- Multi-user / household plans (shared `household_id`, RLS updates).

**UX & interaction**

- Editable slots in the widget: clear a slot, mark it as a “free meal”, or pick/swap in another recipe without relying only on chat.
- Drag-and-drop on the Kanban (update `sort_order` / move across day + meal slot) in addition to chat edits.
- “Start from last week” to clone or adapt a previous plan.
- Export week (PDF, calendar, or plain text for sharing).

**MCP / assistant**

- Dedicated tool(s) for shopping list, recipe CRUD, or history — not only widgets.
- Resources: short nutrition or cuisine guides the model can cite.
- Validation tool for plan JSON against your schema (CI + assistant self-check).