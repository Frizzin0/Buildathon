import "@/index.css";

import { useEffect } from "react";
import { mountWidget, useLayout, useDisplayMode } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

interface Meal {
  name: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayPlan {
  day: string;
  breakfast: Meal;
  morningSnack: Meal;
  lunch: Meal;
  afternoonSnack: Meal;
  dinner: Meal;
}

const MEAL_TYPES = [
  "breakfast",
  "morningSnack",
  "lunch",
  "afternoonSnack",
  "dinner",
] as const;

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  morningSnack: "Snack",
  lunch: "Lunch",
  afternoonSnack: "Snack",
  dinner: "Dinner",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "☀",
  morningSnack: "·",
  lunch: "◐",
  afternoonSnack: "·",
  dinner: "☽",
};

function MealCard({
  meal,
  mealType,
  day,
  index,
  dark,
}: {
  meal: Meal;
  mealType: string;
  day: string;
  index: number;
  dark: boolean;
}) {
  const label = MEAL_LABELS[mealType];
  const icon = MEAL_ICONS[mealType];

  return (
    <div
      data-llm={`${day} ${label}: ${meal.name}, ${meal.kcal}kcal, P${meal.protein}g C${meal.carbs}g F${meal.fat}g`}
      className={`rounded-lg p-3 space-y-1.5 border meal-card ${
        dark
          ? "bg-neutral-800/60 border-neutral-800"
          : "bg-white border-neutral-100"
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-medium tracking-wide ${dark ? "text-neutral-500" : "text-neutral-400"}`}
        >
          {icon} {label}
        </span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${dark ? "text-neutral-400" : "text-neutral-500"}`}
        >
          {meal.kcal}
        </span>
      </div>

      <p
        className={`text-sm font-medium leading-snug ${
          dark ? "text-neutral-200" : "text-neutral-800"
        }`}
      >
        {meal.name}
      </p>

      <p
        className={`text-xs leading-relaxed line-clamp-2 ${
          dark ? "text-neutral-600" : "text-neutral-400"
        }`}
      >
        {meal.description}
      </p>

      <div
        className={`flex items-center gap-3 text-[11px] tabular-nums ${dark ? "text-neutral-600" : "text-neutral-400"}`}
      >
        <span>P {meal.protein}g</span>
        <span>C {meal.carbs}g</span>
        <span>F {meal.fat}g</span>
      </div>
    </div>
  );
}

function DayColumn({
  dayPlan,
  targets,
  columnIndex,
  dark,
}: {
  dayPlan: DayPlan;
  targets: { kcal: number };
  columnIndex: number;
  dark: boolean;
}) {
  const totalKcal = MEAL_TYPES.reduce(
    (sum, type) => sum + dayPlan[type].kcal,
    0,
  );
  const diff = totalKcal - targets.kcal;
  const dayShort = dayPlan.day.slice(0, 3);

  return (
    <div
      className={`flex flex-col rounded-xl p-3 min-w-[170px] ${
        dark ? "bg-neutral-900/60" : "bg-neutral-50"
      }`}
    >
      <div className={`text-center mb-3 pb-3 border-b ${dark ? "border-neutral-800" : "border-neutral-200"}`}>
        <h3
          className={`text-sm font-semibold ${dark ? "text-neutral-200" : "text-neutral-800"}`}
        >
          {dayShort}
        </h3>
        <p
          className={`text-[11px] mt-0.5 tabular-nums ${
            Math.abs(diff) <= 50
              ? dark
                ? "text-emerald-500"
                : "text-emerald-600"
              : dark
                ? "text-neutral-600"
                : "text-neutral-400"
          }`}
        >
          {totalKcal} kcal
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {MEAL_TYPES.map((type, i) => (
          <MealCard
            key={type}
            meal={dayPlan[type]}
            mealType={type}
            day={dayPlan.day}
            index={columnIndex * MEAL_TYPES.length + i}
            dark={dark}
          />
        ))}
      </div>
    </div>
  );
}

function ShowMealPlan() {
  const { output, isPending } = useToolInfo<"show-meal-plan">();
  const { theme } = useLayout();
  const [, setDisplayMode] = useDisplayMode();
  const dark = theme === "dark";

  useEffect(() => {
    setDisplayMode("fullscreen");
  }, [setDisplayMode]);

  if (isPending) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${dark ? "bg-neutral-950" : "bg-neutral-50"}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full spin-slow" />
          <p
            className={`text-sm ${dark ? "text-neutral-500" : "text-neutral-400"}`}
          >
            Generating meal plan…
          </p>
        </div>
      </div>
    );
  }

  if (!output) return null;

  const { weekStart, targets, days } = output;

  return (
    <div
      className={`min-h-screen p-4 md:p-6 ${dark ? "bg-neutral-950" : "bg-neutral-50"}`}
      data-llm={`Weekly meal plan starting ${weekStart}. Targets: ${targets.kcal}kcal, P${targets.protein}g, C${targets.carbs}g, F${targets.fat}g per day.`}
    >
      <div className="mb-6 space-y-4">
        <div>
          <h1
            className={`text-xl font-semibold tracking-tight ${dark ? "text-neutral-100" : "text-neutral-900"}`}
          >
            Meal Plan
          </h1>
          <p
            className={`text-sm mt-0.5 ${dark ? "text-neutral-600" : "text-neutral-400"}`}
          >
            Week of {weekStart}
          </p>
        </div>

        <div
          className={`flex flex-wrap gap-4 text-sm ${dark ? "text-neutral-400" : "text-neutral-500"}`}
        >
          <span>
            <span className={dark ? "text-neutral-200" : "text-neutral-800"}>
              {targets.kcal}
            </span>{" "}
            kcal
          </span>
          <span>
            <span className={dark ? "text-neutral-200" : "text-neutral-800"}>
              {targets.protein}g
            </span>{" "}
            protein
          </span>
          <span>
            <span className={dark ? "text-neutral-200" : "text-neutral-800"}>
              {targets.carbs}g
            </span>{" "}
            carbs
          </span>
          <span>
            <span className={dark ? "text-neutral-200" : "text-neutral-800"}>
              {targets.fat}g
            </span>{" "}
            fat
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="grid grid-cols-7 gap-3 min-w-[1200px]">
          {days.map((dayPlan: DayPlan, i: number) => (
            <DayColumn
              key={dayPlan.day}
              dayPlan={dayPlan}
              targets={targets}
              columnIndex={i}
              dark={dark}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShowMealPlan;

mountWidget(<ShowMealPlan />);
