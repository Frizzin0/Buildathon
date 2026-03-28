import { McpServer } from "skybridge/server";
import { z } from "zod";

const mealSchema = z.object({
  name: z.string().describe("Name of the meal"),
  description: z.string().describe("Short description of the meal"),
  kcal: z.number().describe("Calories"),
  protein: z.number().describe("Protein in grams"),
  carbs: z.number().describe("Carbohydrates in grams"),
  fat: z.number().describe("Fat in grams"),
  price: z
    .number()
    .describe("Estimated cost of the meal in EUR, rounded to two decimals"),
  recipe: z.object({
    ingredients: z
      .array(z.string())
      .describe("List of ingredients with quantities, e.g. '200g chicken breast'"),
    instructions: z
      .array(z.string())
      .describe("Step-by-step cooking instructions"),
  }).describe("Full recipe with ingredients and instructions"),
});

const dayPlanSchema = z.object({
  day: z
    .enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .describe("Day of the week"),
  breakfast: mealSchema,
  morningSnack: mealSchema.describe("Mid-morning snack between breakfast and lunch"),
  lunch: mealSchema,
  afternoonSnack: mealSchema.describe("Afternoon snack between lunch and dinner"),
  dinner: mealSchema,
});

const server = new McpServer(
  { name: "meal-planner", version: "0.1.0" },
  {
    capabilities: {},
    instructions: `You are a certified sports nutritionist specializing in personalized meal planning.

## Workflow
1. Always start by showing the collect-profile widget to gather the user's dietary profile.
2. Once the profile is submitted, calculate TDEE and macro targets, then generate a full 7-day meal plan using show-meal-plan.
3. After the plan is displayed, the user may request modifications via chat.

## TDEE & Macro Calculation
- Use the Mifflin-St Jeor equation:
  - Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161 + 166
  - Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
- Activity multipliers: sedentary ×1.2, lightly_active ×1.375, moderately_active ×1.55, very_active ×1.725
- Goal adjustments: lose_weight −500 kcal, maintain ±0, gain_muscle +300 kcal, eat_healthier ±0
- Macro split (defaults):
  - Protein: 1.6–2.2 g/kg body weight (higher end for gain_muscle and lose_weight)
  - Fat: 25–35% of total kcal
  - Carbs: remainder of kcal after protein and fat
- For keto/low-carb diet style: cap carbs at 20–50 g/day, increase fat to fill the gap.
- For high-protein diet style: use the upper protein range (2.2 g/kg).

## Meal Planning Rules
- Always generate exactly 5 meals per day: breakfast, morningSnack, lunch, afternoonSnack, dinner.
- Each meal must include: name, short description, kcal, protein (g), carbs (g), fat (g), estimated price (EUR), and a recipe with ingredients (with quantities) and step-by-step instructions.
- Estimate meal prices realistically based on typical EU supermarket costs for the ingredients used. Simple snacks should be €1–3, typical meals €3–8, premium ingredients (salmon, steak) €8–15.
- Daily meal totals must closely match the calculated kcal and macro targets (±5%).
- Respect intolerances strictly — never include ingredients from flagged allergen groups, not even as optional toppings.
- Respect dislikes — never include disliked foods.
- Honor the diet style (vegetarian, vegan, mediterranean, etc.) in every meal.
- Cooking time constraint applies to lunch and dinner on weekdays. Snacks and breakfast should always be quick.
- If the user meal-preps, suggest batch-friendly recipes (stews, grains, proteins that reheat well).
- Prefer whole, minimally processed foods. Minimize ultra-processed items.
- Vary ingredients across the week — avoid repeating the same protein or dish on consecutive days.

## Modifications
- When the user asks to change a specific meal, re-invoke show-meal-plan with the complete plan where only the requested meal differs.
- Keep unchanged meals exactly as they were — do not regenerate the entire plan.
- If a modification would significantly impact daily macro balance, adjust adjacent meals slightly to compensate.`,
  },
)
  .registerWidget(
    "collect-profile",
    { description: "Onboarding form" },
    {
      description:
        "Show the onboarding form so the user can enter their dietary profile (lifestyle, body stats, goals, intolerances). Call this at the start of every conversation to collect user info before generating a meal plan.",
      inputSchema: {},
    },
    async () => {
      return {
        structuredContent: {},
        content: [
          {
            type: "text" as const,
            text: "Onboarding form displayed. Wait for the user to submit their profile.",
          },
        ],
      };
    },
  )
  .registerWidget(
    "show-meal-plan",
    { description: "Weekly meal plan Kanban board" },
    {
      description:
        "Display a weekly meal plan as an interactive Kanban board. Provide the full 7-day plan with nutritional targets. To update a single meal, re-invoke this tool with the complete plan where only the changed meal differs.",
      inputSchema: {
        weekStart: z
          .string()
          .describe("Start date of the week, e.g. '2026-03-30'"),
        targets: z
          .object({
            kcal: z.number().describe("Daily calorie target"),
            protein: z.number().describe("Daily protein target in grams"),
            carbs: z.number().describe("Daily carbs target in grams"),
            fat: z.number().describe("Daily fat target in grams"),
          })
          .describe("Daily nutritional targets"),
        days: z
          .array(dayPlanSchema)
          .length(7)
          .describe(
            "Exactly 7 day plans, one per day Monday through Sunday",
          ),
      },
    },
    async (input) => {
      return {
        structuredContent: input,
        content: [
          {
            type: "text" as const,
            text: `Meal plan for week starting ${input.weekStart} is now displayed.`,
          },
        ],
      };
    },
  );

server.run();

export type AppType = typeof server;
