import type {
  UserProfile,
  MacroTargets,
  FoodItem,
  WeeklyDayPlan,
  WeeklyMealDish,
  AlternativeDish,
  AltMode,
} from "../types/nutrition";
import { callGeminiStructured } from "./gemini";

/**
 * Calcula instantáneamente con Gemini los macronutrientes por 100g y ración ideal para una búsqueda
 */
export async function calculateSingleDishWithAI(
  query: string,
  profile: UserProfile,
  targets: MacroTargets,
): Promise<FoodItem> {
  const schema = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      caloriesPer100g: { type: "NUMBER" },
      proteinPer100g: { type: "NUMBER" },
      carbsPer100g: { type: "NUMBER" },
      fatPer100g: { type: "NUMBER" },
      recommendedGrams: { type: "NUMBER" },
      aiTip: { type: "STRING" },
    },
    required: [
      "name",
      "caloriesPer100g",
      "proteinPer100g",
      "carbsPer100g",
      "fatPer100g",
      "recommendedGrams",
      "aiTip",
    ],
  };

  const sys = `Eres un nutricionista deportivo español experto en recomposición corporal. El usuario mide ${profile.height}cm, pesa ${profile.weight}kg y tiene un objetivo diario de ${targets.calories} kcal y ${targets.protein}g de proteína. Estima con rigor los valores nutricionales por cada 100g del plato o alimento consultado y sugiere una ración ideal en gramos.`;

  const data = await callGeminiStructured<{
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    recommendedGrams: number;
    aiTip: string;
  }>(
    sys,
    `Calcula los macronutrientes por cada 100g y la ración recomendada para: "${query}"`,
    schema,
  );

  return {
    id: `ai_instant_${Date.now()}`,
    name: data.name || query,
    calories: Math.round(data.caloriesPer100g),
    protein: Math.round(data.proteinPer100g * 10) / 10,
    carbs: Math.round(data.carbsPer100g * 10) / 10,
    fat: Math.round(data.fatPer100g * 10) / 10,
    category: "Mis Platos IA",
    portionName: "Ración Recomposición IA",
    portionGrams: Math.round(data.recommendedGrams || 300),
    isHabitualAI: true,
    aiTip: data.aiTip,
  };
}

/**
 * Analiza un listado de platos caseros habituales introducidos en texto libre
 */
export async function analyzeHabitualDishesWithAI(
  dishesInput: string,
  profile: UserProfile,
  targets: MacroTargets,
): Promise<FoodItem[]> {
  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        caloriesPer100g: { type: "NUMBER" },
        proteinPer100g: { type: "NUMBER" },
        carbsPer100g: { type: "NUMBER" },
        fatPer100g: { type: "NUMBER" },
        recommendedGrams: { type: "NUMBER" },
        optimizationTip: { type: "STRING" },
      },
      required: [
        "name",
        "caloriesPer100g",
        "proteinPer100g",
        "carbsPer100g",
        "fatPer100g",
        "recommendedGrams",
        "optimizationTip",
      ],
    },
  };

  const sys = `Eres un nutricionista clínico y deportivo en España. El usuario es un ${profile.sex === "male" ? "hombre" : "mujer"} de ${profile.age} años, ${profile.height} cm y ${profile.weight} kg en modo ${profile.goal} (${targets.calories} kcal/día, ${targets.protein}g proteína/día).
Analiza todos los platos caseros o comidas habituales que mencione el usuario. Para cada plato devuelve:
1. Valores nutricionales realistas por cada 100g de plato ya preparado.
2. "recommendedGrams": Cuántos gramos exactos puede comer en una comida principal o cena para que encaje en su meta de recomposición (~750-950 kcal por comida principal con alta proteína).
3. "optimizationTip": Un consejo breve, práctico y español para hacer ese plato más equilibrado, proteico o con menos calorías ocultas.`;

  const result = await callGeminiStructured<
    Array<{
      name: string;
      caloriesPer100g: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
      recommendedGrams: number;
      optimizationTip: string;
    }>
  >(sys, `Platos que suelo comer o cenar: ${dishesInput}`, schema);

  if (Array.isArray(result) && result.length > 0) {
    return result.map((d, idx) => ({
      id: `ai_dish_${Date.now()}_${idx}`,
      name: d.name,
      calories: Math.round(d.caloriesPer100g),
      protein: Math.round(d.proteinPer100g * 10) / 10,
      carbs: Math.round(d.carbsPer100g * 10) / 10,
      fat: Math.round(d.fatPer100g * 10) / 10,
      category: "Mis Platos IA",
      portionName: "Ración Recomposición",
      portionGrams: Math.round(d.recommendedGrams || 350),
      isHabitualAI: true,
      aiTip: d.optimizationTip,
    }));
  }
  return [];
}

