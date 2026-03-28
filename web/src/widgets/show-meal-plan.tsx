import "@/index.css";

import { Fragment, useEffect, useState, useRef } from "react";
import { mountWidget, useLayout, useDisplayMode } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

interface Meal {
  name: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
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
  morningSnack: "AM Snack",
  lunch: "Lunch",
  afternoonSnack: "PM Snack",
  dinner: "Dinner",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "☀",
  morningSnack: "·",
  lunch: "◐",
  afternoonSnack: "·",
  dinner: "☽",
};

type DragSource = {
  dayIndex: number;
  mealType: (typeof MEAL_TYPES)[number];
};

function MealCard({
  meal,
  day,
  mealType,
  dayIndex,
  index,
  dark,
  dragSource,
  onDragStart,
  onDragEnd,
  onSwap,
}: {
  meal: Meal;
  day: string;
  mealType: (typeof MEAL_TYPES)[number];
  dayIndex: number;
  index: number;
  dark: boolean;
  dragSource: DragSource | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSwap: () => void;
}) {
  const label = MEAL_LABELS[mealType];
  const isDragging =
    dragSource?.dayIndex === dayIndex && dragSource?.mealType === mealType;
  const isValidTarget =
    dragSource !== null &&
    dragSource.mealType === mealType &&
    dragSource.dayIndex !== dayIndex;
  const [isOver, setIsOver] = useState(false);
  const enterCount = useRef(0);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={() => {
        enterCount.current = 0;
        setIsOver(false);
        onDragEnd();
      }}
      onDragEnter={(e) => {
        if (!isValidTarget) return;
        e.preventDefault();
        enterCount.current++;
        setIsOver(true);
      }}
      onDragOver={(e) => {
        if (!isValidTarget) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={() => {
        enterCount.current--;
        if (enterCount.current <= 0) {
          enterCount.current = 0;
          setIsOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        enterCount.current = 0;
        setIsOver(false);
        if (isValidTarget) onSwap();
      }}
      data-llm={`${day} ${label}: ${meal.name}, ${meal.kcal}kcal, P${meal.protein}g C${meal.carbs}g F${meal.fat}g, $${meal.price.toFixed(2)}`}
      className={`rounded-xl p-4 space-y-2 border meal-card ${
        isDragging
          ? `opacity-40 ${dark ? "bg-neutral-800/60 border-neutral-700/50" : "bg-white border-neutral-200/80"}`
          : isOver
            ? dark
              ? "ring-2 ring-emerald-400/70 bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "ring-2 ring-emerald-500/70 bg-emerald-50 border-emerald-400 shadow-lg shadow-emerald-500/10"
            : isValidTarget
              ? dark
                ? "bg-emerald-950/20 border-emerald-700/40"
                : "bg-emerald-50/60 border-emerald-300/60"
              : dark
                ? "bg-neutral-800/60 border-neutral-700/50"
                : "bg-white border-neutral-200/80"
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-base font-semibold leading-snug ${
            dark ? "text-neutral-100" : "text-neutral-900"
          }`}
        >
          {meal.name}
        </p>
        <div className="flex flex-col items-end gap-0.5 shrink-0 mt-0.5">
          <span
            className={`text-xs font-semibold tabular-nums whitespace-nowrap ${
              dark ? "text-emerald-400" : "text-emerald-600"
            }`}
          >
            {meal.kcal} kcal
          </span>
          <span
            className={`text-xs font-medium tabular-nums whitespace-nowrap ${
              dark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            ${meal.price.toFixed(2)}
          </span>
        </div>
      </div>

      <p
        className={`text-sm leading-relaxed ${
          dark ? "text-neutral-400" : "text-neutral-500"
        }`}
      >
        {meal.description}
      </p>

      <div className="flex items-center gap-3 text-xs tabular-nums pt-1">
        <span
          className={`font-medium ${dark ? "text-blue-400/80" : "text-blue-600/70"}`}
        >
          P {meal.protein}g
        </span>
        <span
          className={`font-medium ${dark ? "text-amber-400/80" : "text-amber-600/70"}`}
        >
          C {meal.carbs}g
        </span>
        <span
          className={`font-medium ${dark ? "text-rose-400/80" : "text-rose-600/70"}`}
        >
          F {meal.fat}g
        </span>
      </div>
    </div>
  );
}

function ShowMealPlan() {
  const { output, isPending } = useToolInfo<"show-meal-plan">();
  const { theme } = useLayout();
  const [, setDisplayMode] = useDisplayMode();
  const dark = theme === "dark";
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [localDays, setLocalDays] = useState<DayPlan[] | null>(null);
  const [prevOutput, setPrevOutput] = useState(output);

  if (output !== prevOutput) {
    setPrevOutput(output);
    if (localDays) setLocalDays(null);
  }

  useEffect(() => {
    setDisplayMode("fullscreen");
  }, [setDisplayMode]);

  const handleSwap = (
    targetDayIndex: number,
    mealType: (typeof MEAL_TYPES)[number],
  ) => {
    if (!dragSource) return;
    const sourceDayIndex = dragSource.dayIndex;
    setLocalDays((prev) => {
      const current = prev ?? output!.days;
      return current.map((d: DayPlan, i: number) => {
        if (i === sourceDayIndex)
          return { ...d, [mealType]: current[targetDayIndex][mealType] };
        if (i === targetDayIndex)
          return { ...d, [mealType]: current[sourceDayIndex][mealType] };
        return d;
      });
    });
    setDragSource(null);
  };

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

  const { weekStart, targets } = output;
  const days: DayPlan[] = localDays ?? output.days;

  const dayTotals = days.map((dayPlan: DayPlan) =>
    MEAL_TYPES.reduce(
      (acc, type) => ({
        kcal: acc.kcal + dayPlan[type].kcal,
        protein: acc.protein + dayPlan[type].protein,
        carbs: acc.carbs + dayPlan[type].carbs,
        fat: acc.fat + dayPlan[type].fat,
        price: acc.price + dayPlan[type].price,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, price: 0 },
    ),
  );

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
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "100px repeat(7, minmax(200px, 1fr))",
          }}
        >
          {/* Header row */}
          <div />
          {days.map((dayPlan: DayPlan, i: number) => {
            const diff = dayTotals[i].kcal - targets.kcal;
            return (
              <div
                key={dayPlan.day}
                className={`text-center rounded-xl py-3 px-2 ${
                  dark ? "bg-neutral-900/60" : "bg-neutral-100"
                }`}
              >
                <h3
                  className={`text-sm font-semibold ${dark ? "text-neutral-200" : "text-neutral-800"}`}
                >
                  {dayPlan.day}
                </h3>
                <p
                  className={`text-xs mt-0.5 tabular-nums ${
                    Math.abs(diff) <= 50
                      ? dark
                        ? "text-emerald-500"
                        : "text-emerald-600"
                      : dark
                        ? "text-neutral-500"
                        : "text-neutral-400"
                  }`}
                >
                  {dayTotals[i].kcal} kcal
                </p>
              </div>
            );
          })}

          {/* Meal rows: each row = 1 label cell + 7 meal cards */}
          {MEAL_TYPES.map((mealType, rowIndex) => {
            const rowActive = dragSource?.mealType === mealType;
            return (
            <Fragment key={mealType}>
              <div
                className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 sticky left-0 z-10 transition-colors duration-150 ${
                  rowActive
                    ? dark
                      ? "bg-emerald-950/30"
                      : "bg-emerald-50/80"
                    : dark
                      ? "bg-neutral-950"
                      : "bg-neutral-50"
                }`}
              >
                <span className="text-lg mb-1">{MEAL_ICONS[mealType]}</span>
                <span
                  className={`text-xs font-semibold text-center leading-tight ${
                    dark ? "text-neutral-300" : "text-neutral-600"
                  }`}
                >
                  {MEAL_LABELS[mealType]}
                </span>
              </div>
              {days.map((dayPlan: DayPlan, colIndex: number) => (
                <MealCard
                  key={`${mealType}-${dayPlan.day}`}
                  meal={dayPlan[mealType]}
                  day={dayPlan.day}
                  mealType={mealType}
                  dayIndex={colIndex}
                  index={rowIndex * 7 + colIndex}
                  dark={dark}
                  dragSource={dragSource}
                  onDragStart={() =>
                    setDragSource({ dayIndex: colIndex, mealType })
                  }
                  onDragEnd={() => setDragSource(null)}
                  onSwap={() => handleSwap(colIndex, mealType)}
                />
              ))}
            </Fragment>
            );
          })}

          {/* Daily totals footer row */}
          <div
            className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 sticky left-0 z-10 ${
              dark ? "bg-neutral-950" : "bg-neutral-50"
            }`}
          >
            <span
              className={`text-xs font-semibold ${dark ? "text-neutral-300" : "text-neutral-600"}`}
            >
              Daily Total
            </span>
          </div>
          {dayTotals.map(
            (
              totals: {
                kcal: number;
                protein: number;
                carbs: number;
                fat: number;
                price: number;
              },
              i: number,
            ) => {
              const diff = totals.kcal - targets.kcal;
              return (
                <div
                  key={`total-${i}`}
                  className={`rounded-xl py-3 px-4 text-center space-y-1.5 border ${
                    dark
                      ? "bg-neutral-800/40 border-neutral-700/50"
                      : "bg-neutral-100 border-neutral-200/80"
                  }`}
                >
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      Math.abs(diff) <= 50
                        ? dark
                          ? "text-emerald-400"
                          : "text-emerald-600"
                        : dark
                          ? "text-neutral-200"
                          : "text-neutral-700"
                    }`}
                  >
                    {totals.kcal} kcal
                  </p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      dark ? "text-neutral-300" : "text-neutral-600"
                    }`}
                  >
                    ${totals.price.toFixed(2)}
                  </p>
                  <div
                    className={`flex justify-center gap-2 text-xs tabular-nums ${
                      dark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    <span>P {totals.protein}g</span>
                    <span>C {totals.carbs}g</span>
                    <span>F {totals.fat}g</span>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

export default ShowMealPlan;

mountWidget(<ShowMealPlan />);
