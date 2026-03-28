import { McpServer } from "skybridge/server";
import { z } from "zod";

const mealSchema = z.object({
  name: z.string().describe("Name of the meal"),
  description: z.string().describe("Short description of the meal"),
  kcal: z.number().describe("Calories"),
  protein: z.number().describe("Protein in grams"),
  carbs: z.number().describe("Carbohydrates in grams"),
  fat: z.number().describe("Fat in grams"),
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
  { capabilities: {} },
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
