import type { Gender, ActivityLevel, Goal, DietType } from './types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export function calculateTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activity: ActivityLevel,
  goal: Goal
) {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activity);

  let calorieTarget = tdee;
  if (goal === 'lean_bulk') calorieTarget = tdee + 300;
  if (goal === 'cut') calorieTarget = tdee - 400;

  calorieTarget = Math.max(1200, Math.round(calorieTarget));

  const proteinTarget = Math.round((calorieTarget * 0.30) / 4);
  const fatTarget = Math.round((calorieTarget * 0.25) / 9);
  const carbsTarget = Math.round((calorieTarget * 0.45) / 4);

  const waterTargetMl = Math.round(weightKg * 35);

  return {
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
    waterTargetMl,
    bmr: Math.round(bmr),
    tdee,
  };
}
