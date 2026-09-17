export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lean_bulk' | 'cut' | 'maintain';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietType = 'veg' | 'non_veg' | 'vegan';

export interface Profile {
  id: string;
  email: string | null;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  gym_days_per_week: number | null;
  diet_type: DietType | null;
  goal: Goal | null;
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  water_target_ml: number;
  onboarding_completed: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  defaultQty: number;
  per100: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isCustom?: boolean;
}

export interface FoodLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: MealType;
  food_name: string;
  food_id: string | null;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface SavedMeal {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export interface SavedMealItem {
  id: string;
  meal_id: string;
  food_name: string;
  food_id: string | null;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WaterLog {
  id: string;
  log_date: string;
  amount_ml: number;
  created_at: string;
}

export interface WeightLog {
  id: string;
  log_date: string;
  weight_kg: number;
  created_at: string;
}

export interface Measurement {
  id: string;
  log_date: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  body_fat_pct: number | null;
}

export interface Workout {
  id: string;
  log_date: string;
  workout_type: string | null;
  duration_min: number;
  intensity: 'low' | 'medium' | 'high' | null;
  calories_burned: number;
  notes: string | null;
}

export interface AIMeal {
  title: string;
  description: string;
  items: Array<{
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface AIResponse {
  meals: AIMeal[];
  groceryList?: string[];
  notes?: string;
}
