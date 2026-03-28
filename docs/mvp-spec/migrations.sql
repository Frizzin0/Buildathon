-- Run in Supabase SQL Editor to add persistence support.
-- Prerequisites: tables users, meal_plans, meals already exist (schema.sql).

-- 1. users: add name column for lookup
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;

-- 2. meal_plans: add daily macro targets so the widget can be restored
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS targets_kcal int,
  ADD COLUMN IF NOT EXISTS targets_protein int,
  ADD COLUMN IF NOT EXISTS targets_carbs int,
  ADD COLUMN IF NOT EXISTS targets_fat int;

-- 3. meals: add recipe instructions and price (both used by the widget)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS instructions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price numeric(6,2);

-- 4. meals: expand meal_type CHECK to include morning_snack and afternoon_snack
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;
ALTER TABLE public.meals ADD CONSTRAINT meals_meal_type_check
  CHECK (meal_type = ANY (ARRAY[
    'breakfast'::text, 'morning_snack'::text, 'lunch'::text,
    'afternoon_snack'::text, 'dinner'::text
  ]));

-- 5. diet_style: expand CHECK to match widget values (vegetarian, vegan, keto)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_diet_style_check;
ALTER TABLE public.users ADD CONSTRAINT users_diet_style_check
  CHECK (diet_style = ANY (ARRAY[
    'no_preference'::text, 'mediterranean'::text, 'high_protein'::text,
    'vegetarian'::text, 'vegan'::text, 'keto'::text, 'other'::text
  ]));

-- 6. indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week ON meal_plans(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_meals_plan_day_type ON meals(meal_plan_id, day_index, meal_type);
