import type { FoodItem } from './types';
import { FOOD_DATABASE } from './food-database';

export function calculateMacros(food: FoodItem, quantity: number) {
  if (food.unit === 'pieces') {
    const perPiece = food.per100;
    return {
      calories: Math.round((perPiece.calories * quantity) / 100),
      protein: Math.round((perPiece.protein * quantity) / 100),
      carbs: Math.round((perPiece.carbs * quantity) / 100),
      fat: Math.round((perPiece.fat * quantity) / 100),
    };
  }
  return {
    calories: Math.round((food.per100.calories * quantity) / 100),
    protein: Math.round((food.per100.protein * quantity) / 100),
    carbs: Math.round((food.per100.carbs * quantity) / 100),
    fat: Math.round((food.per100.fat * quantity) / 100),
  };
}

export function searchFoods(query: string, customFoods: FoodItem[] = []): FoodItem[] {
  const all = [...FOOD_DATABASE, ...customFoods];
  if (!query.trim()) return all.slice(0, 30);
  const q = query.toLowerCase().trim();
  return all
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    )
    .slice(0, 50);
}

export function getFoodById(id: string, customFoods: FoodItem[] = []): FoodItem | undefined {
  return [...FOOD_DATABASE, ...customFoods].find((f) => f.id === id);
}
