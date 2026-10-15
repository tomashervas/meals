import type { LucideIcon } from 'lucide-react';

export type Sex = 'male' | 'female';
export type MacroMethod = 'g_per_kg' | 'percentage';
export type GoalId = 'lose' | 'recomp' | 'maintain' | 'gain';

export interface UserProfile {
  sex: Sex;
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: GoalId | string;
  macroMethod: MacroMethod;
  isManualTargets?: boolean;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
  formulaExplanation: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  portionName?: string;
  portionGrams?: number;
  isHabitualAI?: boolean;
  aiTip?: string;
  sourceBadge?: string;
  isFromApi?: boolean;
}

export interface MealItem {
  instanceId: string;
  foodId: string;
  name: string;
  grams: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  isHabitualAI?: boolean;
}

export interface DailyMeals {
  desayuno: MealItem[];
  almuerzo: MealItem[];
  merienda: MealItem[];
  cena: MealItem[];
  snacks: MealItem[];
  [key: string]: MealItem[];
}

export interface MealCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export interface ActivityLevel {
  value: number;
  label: string;
  desc: string;
}

export interface Goal {
  id: GoalId | string;
  label: string;
  calFactor: number;
  badge: string;
  desc: string;
}

export interface WeeklyMealDish {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tip?: string;
}

export interface WeeklyDayPlan {
  day: string;
  lunch: WeeklyMealDish;
  dinner: WeeklyMealDish;
}

export interface AlternativeDish {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimatedCostEuros?: string;
  savingOrHealthReason: string;
}

export interface SelectedSlotForAlt {
  dayIndex: number;
  mealType: 'lunch' | 'dinner';
  dish: WeeklyMealDish;
}

export type ActiveTab = 'tracker' | 'ai-dishes' | 'weekly-menu';

export type SearchEngineSource = 'local' | 'openfoodfacts' | 'ai_fallback';

export type AltMode = 'equivalent' | 'budget';

export interface CustomFoodFormData {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  gramsToAdd: number;
  saveToDb: boolean;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealTotalsResult {
  byMeal: Record<string, MacroTotals>;
  daily: MacroTotals;
}

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}
