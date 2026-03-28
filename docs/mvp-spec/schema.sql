-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  week_start date,
  is_active boolean DEFAULT true,
  notes text,
  CONSTRAINT meal_plans_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.meals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meal_plan_id uuid,
  day_index integer CHECK (day_index >= 0 AND day_index <= 6),
  meal_type text CHECK (meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])),
  sort_order integer DEFAULT 0,
  name text NOT NULL,
  description text,
  ingredients ARRAY,
  kcal integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  was_as_planned boolean DEFAULT true,
  actual_name text,
  actual_kcal integer,
  actual_protein_g integer,
  actual_carbs_g integer,
  actual_fat_g integer,
  consumed_note text,
  consumed_at date,
  calendar_event_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meals_pkey PRIMARY KEY (id),
  CONSTRAINT meals_meal_plan_id_fkey FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plans(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  age integer,
  sex text CHECK (sex = ANY (ARRAY['male'::text, 'female'::text])),
  weight_kg numeric,
  height_cm numeric,
  activity_level text CHECK (activity_level = ANY (ARRAY['sedentary'::text, 'lightly_active'::text, 'moderately_active'::text, 'very_active'::text])),
  goal text CHECK (goal = ANY (ARRAY['lose_weight'::text, 'maintain'::text, 'gain_muscle'::text, 'eat_healthier'::text])),
  goal_weight_kg numeric,
  diet_style text CHECK (diet_style = ANY (ARRAY['no_preference'::text, 'mediterranean'::text, 'high_protein'::text, 'vegetarian_vegan'::text, 'keto_low_carb'::text, 'other'::text])),
  diet_style_other text,
  meals_per_day integer CHECK (meals_per_day = ANY (ARRAY[3, 4, 5])),
  dislikes text,
  cooking_time_weekday text CHECK (cooking_time_weekday = ANY (ARRAY['under_20min'::text, '20_40min'::text, 'no_limit'::text])),
  meal_prep boolean,
  intolerances ARRAY,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);