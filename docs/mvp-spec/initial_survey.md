# 🥗 Meals Planner — User Onboarding Questions

> **Purpose:** Collect the minimum data needed to calculate TDEE, macro targets, and generate a realistic, personalized weekly meal plan.  
> **UX Note:** Present one section at a time (wizard-style). Keep it under 2 minutes to complete.

---

## 👤 Personal Data
*Used for TDEE (Total Daily Energy Expenditure) calculation.*

| # | Question | Input Type | Options / Notes |
|---|----------|------------|-----------------|
| 1 | How old are you? | Number | Age in years |
| 2 | What is your biological sex? | Single select | Male / Female |
| 3 | What is your height? | Number | cm (or ft/in) |
| 4 | What is your current weight? | Number | kg (or lbs) |
| 5 | What is your goal weight? *(optional)* | Number | kg / "Same as now" / "Not sure" |

---

## 🏃 Lifestyle & Activity
*Used to apply the correct TDEE activity multiplier.*

**6. How active are you on a typical day?**
- 🪑 Sedentary *(desk job, little movement)*
- 🚶 Lightly active *(1–3 workouts/week)*
- 🏋️ Moderately active *(4–5 workouts/week)*
- 🔥 Very active *(physical job or daily training)*

**7. Do you follow a specific diet style?**
- No preference
- Mediterranean
- High protein
- Vegetarian
- Vegan
- Keto / Low carb
- Other *(free text)*

---

## 🎯 Goal
*Used to set the caloric surplus/deficit and macro split.*

**8. What is your primary goal?**
- 📉 Lose weight
- ⚖️ Maintain weight
- 💪 Gain muscle mass
- 🥦 Eat healthier / more variety

**9. How many meals do you eat per day?**
- 3 *(breakfast, lunch, dinner)*
- 4 *(+ 1 snack)*
- 5 *(+ 2 snacks)*

---

## 🚫 Restrictions & Intolerances
*Used to filter out incompatible meals from the plan.*

**10. Any food intolerances or allergies?** *(multi-select)*
- None
- Gluten
- Lactose
- Nuts
- Eggs
- Shellfish
- Other *(free text)*

**11. Any foods you strongly dislike or avoid?**
- Free text *(e.g. "no fish", "I hate broccoli", "no offal")*

---

## 🍳 Cooking Context
*Used to generate realistic meals that fit the user's actual routine.*

**12. How much time do you have to cook on weekdays?**
- ⚡ Under 20 minutes
- 🍳 20–40 minutes
- 👨‍🍳 I enjoy cooking, no time limit

**13. Do you meal prep? (cook in bulk for several days)**
- Yes, regularly
- Sometimes
- No, I prefer fresh meals daily

---

## 💾 Supabase Schema Mapping

All fields above map to the `users` table profile JSON:

```json
{
  "profile": {
    "age": 32,
    "sex": "male",
    "height_cm": 178,
    "weight_kg": 82,
    "goal_weight_kg": 76,
    "activity_level": "moderately_active",
    "diet_style": "high_protein",
    "goal": "lose_weight",
    "meals_per_day": 4,
    "intolerances": ["lactose"],
    "dislikes": "no fish",
    "cooking_time_weekday": "20_40min",
    "meal_prep": false
  }
}
```

---

## 🤖 LLM Prompt Usage

Pass the full profile JSON as system context when calling the `generate_weekly_plan` MCP tool.  
The LLM will use it to:
1. Calculate TDEE and macro targets (kcal, protein g, carbs g, fat g)
2. Generate meals that respect diet style, intolerances, dislikes, and cooking time
3. Distribute macros correctly across the number of daily meals

> **Prompt tip:** Enforce a strict JSON response schema for the meal plan to prevent hallucinated or inconsistent output. Validate with Zod on the Next.js API route before saving to Supabase.