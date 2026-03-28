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
- **Input**: `{ weekStart, targets: { kcal, protein, carbs, fat }, days: DayPlan[7] }` where each day has `breakfast`, `morningSnack`, `lunch`, `afternoonSnack`, `dinner`
- **Output**: Same as input (pass-through)
- **Views**: 7-column Kanban board (fullscreen), 5 cards per column
- **Behavior**: Renders meal plan; LLM re-invokes with updated data for surgical modifications; `data-llm` on each card for natural references
