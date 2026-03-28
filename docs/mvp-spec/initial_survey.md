
👤 Personal Data (for TDEE calculation)

Age — numeric input
Biological sex — Male / Female
Height — cm (or ft/in)
Current weight — kg (or lbs)
Goal weight (optional) — kg / same as now / not sure


🏃 Lifestyle & Activity

How active are you on a typical day?

Sedentary (desk job, little movement)
Lightly active (1–3 workouts/week)
Moderately active (4–5 workouts/week)
Very active (physical job or daily training)


Do you follow a specific diet style?

No preference
Mediterranean
High protein
Vegetarian / Vegan
Keto / Low carb
Other (free text)




🎯 Goal

What's your primary goal?

Lose weight
Maintain weight
Gain muscle mass
Eat healthier / more variety


How many meals do you eat per day?

3 (breakfast, lunch, dinner)
4 (+ 1 snack)
5 (+ 2 snacks)




🚫 Restrictions & Intolerances

Any food intolerances or allergies? (multi-select)

None
Gluten
Lactose
Nuts
Eggs
Shellfish
Other (free text)


Any foods you strongly dislike or avoid? — free text (e.g. "no fish", "hate broccoli")


🍳 Cooking Context (helps plan realistic meals)

How much time do you have to cook on weekdays?

Under 20 minutes
20–40 minutes
I enjoy cooking, no limit


Do you meal prep? (cook in bulk for several days)

Yes, regularly
Sometimes
No, I prefer fresh meals daily




💬 Prompt Engineering Note
These 13 fields map directly to the LLM system prompt. Structure them as a JSON object passed as context:
json{
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
This gives the LLM everything it needs for accurate TDEE calculation, macro split, and contextually realistic meal suggestions — no follow-up questions needed during plan generation.

Keep the form to one page, one question visible at a time (wizard-style). For technical judges, the onboarding should feel snappy — not like a medical intake form.