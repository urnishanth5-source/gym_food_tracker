/*
# AI Gym Food Tracker — Full Schema

## Purpose
Multi-user fitness nutrition tracker with AI meal assistant. Each user has a profile with body stats and goals, logs foods/meals/water/workouts, and gets AI-powered meal suggestions.

## Tables Created
1. **profiles** — extends auth.users with onboarding data (age, gender, height, weight, activity, gym days, diet, goal, calorie/macro targets)
2. **food_logs** — individual food entries logged on a date with quantity and computed macros
3. **saved_meals** — user-created meal templates (collection of foods)
4. **saved_meal_items** — food items within a saved meal
5. **water_logs** — daily water intake entries
6. **weight_logs** — weight tracking over time
7. **measurements** — body measurements (chest, waist, hips, arms, etc.)
8. **workouts** — gym workout logs
9. **favorites** — user's favorited foods for quick access
10. **custom_foods** — user-created custom food entries

## Security
- RLS enabled on every table
- All tables are owner-scoped (user_id = auth.uid())
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE) scoped to authenticated owner
- user_id columns default to auth.uid() so client inserts work without passing user_id
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  age int,
  gender text CHECK (gender IN ('male','female','other')),
  height_cm numeric,
  weight_kg numeric,
  activity_level text CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  gym_days_per_week int DEFAULT 0,
  diet_type text DEFAULT 'non_veg',
  goal text CHECK (goal IN ('lean_bulk','cut','maintain')),
  calorie_target numeric DEFAULT 0,
  protein_target numeric DEFAULT 0,
  carbs_target numeric DEFAULT 0,
  fat_target numeric DEFAULT 0,
  water_target_ml int DEFAULT 3000,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============ FOOD LOGS ============
CREATE TABLE IF NOT EXISTS food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) DEFAULT 'snack',
  food_name text NOT NULL,
  food_id text,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'g',
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_food_logs" ON food_logs;
CREATE POLICY "select_own_food_logs" ON food_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_food_logs" ON food_logs;
CREATE POLICY "insert_own_food_logs" ON food_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_food_logs" ON food_logs;
CREATE POLICY "update_own_food_logs" ON food_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_food_logs" ON food_logs;
CREATE POLICY "delete_own_food_logs" ON food_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);

-- ============ SAVED MEALS ============
CREATE TABLE IF NOT EXISTS saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_type text CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) DEFAULT 'lunch',
  total_calories numeric DEFAULT 0,
  total_protein numeric DEFAULT 0,
  total_carbs numeric DEFAULT 0,
  total_fat numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_meals" ON saved_meals;
CREATE POLICY "select_own_saved_meals" ON saved_meals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saved_meals" ON saved_meals;
CREATE POLICY "insert_own_saved_meals" ON saved_meals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_saved_meals" ON saved_meals;
CREATE POLICY "update_own_saved_meals" ON saved_meals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saved_meals" ON saved_meals;
CREATE POLICY "delete_own_saved_meals" ON saved_meals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SAVED MEAL ITEMS ============
CREATE TABLE IF NOT EXISTS saved_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES saved_meals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  food_id text,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'g',
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0
);
ALTER TABLE saved_meal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_items" ON saved_meal_items;
CREATE POLICY "select_own_meal_items" ON saved_meal_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meal_items" ON saved_meal_items;
CREATE POLICY "insert_own_meal_items" ON saved_meal_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meal_items" ON saved_meal_items;
CREATE POLICY "update_own_meal_items" ON saved_meal_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meal_items" ON saved_meal_items;
CREATE POLICY "delete_own_meal_items" ON saved_meal_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ WATER LOGS ============
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_ml int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_water" ON water_logs;
CREATE POLICY "select_own_water" ON water_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_water" ON water_logs;
CREATE POLICY "insert_own_water" ON water_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_water" ON water_logs;
CREATE POLICY "update_own_water" ON water_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_water" ON water_logs;
CREATE POLICY "delete_own_water" ON water_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, log_date);

-- ============ WEIGHT LOGS ============
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_weight" ON weight_logs;
CREATE POLICY "select_own_weight" ON weight_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_weight" ON weight_logs;
CREATE POLICY "insert_own_weight" ON weight_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_weight" ON weight_logs;
CREATE POLICY "update_own_weight" ON weight_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_weight" ON weight_logs;
CREATE POLICY "delete_own_weight" ON weight_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);

-- ============ MEASUREMENTS ============
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  left_arm_cm numeric,
  right_arm_cm numeric,
  left_thigh_cm numeric,
  right_thigh_cm numeric,
  body_fat_pct numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_measurements" ON measurements;
CREATE POLICY "select_own_measurements" ON measurements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_measurements" ON measurements;
CREATE POLICY "insert_own_measurements" ON measurements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_measurements" ON measurements;
CREATE POLICY "update_own_measurements" ON measurements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_measurements" ON measurements;
CREATE POLICY "delete_own_measurements" ON measurements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ WORKOUTS ============
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  workout_type text,
  duration_min int DEFAULT 0,
  intensity text CHECK (intensity IN ('low','medium','high')),
  calories_burned int DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workouts" ON workouts;
CREATE POLICY "select_own_workouts" ON workouts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workouts" ON workouts;
CREATE POLICY "insert_own_workouts" ON workouts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workouts" ON workouts;
CREATE POLICY "update_own_workouts" ON workouts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workouts" ON workouts;
CREATE POLICY "delete_own_workouts" ON workouts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ FAVORITES ============
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id text NOT NULL,
  food_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, food_id)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CUSTOM FOODS ============
CREATE TABLE IF NOT EXISTS custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_unit text DEFAULT 'g',
  calories_per_100 numeric NOT NULL DEFAULT 0,
  protein_per_100 numeric NOT NULL DEFAULT 0,
  carbs_per_100 numeric NOT NULL DEFAULT 0,
  fat_per_100 numeric NOT NULL DEFAULT 0,
  default_quantity numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_foods" ON custom_foods;
CREATE POLICY "select_own_custom_foods" ON custom_foods FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_custom_foods" ON custom_foods;
CREATE POLICY "insert_own_custom_foods" ON custom_foods FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_custom_foods" ON custom_foods;
CREATE POLICY "update_own_custom_foods" ON custom_foods FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_custom_foods" ON custom_foods;
CREATE POLICY "delete_own_custom_foods" ON custom_foods FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
