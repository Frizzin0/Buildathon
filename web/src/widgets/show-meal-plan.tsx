import "@/index.css";

import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { mountWidget, useLayout, useDisplayMode } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

interface Recipe {
  ingredients: string[];
  instructions: string[];
}

interface Meal {
  name: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  recipe: Recipe;
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

type DetailTarget = {
  meal: Meal;
  day: string;
  mealType: (typeof MEAL_TYPES)[number];
};

function MacroBar({
  label,
  value,
  unit,
  color,
  max,
  dark,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  max: number;
  dark: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={dark ? "text-neutral-400" : "text-neutral-500"}>
          {label}
        </span>
        <span
          className={`font-semibold tabular-nums ${dark ? "text-neutral-200" : "text-neutral-700"}`}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-neutral-700/50" : "bg-neutral-200"}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MealDetailModal({
  detail,
  dark,
  onClose,
}: {
  detail: DetailTarget;
  dark: boolean;
  onClose: () => void;
}) {
  const { meal, day, mealType } = detail;
  const label = MEAL_LABELS[mealType];
  const icon = MEAL_ICONS[mealType];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl border modal-content ${
          dark
            ? "bg-neutral-900 border-neutral-700/60 shadow-black/40"
            : "bg-white border-neutral-200 shadow-neutral-300/30"
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b backdrop-blur-sm ${
            dark
              ? "bg-neutral-900/90 border-neutral-700/60"
              : "bg-white/90 border-neutral-200"
          }`}
        >
          <div>
            <p
              className={`text-xs font-medium ${dark ? "text-neutral-500" : "text-neutral-400"}`}
            >
              {icon} {day} · {label}
            </p>
            <h2
              className={`text-lg font-bold mt-0.5 ${dark ? "text-neutral-100" : "text-neutral-900"}`}
            >
              {meal.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              dark
                ? "hover:bg-neutral-800 text-neutral-400"
                : "hover:bg-neutral-100 text-neutral-500"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <p
            className={`text-sm leading-relaxed ${dark ? "text-neutral-300" : "text-neutral-600"}`}
          >
            {meal.description}
          </p>

          {/* Nutrition breakdown */}
          <div
            className={`rounded-xl p-4 space-y-3 ${dark ? "bg-neutral-800/50" : "bg-neutral-50"}`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`text-sm font-semibold ${dark ? "text-neutral-200" : "text-neutral-800"}`}
              >
                Nutrition
              </h3>
              <div className="flex items-center gap-3 text-sm">
                <span
                  className={`font-bold tabular-nums ${dark ? "text-emerald-400" : "text-emerald-600"}`}
                >
                  {meal.kcal} kcal
                </span>
                <span
                  className={`font-medium tabular-nums ${dark ? "text-neutral-400" : "text-neutral-500"}`}
                >
                  ${meal.price.toFixed(2)}
                </span>
              </div>
            </div>
            <MacroBar
              label="Protein"
              value={meal.protein}
              unit="g"
              color={dark ? "bg-blue-400" : "bg-blue-500"}
              max={60}
              dark={dark}
            />
            <MacroBar
              label="Carbs"
              value={meal.carbs}
              unit="g"
              color={dark ? "bg-amber-400" : "bg-amber-500"}
              max={100}
              dark={dark}
            />
            <MacroBar
              label="Fat"
              value={meal.fat}
              unit="g"
              color={dark ? "bg-rose-400" : "bg-rose-500"}
              max={40}
              dark={dark}
            />
          </div>

          {/* Calorie composition pie-ish summary */}
          <div
            className={`flex gap-3 text-xs tabular-nums ${dark ? "text-neutral-400" : "text-neutral-500"}`}
          >
            <span>
              {Math.round((meal.protein * 4 * 100) / meal.kcal)}% from protein
            </span>
            <span>·</span>
            <span>
              {Math.round((meal.carbs * 4 * 100) / meal.kcal)}% from carbs
            </span>
            <span>·</span>
            <span>
              {Math.round((meal.fat * 9 * 100) / meal.kcal)}% from fat
            </span>
          </div>

          {/* Recipe */}
          {meal.recipe && (
            <>
              {/* Ingredients */}
              <div>
                <h3
                  className={`text-sm font-semibold mb-2 ${dark ? "text-neutral-200" : "text-neutral-800"}`}
                >
                  Ingredients
                </h3>
                <ul className="space-y-1.5">
                  {meal.recipe.ingredients.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-emerald-500" : "bg-emerald-400"}`}
                      />
                      <span
                        className={
                          dark ? "text-neutral-300" : "text-neutral-600"
                        }
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h3
                  className={`text-sm font-semibold mb-2 ${dark ? "text-neutral-200" : "text-neutral-800"}`}
                >
                  Instructions
                </h3>
                <ol className="space-y-2">
                  {meal.recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          dark
                            ? "bg-neutral-700 text-neutral-300"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`pt-0.5 ${dark ? "text-neutral-300" : "text-neutral-600"}`}
                      >
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  onClickDetail,
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
  onClickDetail: () => void;
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
  const didDrag = useRef(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        didDrag.current = true;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={() => {
        enterCount.current = 0;
        setIsOver(false);
        onDragEnd();
        setTimeout(() => {
          didDrag.current = false;
        }, 0);
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
      onClick={() => {
        if (!didDrag.current) onClickDetail();
      }}
      data-llm={`${day} ${label}: ${meal.name}, ${meal.kcal}kcal, P${meal.protein}g C${meal.carbs}g F${meal.fat}g, $${meal.price.toFixed(2)}`}
      className={`rounded-xl p-3 space-y-1.5 border meal-card ${
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
                ? "bg-neutral-800/60 border-neutral-700/50 hover:bg-neutral-750/70 hover:border-neutral-600/60"
                : "bg-white border-neutral-200/80 hover:bg-neutral-50 hover:border-neutral-300"
      }`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-semibold leading-snug ${
            dark ? "text-neutral-100" : "text-neutral-900"
          }`}
        >
          {meal.name}
        </p>
        <span
          className={`text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 mt-0.5 ${
            dark ? "text-emerald-400" : "text-emerald-600"
          }`}
        >
          {meal.kcal}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs tabular-nums">
          <span
            className={`font-medium ${dark ? "text-blue-400/80" : "text-blue-600/70"}`}
          >
            P{meal.protein}
          </span>
          <span
            className={`font-medium ${dark ? "text-amber-400/80" : "text-amber-600/70"}`}
          >
            C{meal.carbs}
          </span>
          <span
            className={`font-medium ${dark ? "text-rose-400/80" : "text-rose-600/70"}`}
          >
            F{meal.fat}
          </span>
        </div>
        <span
          className={`text-xs tabular-nums ${dark ? "text-neutral-500" : "text-neutral-400"}`}
        >
          ${meal.price.toFixed(2)}
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
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  const closeDetail = useCallback(() => setDetail(null), []);

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
                  onClickDetail={() =>
                    setDetail({
                      meal: dayPlan[mealType],
                      day: dayPlan.day,
                      mealType,
                    })
                  }
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

      {detail && (
        <MealDetailModal detail={detail} dark={dark} onClose={closeDetail} />
      )}
    </div>
  );
}

export default ShowMealPlan;

mountWidget(<ShowMealPlan />);
