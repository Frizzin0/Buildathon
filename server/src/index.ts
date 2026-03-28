import { McpServer } from "skybridge/server";
import { z } from "zod";
import {
  lookupUser,
  saveProfile,
  getCurrentPlan,
  saveMealPlan,
  getRecentMeals,
} from "./supabase.js";

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

const targetsSchema = z.object({
  kcal: z.number().describe("Daily calorie target"),
  protein: z.number().describe("Daily protein target in grams"),
  carbs: z.number().describe("Daily carbs target in grams"),
  fat: z.number().describe("Daily fat target in grams"),
});

const server = new McpServer(
  { name: "meal-planner", version: "0.2.0" },
  {
    capabilities: {},
    instructions: `You are a certified sports nutritionist specializing in personalized meal planning.

## Workflow (follow in order)
1. Greet the user and ask their first name.
2. Call lookup-user with the name.
3. If lookup-user returns found = false:
   a. Show the collect-profile widget so the user can fill in their dietary profile.
   b. After the profile is submitted, call save-profile with all the form fields.
   c. Calculate TDEE and macro targets from the profile.
   d. Call get-recent-meals with the new userId (will return empty for new users).
   e. Generate a full 7-day meal plan.
   f. Call save-meal-plan to persist it.
   g. Call show-meal-plan with userId and weekStart to display the saved plan.
4. If lookup-user returns found = true AND currentWeekPlan is present:
   a. Greet the returning user by name.
   b. Call show-meal-plan with the user's id to display their existing plan.
   c. Tell them "Here's your meal plan for this week. Want to change anything?"
5. If lookup-user returns found = true but currentWeekPlan is null:
   a. Greet the returning user by name.
   b. Call get-recent-meals to fetch meals from the last 2 weeks.
   c. Calculate TDEE and macro targets from the stored profile.
   d. Generate a new 7-day plan. AVOID repeating any meal names returned by get-recent-meals — maximize variety.
   e. Call save-meal-plan to persist it.
   f. Call show-meal-plan with userId and weekStart to display the saved plan.
6. On modification requests:
   a. Call save-meal-plan with the full updated plan (complete plan where only the changed meal(s) differ).
   b. Re-invoke show-meal-plan with userId to refresh the display.

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
- When get-recent-meals returns meal names, do NOT reuse any of those names. Introduce new dishes to maximize weekly variety.

## Modifications
- When the user asks to change a specific meal, call save-meal-plan with the complete plan where only the requested meal differs.
- Keep unchanged meals exactly as they were — do not regenerate the entire plan.
- If a modification would significantly impact daily macro balance, adjust adjacent meals slightly to compensate.
- After saving, call show-meal-plan with userId to refresh the display.`,
  },
)
  // ---------------------------------------------------------------------------
  // Tools (no UI)
  // ---------------------------------------------------------------------------
  .registerTool(
    "lookup-user",
    {
      description:
        "Look up an existing user by first name. Returns their profile and current week's meal plan if one exists. Call this at the start of every conversation after asking the user's name.",
      inputSchema: {
        name: z.string().describe("The user's first name"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name }) => {
      const user = await lookupUser(name);
      if (!user) {
        return {
          structuredContent: { found: false },
          content: [
            {
              type: "text" as const,
              text: `No user found with name "${name}". Proceed with onboarding by showing the collect-profile widget.`,
            },
          ],
        };
      }

      const currentWeekPlan = await getCurrentPlan(user.id);
      return {
        structuredContent: {
          found: true,
          user: {
            id: user.id,
            name: user.name,
            age: user.age,
            sex: user.sex,
            height_cm: user.height_cm,
            weight_kg: user.weight_kg,
            goal_weight_kg: user.goal_weight_kg,
            activity_level: user.activity_level,
            diet_style: user.diet_style,
            goal: user.goal,
            meals_per_day: user.meals_per_day,
            intolerances: user.intolerances,
            dislikes: user.dislikes,
            cooking_time_weekday: user.cooking_time_weekday,
            meal_prep: user.meal_prep,
          },
          currentWeekPlan,
        },
        content: [
          {
            type: "text" as const,
            text: currentWeekPlan
              ? `Found user "${user.name}" with an active meal plan for this week. Display it using show-meal-plan.`
              : `Found user "${user.name}" but no meal plan for this week. Generate a new plan.`,
          },
        ],
      };
    },
  )
  .registerTool(
    "save-profile",
    {
      description:
        "Save a new user's dietary profile to the database after the collect-profile form is submitted. Returns the generated userId.",
      inputSchema: {
        name: z.string().describe("First name"),
        age: z.union([z.number(), z.string()]).describe("Age in years"),
        sex: z.enum(["male", "female"]),
        height: z.union([z.number(), z.string()]).describe("Height in cm"),
        weight: z.union([z.number(), z.string()]).describe("Weight in kg"),
        goalWeight: z
          .union([z.number(), z.string()])
          .optional()
          .describe("Goal weight in kg, omit if not specified"),
        activityLevel: z.enum([
          "sedentary",
          "lightly_active",
          "moderately_active",
          "very_active",
        ]),
        dietStyle: z.enum([
          "no_preference",
          "mediterranean",
          "high_protein",
          "vegetarian",
          "vegan",
          "keto",
          "other",
        ]),
        goal: z.enum([
          "lose_weight",
          "maintain",
          "gain_muscle",
          "eat_healthier",
        ]),
        mealsPerDay: z
          .union([z.number(), z.string()])
          .describe("3, 4, or 5"),
        intolerances: z
          .array(z.string())
          .describe("e.g. ['gluten', 'lactose']"),
        dislikes: z
          .string()
          .optional()
          .describe("Free text, e.g. 'no fish, hate broccoli'"),
        cookingTime: z.enum(["under_20min", "20_40min", "no_limit"]),
        mealPrep: z
          .string()
          .describe("'yes', 'sometimes', or 'no'"),
      },
    },
    async (input) => {
      console.log("[save-profile] received input:", JSON.stringify(input, null, 2));
      try {
        const profile = {
          name: input.name,
          age: Number(input.age),
          sex: input.sex,
          height_cm: Number(input.height),
          weight_kg: Number(input.weight),
          goal_weight_kg: input.goalWeight ? Number(input.goalWeight) : null,
          activity_level: input.activityLevel,
          diet_style: input.dietStyle,
          goal: input.goal,
          meals_per_day: Number(input.mealsPerDay),
          intolerances: input.intolerances,
          dislikes: input.dislikes || null,
          cooking_time_weekday: input.cookingTime,
          meal_prep: input.mealPrep,
        };
        console.log("[save-profile] transformed profile:", JSON.stringify(profile, null, 2));
        const user = await saveProfile(profile);
        console.log("[save-profile] saved user:", user.id);
        return {
          structuredContent: { userId: user.id },
          content: [
            {
              type: "text" as const,
              text: `Profile saved for ${user.name} (id: ${user.id}). Proceed to generate their meal plan.`,
            },
          ],
        };
      } catch (err) {
        console.error("[save-profile] error:", err);
        throw err;
      }
    },
  )
  .registerTool(
    "save-meal-plan",
    {
      description:
        "Persist a meal plan to the database. Call this after generating or modifying a plan displayed via show-meal-plan. Deactivates any previous plan for the same week.",
      inputSchema: {
        userId: z.string().uuid().describe("The user's UUID"),
        weekStart: z
          .string()
          .describe("Start date of the week, e.g. '2026-03-30'"),
        targets: targetsSchema.describe("Daily nutritional targets"),
        days: z
          .array(dayPlanSchema)
          .length(7)
          .describe("Exactly 7 day plans, Monday through Sunday"),
      },
    },
    async (input) => {
      const mealPlanId = await saveMealPlan(input.userId, {
        weekStart: input.weekStart,
        targets: input.targets,
        days: input.days,
      });
      return {
        structuredContent: { mealPlanId },
        content: [
          {
            type: "text" as const,
            text: `Meal plan saved (id: ${mealPlanId}).`,
          },
        ],
      };
    },
  )
  .registerTool(
    "get-recent-meals",
    {
      description:
        "Fetch distinct meal names from the user's plans in the last 2 weeks. Use this before generating a new weekly plan to avoid repeating meals and maximize variety.",
      inputSchema: {
        userId: z.string().uuid().describe("The user's UUID"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ userId }) => {
      const recentMealNames = await getRecentMeals(userId);
      return {
        structuredContent: { recentMealNames },
        content: [
          {
            type: "text" as const,
            text:
              recentMealNames.length > 0
                ? `The user had these meals recently: ${recentMealNames.join(", ")}. Avoid repeating them in the new plan.`
                : "No recent meals found. Generate freely.",
          },
        ],
      };
    },
  )
  // ---------------------------------------------------------------------------
  // Widgets (with UI)
  // ---------------------------------------------------------------------------
  .registerWidget(
    "collect-profile",
    { description: "Onboarding form" },
    {
      description:
        "Show the onboarding form so the user can enter their dietary profile (lifestyle, body stats, goals, intolerances). Call this only when lookup-user returns found = false.",
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
        "Display a weekly meal plan as an interactive Kanban board. The plan is fetched from the database, so you MUST call save-meal-plan first to persist the plan before calling this widget. To update a single meal, call save-meal-plan with the full updated plan, then re-invoke this widget to refresh the display.",
      inputSchema: {
        userId: z.string().uuid().describe("The user's UUID"),
        weekStart: z
          .string()
          .optional()
          .describe(
            "Start date of the week, e.g. '2026-03-30'. Defaults to the current week if omitted.",
          ),
      },
    },
    async ({ userId, weekStart }) => {
      const plan = await getCurrentPlan(userId, weekStart);
      if (!plan) {
        throw new Error(
          "No active meal plan found. Call save-meal-plan first to persist the plan before displaying it.",
        );
      }
      return {
        structuredContent: plan,
        content: [
          {
            type: "text" as const,
            text: `Meal plan for week starting ${plan.weekStart} is now displayed.`,
          },
        ],
      };
    },
  );

server.run();

export type AppType = typeof server;