/**
 * Genera un menú semanal de 7 días adaptado a los platos habituales y requerimientos del usuario
 */
export async function generateWeeklyMenuWithAI(
  userDishesNames: string,
  profile: UserProfile,
  targets: MacroTargets,
): Promise<WeeklyDayPlan[]> {
  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        day: { type: "STRING" },
        lunch: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            grams: { type: "NUMBER" },
            calories: { type: "NUMBER" },
            protein: { type: "NUMBER" },
            carbs: { type: "NUMBER" },
            fat: { type: "NUMBER" },
            tip: { type: "STRING" },
          },
          required: [
            "name",
            "grams",
            "calories",
            "protein",
            "carbs",
            "fat",
            "tip",
          ],
        },
        dinner: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            grams: { type: "NUMBER" },
            calories: { type: "NUMBER" },
            protein: { type: "NUMBER" },
            carbs: { type: "NUMBER" },
            fat: { type: "NUMBER" },
            tip: { type: "STRING" },
          },
          required: [
            "name",
            "grams",
            "calories",
            "protein",
            "carbs",
            "fat",
            "tip",
          ],
        },
      },
      required: ["day", "lunch", "dinner"],
    },
  };

  const sys = `Eres un nutricionista experto en España. Genera un menú semanal de 7 días (Lunes a Domingo) con Comida (lunch) y Cena (dinner) para un usuario de ${profile.weight}kg y ${profile.height}cm cuya meta total del día es ${targets.calories} kcal y ${targets.protein}g de proteína (modo Recomposición Corporal).
Asume que entre desayuno y merienda ya suma ~1150 kcal y ~80g de proteína, por lo que cada Comida y Cena debe aportar entre 750 y 980 kcal y entre 60g y 80g de proteína.
Prioriza incluir y combinar estos platos habituales del usuario: ${userDishesNames}.`;

  const data = await callGeminiStructured<WeeklyDayPlan[]>(
    sys,
    "Genera el menú semanal de Lunes a Domingo cuadrado en gramos y macros.",
    schema,
  );

  return Array.isArray(data) ? data : [];
}

/**
 * Obtiene alternativas equivalentes o económicas de supermercado para un plato del menú semanal
 */
export async function fetchDishAlternativesWithAI(
  dish: WeeklyMealDish,
  mode: AltMode,
): Promise<AlternativeDish[]> {
  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        grams: { type: "NUMBER" },
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbs: { type: "NUMBER" },
        fat: { type: "NUMBER" },
        estimatedCostEuros: { type: "STRING" },
        savingOrHealthReason: { type: "STRING" },
      },
      required: [
        "name",
        "grams",
        "calories",
        "protein",
        "carbs",
        "fat",
        "estimatedCostEuros",
        "savingOrHealthReason",
      ],
    },
  };

  const isBudget = mode === "budget";
  const sys = isBudget
    ? `Eres un experto en nutrición económica y cesta de la compra en supermercados de España. El usuario quiere sustituir el plato "${dish.name}" (${dish.grams}g, ${dish.calories} kcal, ${dish.protein}g proteína) por 3 alternativas MUCHO MÁS ECONÓMICAS debido al alto precio actual de los alimentos (usando legumbres, huevos, lomo/pollo, caballa/atún/merluza congelada, patata, arroz, queso fresco batido, etc.), manteniendo prácticamente las mismas calorías (${dish.calories} kcal) y la misma cantidad de proteína (${dish.protein}g). Indica el coste estimado por ración en euros y explica el truco de ahorro.`
    : `Eres un nutricionista deportivo en España. Sugiere 3 alternativas gastronómicas variadas y deliciosas para sustituir "${dish.name}" manteniendo de forma muy fiel sus macros (${dish.calories} kcal y ${dish.protein}g de proteína).`;

  const res = await callGeminiStructured<AlternativeDish[]>(
    sys,
    `Dame 3 alternativas ${isBudget ? "económicas de bajo coste en supermercado" : "equivalentes en macros"} para sustituir: ${dish.name}`,
    schema,
  );

  return Array.isArray(res) ? res : [];
}
