import "@/index.css";

import { useState, useEffect } from "react";
import {
  mountWidget,
  getAdaptor,
  useWidgetState,
  useSendFollowUpMessage,
} from "skybridge/web";
import steps from "../data/onboarding-steps.json" with { type: "json" };

type Step = (typeof steps)[number];
type Option = { value: string; label: string; desc?: string; icon?: string };

type ProfileState = {
  name: string;
  age: string;
  sex: string;
  height: string;
  weight: string;
  goalWeight: string;
  activityLevel: string;
  dietStyle: string;
  goal: string;
  mealsPerDay: string;
  intolerances: string[];
  dislikes: string;
  cookingTime: string;
  mealPrep: string;
  submitted: boolean;
};

const INITIAL_STATE: ProfileState = {
  name: "",
  age: "",
  sex: "",
  height: "",
  weight: "",
  goalWeight: "",
  activityLevel: "",
  dietStyle: "no_preference",
  goal: "",
  mealsPerDay: "",
  intolerances: [],
  dislikes: "",
  cookingTime: "",
  mealPrep: "",
  submitted: false,
};

function CollectProfile() {
  const [state, setState] = useWidgetState(INITIAL_STATE);
  const [currentStep, setCurrentStep] = useState(0);
  const sendMessage = useSendFollowUpMessage();

  const [theme, setTheme] = useState(
    () => getAdaptor().getHostContextStore("theme").getSnapshot() ?? "light",
  );
  useEffect(() => {
    const store = getAdaptor().getHostContextStore("theme");
    const sync = () => setTheme(store.getSnapshot() ?? "light");
    sync();
    return store.subscribe(sync);
  }, []);

  const dark = theme === "dark";

  const step = steps[currentStep] as Step;
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  const value = state[step.id as keyof ProfileState];

  const update = (key: string, val: string | string[]) => {
    setState((prev) => ({ ...prev, [key]: val }));
  };

  const toggleMulti = (key: string, item: string) => {
    const arr = (state[key as keyof ProfileState] as string[]) || [];
    const next = arr.includes(item)
      ? arr.filter((i: string) => i !== item)
      : [...arr, item];
    update(key, next);
  };

  const canAdvance = () => {
    if (!step.required) return true;
    if (Array.isArray(value)) return true;
    return !!value;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = () => {
    setState((prev) => ({ ...prev, submitted: true }));
    sendMessage(`The user has submitted their dietary profile. Here is the data:
- Name: ${state.name}
- Age: ${state.age} years
- Sex: ${state.sex}
- Height: ${state.height} cm
- Weight: ${state.weight} kg
- Goal weight: ${state.goalWeight || "Not specified"}
- Activity level: ${state.activityLevel}
- Diet style: ${state.dietStyle}
- Primary goal: ${state.goal}
- Meals per day: ${state.mealsPerDay}
- Intolerances: ${state.intolerances.length > 0 ? state.intolerances.join(", ") : "None"}
- Dislikes: ${state.dislikes || "None"}
- Weekday cooking time: ${state.cookingTime}
- Meal prep: ${state.mealPrep}

Calculate their daily TDEE, kcal target, and macronutrient targets (protein, carbs, fat in grams) based on this profile. Then generate a complete 7-day meal plan (Monday through Sunday) with 5 meals per day: breakfast, morningSnack, lunch, afternoonSnack, and dinner. Each meal must respect the diet style, intolerances, dislikes, and cooking time constraints. Each meal should include name, short description, kcal, protein, carbs, and fat. Display the plan using the show-meal-plan tool.`);
  };

  if (state.submitted) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${dark ? "bg-neutral-950" : "bg-neutral-50"}`}
      >
        <div
          className={`w-full max-w-xs rounded-2xl p-8 text-center flex flex-col items-center gap-4 fade-up ${dark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-200"}`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${dark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}
          >
            ✓
          </div>
          <h2
            className={`text-lg font-semibold ${dark ? "text-neutral-100" : "text-neutral-900"}`}
          >
            Profile submitted
          </h2>
          <p
            className={`text-sm leading-relaxed ${dark ? "text-neutral-500" : "text-neutral-400"}`}
          >
            Generating your personalized meal plan…
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span
              className={`text-xs ${dark ? "text-neutral-600" : "text-neutral-400"}`}
            >
              Calculating targets
            </span>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = `w-full rounded-lg px-4 py-3 text-sm outline-none border transition-colors ${dark ? "bg-neutral-900 border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:border-neutral-600" : "bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-neutral-400"}`;

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${dark ? "bg-neutral-950" : "bg-neutral-50"}`}
    >
      <div
        className={`w-full max-w-md rounded-2xl p-6 flex flex-col fade-up ${dark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-200"}`}
      >
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {steps.map((_: Step, i: number) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep
                  ? "bg-emerald-500"
                  : dark
                    ? "bg-neutral-800"
                    : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <p
          className={`text-xs font-medium tracking-wide mb-2 ${dark ? "text-neutral-600" : "text-neutral-400"}`}
        >
          {currentStep + 1} / {totalSteps}
        </p>

        <h2
          className={`text-lg font-semibold tracking-tight mb-1 ${dark ? "text-neutral-100" : "text-neutral-900"}`}
        >
          {step.question}
        </h2>
        <p
          className={`text-sm mb-6 ${dark ? "text-neutral-500" : "text-neutral-400"}`}
        >
          {step.subtitle}
        </p>

        <div className="flex-1 mb-6">
          <StepInput
            step={step}
            value={value}
            onUpdate={(val) => update(step.id, val)}
            onToggleMulti={(item) => toggleMulti(step.id, item)}
            onSubmit={handleNext}
            dark={dark}
            inputCls={inputCls}
          />
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium border transition-colors cursor-pointer ${
                dark
                  ? "border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={step.required && !canAdvance()}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              canAdvance()
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                : dark
                  ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                  : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
            }`}
          >
            {isLastStep ? "Generate My Week" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepInput({
  step,
  value,
  onUpdate,
  onToggleMulti,
  onSubmit,
  dark,
  inputCls,
}: {
  step: Step;
  value: string | string[] | boolean;
  onUpdate: (val: string) => void;
  onToggleMulti: (item: string) => void;
  onSubmit: () => void;
  dark: boolean;
  inputCls: string;
}) {
  const options = (step.options ?? []) as Option[];

  switch (step.type) {
    case "text":
      return (
        <input
          className={inputCls}
          placeholder={step.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoFocus
        />
      );

    case "number":
      return (
        <div className="relative">
          <input
            className={inputCls}
            type="number"
            placeholder={step.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onUpdate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
          {"unit" in step && step.unit && (
            <span
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs ${dark ? "text-neutral-600" : "text-neutral-400"}`}
            >
              {step.unit}
            </span>
          )}
        </div>
      );

    case "toggle":
      return (
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(opt.value)}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium border transition-colors cursor-pointer ${
                value === opt.value
                  ? dark
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : dark
                    ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "radio":
      return (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(opt.value)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors cursor-pointer ${
                value === opt.value
                  ? dark
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : dark
                    ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors ${
                  value === opt.value
                    ? "border-emerald-500 bg-emerald-500"
                    : dark
                      ? "border-neutral-700"
                      : "border-neutral-300"
                }`}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.desc && (
                  <span
                    className={`text-xs ${dark ? "text-neutral-600" : "text-neutral-400"}`}
                  >
                    {opt.desc}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      );

    case "icon-cards":
      return (
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-lg px-3 py-4 border transition-colors cursor-pointer ${
                value === opt.value
                  ? dark
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-emerald-50 border-emerald-200"
                  : dark
                    ? "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                    : "bg-white border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span
                className={`text-xs font-medium ${
                  value === opt.value
                    ? dark
                      ? "text-emerald-400"
                      : "text-emerald-700"
                    : dark
                      ? "text-neutral-400"
                      : "text-neutral-600"
                }`}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      );

    case "pills":
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate(opt.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors cursor-pointer ${
                value === opt.value
                  ? dark
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : dark
                    ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                    : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "multi-select": {
      const selected = (value as string[]) || [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => onToggleMulti(opt.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors cursor-pointer ${
                  isSelected
                    ? dark
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-red-50 text-red-600 border-red-200"
                    : dark
                      ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                      : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {isSelected ? "✕ " : ""}
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}

export default CollectProfile;

mountWidget(<CollectProfile />);
