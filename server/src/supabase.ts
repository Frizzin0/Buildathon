import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  loadEnv();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "Create a .env file in the project root (see .env.example).",
    );
  }

  _client = createClient(url, key);
  return _client;
}

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number | null;
  activity_level: string;
  diet_style: string;
  goal: string;
  meals_per_day: number;
  intolerances: string[];
  dislikes: string | null;
  cooking_time_weekday: string;
  meal_prep: boolean;
}

interface MealRow {
  id: string;
  meal_plan_id: string;
  day_index: number;
  meal_type: string;
  sort_order: number;
  name: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  price: number | null;
}

export interface WidgetMeal {
  name: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  recipe: { ingredients: string[]; instructions: string[] };
}

export interface WidgetDayPlan {
  day: string;
  breakfast: WidgetMeal;
  morningSnack: WidgetMeal;
  lunch: WidgetMeal;
  afternoonSnack: WidgetMeal;
  dinner: WidgetMeal;
}

export interface WidgetPlan {
  weekStart: string;
  targets: { kcal: number; protein: number; carbs: number; fat: number };
  days: WidgetDayPlan[];
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const WIDGET_KEY_TO_DB: Record<string, string> = {
  breakfast: "breakfast",
  morningSnack: "morning_snack",
  lunch: "lunch",
  afternoonSnack: "afternoon_snack",
  dinner: "dinner",
};

const DB_TO_WIDGET_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(WIDGET_KEY_TO_DB).map(([k, v]) => [v, k]),
);

function currentWeekMonday(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function lookupUser(
  name: string,
): Promise<UserProfile | null> {
  const { data, error } = await getClient()
    .from("users")
    .select("*")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function saveProfile(profile: {
  name: string;
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg?: number | null;
  activity_level: string;
  diet_style: string;
  goal: string;
  meals_per_day: number;
  intolerances: string[];
  dislikes?: string | null;
  cooking_time_weekday: string;
  meal_prep: string;
}): Promise<UserProfile> {
  const row = {
    ...profile,
    meal_prep: profile.meal_prep !== "no",
  };

  const { data, error } = await getClient()
    .from("users")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function getCurrentPlan(
  userId: string,
  weekStart?: string,
): Promise<WidgetPlan | null> {
  const ws = weekStart ?? currentWeekMonday();

  const db = getClient();

  const { data: plan, error: planErr } = await db
    .from("meal_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", ws)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (planErr) throw planErr;
  if (!plan) return null;

  const { data: meals, error: mealsErr } = await db
    .from("meals")
    .select("*")
    .eq("meal_plan_id", plan.id)
    .order("day_index")
    .order("sort_order");

  if (mealsErr) throw mealsErr;

  return dbToWidget(plan, meals as MealRow[]);
}

export async function saveMealPlan(
  userId: string,
  widgetPlan: WidgetPlan,
): Promise<string> {
  const weekStart = widgetPlan.weekStart;
  const db = getClient();

  const { data: existing } = await db
    .from("meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .eq("is_active", true)
    .maybeSingle();

  let mealPlanId: string;

  if (existing) {
    mealPlanId = existing.id;
    const dayIndices = widgetPlan.days.map(
      (d) => DAY_NAMES.indexOf(d.day as (typeof DAY_NAMES)[number]),
    );
    await db
      .from("meals")
      .delete()
      .eq("meal_plan_id", mealPlanId)
      .in("day_index", dayIndices);
  } else {
    await db
      .from("meal_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .eq("is_active", true);

    const { data: plan, error: planErr } = await db
      .from("meal_plans")
      .insert({
        user_id: userId,
        week_start: weekStart,
        is_active: true,
        targets_kcal: widgetPlan.targets.kcal,
        targets_protein: widgetPlan.targets.protein,
        targets_carbs: widgetPlan.targets.carbs,
        targets_fat: widgetPlan.targets.fat,
      })
      .select("id")
      .single();

    if (planErr) throw planErr;
    mealPlanId = plan.id as string;
  }

  const mealRows = widgetToDbMeals(mealPlanId, widgetPlan);
  const { error: mealsErr } = await db.from("meals").insert(mealRows);
  if (mealsErr) throw mealsErr;

  return mealPlanId;
}

export async function getRecentMeals(
  userId: string,
  weeks = 2,
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - weeks * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const db = getClient();

  const { data: plans, error: plansErr } = await db
    .from("meal_plans")
    .select("id")
    .eq("user_id", userId)
    .gte("week_start", cutoffStr);

  if (plansErr) throw plansErr;
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);

  const { data: meals, error: mealsErr } = await db
    .from("meals")
    .select("name")
    .in("meal_plan_id", planIds);

  if (mealsErr) throw mealsErr;

  const unique = [...new Set((meals ?? []).map((m) => m.name))];
  return unique;
}

// ---------------------------------------------------------------------------
// DB ↔ Widget format converters
// ---------------------------------------------------------------------------

function dbToWidget(
  plan: Record<string, unknown>,
  meals: MealRow[],
): WidgetPlan {
  const emptyMeal: WidgetMeal = {
    name: "",
    description: "",
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    price: 0,
    recipe: { ingredients: [], instructions: [] },
  };

  const days: WidgetDayPlan[] = DAY_NAMES.map((dayName, idx) => {
    const dayMeals = meals.filter((m) => m.day_index === idx);
    const byType: Record<string, WidgetMeal> = {};

    for (const m of dayMeals) {
      const widgetKey = DB_TO_WIDGET_KEY[m.meal_type] ?? m.meal_type;
      byType[widgetKey] = {
        name: m.name,
        description: m.description ?? "",
        kcal: m.kcal ?? 0,
        protein: m.protein_g ?? 0,
        carbs: m.carbs_g ?? 0,
        fat: m.fat_g ?? 0,
        price: m.price ?? 0,
        recipe: {
          ingredients: m.ingredients ?? [],
          instructions: m.instructions ?? [],
        },
      };
    }

    return {
      day: dayName,
      breakfast: byType.breakfast ?? { ...emptyMeal },
      morningSnack: byType.morningSnack ?? { ...emptyMeal },
      lunch: byType.lunch ?? { ...emptyMeal },
      afternoonSnack: byType.afternoonSnack ?? { ...emptyMeal },
      dinner: byType.dinner ?? { ...emptyMeal },
    };
  });

  return {
    weekStart: plan.week_start as string,
    targets: {
      kcal: (plan.targets_kcal as number) ?? 0,
      protein: (plan.targets_protein as number) ?? 0,
      carbs: (plan.targets_carbs as number) ?? 0,
      fat: (plan.targets_fat as number) ?? 0,
    },
    days,
  };
}

function widgetToDbMeals(
  mealPlanId: string,
  widgetPlan: WidgetPlan,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const dayPlan of widgetPlan.days) {
    const dayIdx = DAY_NAMES.indexOf(dayPlan.day as (typeof DAY_NAMES)[number]);

    for (const [widgetKey, dbType] of Object.entries(WIDGET_KEY_TO_DB)) {
      const meal = dayPlan[widgetKey as keyof WidgetDayPlan];
      if (typeof meal === "string") continue;

      const m = meal as WidgetMeal;
      rows.push({
        meal_plan_id: mealPlanId,
        day_index: dayIdx,
        meal_type: dbType,
        sort_order: 0,
        name: m.name,
        description: m.description || null,
        ingredients: m.recipe?.ingredients ?? [],
        instructions: m.recipe?.instructions ?? [],
        kcal: m.kcal,
        protein_g: m.protein,
        carbs_g: m.carbs,
        fat_g: m.fat,
        price: m.price ?? null,
      });
    }
  }

  return rows;
}
