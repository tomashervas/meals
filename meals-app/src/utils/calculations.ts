import type {
  UserProfile,
  MacroTargets,
  DailyMeals,
  MealCategory,
  MealTotalsResult,
  MacroTotals,
  MacroSplit,
} from '../types/nutrition';
import { GOALS } from '../constants/initialData';

/**
 * Cálculo científico Mifflin-St Jeor para tasa metabólica basal y macros
 */
export function calculateRecommendedTargets(prof: UserProfile): MacroTargets {
  const weight = Number(prof.weight) || 106;
  const height = Number(prof.height) || 201;
  const age = Number(prof.age) || 40;
  const method = prof.macroMethod || 'g_per_kg';

  const bmr = prof.sex === 'male'
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  const tdee = bmr * (Number(prof.activity) || 1.55);
  const goalObj = GOALS.find(g => g.id === prof.goal) || GOALS[1];
  const targetCalories = Math.round(tdee * goalObj.calFactor);

  let proteinGrams: number;
  let carbsGrams: number;
  let fatGrams: number;
  let formulaExplanation: string;

  if (method === 'percentage') {
    let pPct = 0.30, cPct = 0.45, fPct = 0.25;
    if (prof.goal === 'recomp') {
      pPct = 0.35; cPct = 0.40; fPct = 0.25;
    } else if (prof.goal === 'lose') {
      pPct = 0.35; cPct = 0.35; fPct = 0.30;
    } else if (prof.goal === 'gain') {
      pPct = 0.25; cPct = 0.50; fPct = 0.25;
    }
    proteinGrams = Math.round((targetCalories * pPct) / 4);
    carbsGrams = Math.round((targetCalories * cPct) / 4);
    fatGrams = Math.round((targetCalories * fPct) / 9);
    formulaExplanation = `Reparto porcentual (${Math.round(pPct * 100)}% P / ${Math.round(cPct * 100)}% C / ${Math.round(fPct * 100)}% G)`;
  } else {
    let proteinPerKg = 1.8;
    let fatPerKg = 0.9;
    if (prof.goal === 'recomp') {
      proteinPerKg = 2.2;
      fatPerKg = 0.9;
    } else if (prof.goal === 'lose') {
      proteinPerKg = 2.0;
      fatPerKg = 0.8;
    } else if (prof.goal === 'gain') {
      proteinPerKg = 1.8;
      fatPerKg = 1.0;
    }

    proteinGrams = Math.round(weight * proteinPerKg);
    fatGrams = Math.round(weight * fatPerKg);
    const usedCalories = (proteinGrams * 4) + (fatGrams * 9);
    const remainingCalories = Math.max(200, targetCalories - usedCalories);
    carbsGrams = Math.round(remainingCalories / 4);
    formulaExplanation = `${proteinPerKg}g/kg Proteína • ${fatPerKg}g/kg Grasa • Resto Carbohidratos`;
  }

  const finalCalories = (proteinGrams * 4) + (carbsGrams * 4) + (fatGrams * 9);

  return {
    calories: finalCalories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    formulaExplanation
  };
}

/**
 * Calcula los subtotales por cada comida y los totales diarios acumulados
 */
export function calculateMealTotals(
  meals: DailyMeals,
  categories: MealCategory[]
): MealTotalsResult {
  const result: Record<string, MacroTotals> = {};
  let dayCalories = 0, dayProtein = 0, dayCarbs = 0, dayFat = 0;

  categories.forEach(cat => {
    const items = meals[cat.id] || [];
    let cals = 0, pro = 0, carb = 0, fat = 0;

    items.forEach(item => {
      const factor = (Number(item.grams) || 0) / 100;
      cals += item.baseCalories * factor;
      pro += item.baseProtein * factor;
      carb += item.baseCarbs * factor;
      fat += item.baseFat * factor;
    });

    result[cat.id] = {
      calories: Math.round(cals),
      protein: Math.round(pro * 10) / 10,
      carbs: Math.round(carb * 10) / 10,
      fat: Math.round(fat * 10) / 10
    };

    dayCalories += cals;
    dayProtein += pro;
    dayCarbs += carb;
    dayFat += fat;
  });

  return {
    byMeal: result,
    daily: {
      calories: Math.round(dayCalories),
      protein: Math.round(dayProtein),
      carbs: Math.round(dayCarbs),
      fat: Math.round(dayFat)
    }
  };
}

/**
 * Calcula la proporción porcentual de calorías procedentes de cada macronutriente consumido
 */
export function calculateActualMacroSplit(daily: MacroTotals): MacroSplit {
  const totalMacroCalsConsumed = (daily.protein * 4) + (daily.carbs * 4) + (daily.fat * 9);
  if (totalMacroCalsConsumed <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }
  return {
    protein: Math.round(((daily.protein * 4) / totalMacroCalsConsumed) * 100),
    carbs: Math.round(((daily.carbs * 4) / totalMacroCalsConsumed) * 100),
    fat: Math.round(((daily.fat * 9) / totalMacroCalsConsumed) * 100),
  };
}

/**
 * Calcula el reparto objetivo de macronutrientes en porcentaje
 */
export function calculateTargetMacroSplit(targets: MacroTargets): MacroSplit {
  const targetMacroCals = (targets.protein * 4) + (targets.carbs * 4) + (targets.fat * 9);
  if (targetMacroCals <= 0) {
    return { protein: 30, carbs: 45, fat: 25 };
  }
  return {
    protein: Math.round(((targets.protein * 4) / targetMacroCals) * 100),
    carbs: Math.round(((targets.carbs * 4) / targetMacroCals) * 100),
    fat: Math.round(((targets.fat * 9) / targetMacroCals) * 100),
  };
}
