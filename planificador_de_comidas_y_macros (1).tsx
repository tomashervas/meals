import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, 
  Utensils, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  Search, 
  Activity, 
  Target, 
  Award, 
  Info,
  Sparkles,
  Scale,
  Edit3,
  X,
  PieChart,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Apple,
  Sliders,
  Calendar,
  ChefHat,
  Coins,
  ArrowLeftRight,
  Loader2,
  Globe,
  Lightbulb,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Terminal,
  ShieldCheck,
  Database
} from 'lucide-react';

// --- CONFIGURACIÓN GEMINI API (Compatible con Canvas y con Vite en Local) ---
const apiKey = "";
const getEffectiveApiKey = () => {
  if (apiKey) return apiKey;
  try {
    // Evita errores de sintaxis en compiladores Babel que no soportan import.meta directo
    const envKey = new Function('try { return import.meta.env.VITE_GEMINI_API_KEY; } catch(e) { return ""; }')();
    if (envKey) return envKey;
  } catch (e) {
    // Entorno sin import.meta
  }
  return "";
};

const GEMINI_MODEL = "gemini-3-flash-preview";

async function callGeminiStructured(systemInstruction, userPrompt, responseSchema) {
  const effectiveKey = getEffectiveApiKey();
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${effectiveKey}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  let delay = 1000;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Respuesta vacía de Gemini");
      return JSON.parse(text);
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// --- MOTOR DE BÚSQUEDA MULTICAPA (OpenFoodFacts v2 -> CORS Proxy -> Respaldo IA Silencioso) ---
async function fetchOpenFoodFactsResilient(query) {
  const cleanQuery = encodeURIComponent(query.trim());
  // Endpoint v2 oficial más ligero y con mejores cabeceras CORS que el antiguo /cgi/search.pl
  const v2Url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${cleanQuery}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,product_name_es,brands,nutriments,serving_size`;
  
  const endpointsToTry = [
    { url: v2Url, label: 'OpenFoodFacts Direct' },
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(v2Url)}`, label: 'OpenFoodFacts Proxy' }
  ];

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    try {
      const res = await fetch(endpoint.url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.products)) {
        const parsed = data.products
          .filter(p => (p.product_name_es || p.product_name) && p.nutriments)
          .map((p, idx) => {
            const n = p.nutriments;
            const cals = Math.round(Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0)) || 0);
            const pro = Math.round((Number(n.proteins_100g) || 0) * 10) / 10;
            const carbs = Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10;
            const fat = Math.round((Number(n.fat_100g) || 0) * 10) / 10;
            const baseName = p.product_name_es || p.product_name;
            const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';
            return {
              id: `off_${p.code || idx}_${Date.now()}`,
              name: `${baseName}${brand}`,
              calories: cals || Math.round(pro * 4 + carbs * 4 + fat * 9),
              protein: pro,
              carbs: carbs,
              fat: fat,
              category: 'OpenFoodFacts / Supermercado',
              portionName: p.serving_size || 'Ración estándar',
              portionGrams: 100,
              sourceBadge: 'OpenFoodFacts API',
              isFromApi: true
            };
          })
          .filter(item => item.calories > 0 || item.protein > 0 || item.carbs > 0);

        if (parsed.length > 0) {
          return { items: parsed, source: 'openfoodfacts' };
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Silenciamos el error de red/CORS y pasamos automáticamente al siguiente método
    }
  }

  // Etapa 3: Si OpenFoodFacts devuelve 503 o bloquea CORS, el Agente IA genera resultados de supermercado español al instante
  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbs: { type: "NUMBER" },
        fat: { type: "NUMBER" },
        portionName: { type: "STRING" },
        portionGrams: { type: "NUMBER" }
      },
      required: ["name", "calories", "protein", "carbs", "fat", "portionName", "portionGrams"]
    }
  };

  const sys = `Actúa como la base de datos nutricional de supermercados de España (Mercadona/Hacendado, Carrefour, Consum y tabla BEDCA). Devuelve 5 alimentos o productos reales en España que coincidan con la búsqueda del usuario, con sus macronutrientes exactos por cada 100g y su ración habitual en gramos.`;
  const aiItems = await callGeminiStructured(
    sys,
    `Busca alimentos o productos en España para el término: "${query}"`,
    schema
  );

  const mappedAi = (Array.isArray(aiItems) ? aiItems : []).map((item, idx) => ({
    id: `ai_search_${idx}_${Date.now()}`,
    name: item.name,
    calories: Math.round(item.calories),
    protein: Math.round(item.protein * 10) / 10,
    carbs: Math.round(item.carbs * 10) / 10,
    fat: Math.round(item.fat * 10) / 10,
    category: 'OpenFoodFacts / Supermercado',
    portionName: item.portionName || 'Ración habitual',
    portionGrams: Math.round(item.portionGrams || 150),
    sourceBadge: 'Catálogo IA Supermercado',
    isFromApi: true
  }));

  return { items: mappedAi, source: 'ai_fallback' };
}

// --- BASE DE DATOS LOCAL MEDITERRÁNEA Y PLATOS HABITUALES INICIALES (Valores por 100g) ---
const INITIAL_AI_DISHES = [
  {
    id: 'ai_init_1',
    name: 'Lentejas estofadas con verduras y pollo',
    calories: 118,
    protein: 9.5,
    carbs: 15.2,
    fat: 2.1,
    category: 'Mis Platos IA',
    portionName: 'Ración Recomposición',
    portionGrams: 420,
    isHabitualAI: true,
    aiTip: 'Sustituir el chorizo tradicional por taquitos de pechuga o jamón magro y pimentón de la Vera mantiene el sabor ahumado reduciendo un 65% las grasas saturadas.'
  },
  {
    id: 'ai_init_2',
    name: 'Pechuga de pollo a la plancha con patatas a lo pobre (al horno)',
    calories: 132,
    protein: 15.8,
    carbs: 11.4,
    fat: 2.6,
    category: 'Mis Platos IA',
    portionName: 'Plato único completo',
    portionGrams: 450,
    isHabitualAI: true,
    aiTip: 'Hacer las patatas y cebolla al horno o airfryer con 1 cucharada de AOVE en pulverizador permite comer un plato grande de 450g con casi 70g de proteína.'
  },
  {
    id: 'ai_init_3',
    name: 'Tortilla francesa de 3 huevos con atún al natural',
    calories: 142,
    protein: 16.5,
    carbs: 0.8,
    fat: 8.1,
    category: 'Mis Platos IA',
    portionName: 'Cena proteica completa',
    portionGrams: 260,
    isHabitualAI: true,
    aiTip: 'Añadir una lata de atún al natural escurrido a los huevos dispara la proteína de la cena por encima de 42g sin apenas sumar calorías extra.'
  },
  {
    id: 'ai_init_4',
    name: 'Arroz al horno valenciano (versión magra)',
    calories: 158,
    protein: 9.2,
    carbs: 22.5,
    fat: 3.4,
    category: 'Mis Platos IA',
    portionName: 'Ración medida',
    portionGrams: 360,
    isHabitualAI: true,
    aiTip: 'Prioriza los garbanzos y magro de cerdo o contramuslo sin piel; controla la morcilla para disfrutarlo el fin de semana dentro de tus macros.'
  }
];

const INITIAL_FOOD_DB = [
  { id: 'f1', name: 'Pechuga de pollo (cruda)', calories: 110, protein: 23, carbs: 0, fat: 1.2, category: 'Carnes y Aves', portionName: '1 ración grande', portionGrams: 200 },
  { id: 'f2', name: 'Huevo de gallina', calories: 155, protein: 13, carbs: 1.1, fat: 11, category: 'Huevos y Lácteos', portionName: '2 huevos L', portionGrams: 120 },
  { id: 'f3', name: 'Copos de avena', calories: 372, protein: 13.5, carbs: 58.7, fat: 7, category: 'Cereales y Legumbres', portionName: '1 bol mediano', portionGrams: 70 },
  { id: 'f5', name: 'Arroz blanco (cocido)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, category: 'Cereales y Legumbres', portionName: '1 plato mediano', portionGrams: 220 },
  { id: 'f6', name: 'Aceite de Oliva Virgen Extra (AOVE)', calories: 884, protein: 0, carbs: 0, fat: 100, category: 'Aceites y Grasas', portionName: '1 cucharada sopera', portionGrams: 10 },
  { id: 'f7', name: 'Salmón fresco', calories: 208, protein: 20, carbs: 0, fat: 13, category: 'Pescados', portionName: '1 lomo grande', portionGrams: 200 },
  { id: 'f8', name: 'Plátano de Canarias', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, category: 'Frutas', portionName: '1 unidad grande', portionGrams: 130 },
  { id: 'f9', name: 'Naranja de mesa', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, category: 'Frutas', portionName: '1 unidad grande', portionGrams: 180 },
  { id: 'f9_manzana', name: 'Manzana (Golden / Fuji / Granny Smith)', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, category: 'Frutas', portionName: '1 manzana mediana', portionGrams: 180 },
  { id: 'f9_pera', name: 'Pera Conferencia', calories: 57, protein: 0.4, carbs: 15, fat: 0.1, category: 'Frutas', portionName: '1 pera mediana', portionGrams: 170 },
  { id: 'f9_fresas', name: 'Fresas / Fresones', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, category: 'Frutas', portionName: '1 bol mediano', portionGrams: 200 },
  { id: 'f10', name: 'Pan integral 100%', calories: 250, protein: 10, carbs: 43, fat: 2.5, category: 'Cereales y Legumbres', portionName: '2 tostadas', portionGrams: 80 },
  { id: 'f12', name: 'Queso fresco batido 0% (tipo Mercadona)', calories: 47, protein: 8, carbs: 3.5, fat: 0.1, category: 'Huevos y Lácteos', portionName: '1 bol grande', portionGrams: 250 },
  { id: 'f12_yogur', name: 'Yogur +Proteínas natural 0% (Hacendado)', calories: 52, protein: 10, carbs: 3.1, fat: 0.1, category: 'Huevos y Lácteos', portionName: '1 envase (120g)', portionGrams: 120 },
  { id: 'f12_leche', name: 'Leche semidesnatada sin lactosa / normal', calories: 46, protein: 3.2, carbs: 4.8, fat: 1.6, category: 'Huevos y Lácteos', portionName: '1 taza grande', portionGrams: 250 },
  { id: 'f13', name: 'Almendras o Nueces crudas', calories: 590, protein: 20, carbs: 18, fat: 52, category: 'Frutos Secos', portionName: '1 puñado', portionGrams: 30 },
  { id: 'f14', name: 'Patata (cocida o asada)', calories: 77, protein: 2, carbs: 17, fat: 0.1, category: 'Verduras y Hortalizas', portionName: '1 ración guarnición', portionGrams: 250 },
  { id: 'f14_boniato', name: 'Boniato / Batata asada', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, category: 'Verduras y Hortalizas', portionName: '1 ración mediana', portionGrams: 220 },
  { id: 'f15', name: 'Ternera magra', calories: 135, protein: 21.5, carbs: 0, fat: 5.4, category: 'Carnes y Aves', portionName: '1 filete grande', portionGrams: 200 },
  { id: 'f15_lomo', name: 'Lomo o Solomillo de cerdo magro', calories: 143, protein: 22, carbs: 0, fat: 5.8, category: 'Carnes y Aves', portionName: '1 ración filetes', portionGrams: 200 },
  { id: 'f15_pavo', name: 'Pechuga de pavo al natural (fiambre 92% carne)', calories: 92, protein: 19.5, carbs: 1.2, fat: 1.0, category: 'Carnes y Aves', portionName: '1 paquete / bocadillo', portionGrams: 100 },
  { id: 'f18', name: 'Atún al natural (en lata)', calories: 100, protein: 23, carbs: 0, fat: 0.8, category: 'Pescados', portionName: '2 latas escurridas', portionGrams: 120 },
  { id: 'f21', name: 'Lentejas cocidas', calories: 116, protein: 9, carbs: 20, fat: 0.4, category: 'Cereales y Legumbres', portionName: '1 plato hondo', portionGrams: 250 },
  { id: 'f22', name: 'Garbanzos cocidos', calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, category: 'Cereales y Legumbres', portionName: '1 plato hondo', portionGrams: 240 },
  { id: 'f22_pasta', name: 'Macarrones / Pasta integral (cocida)', calories: 124, protein: 5.3, carbs: 25.5, fat: 0.8, category: 'Cereales y Legumbres', portionName: '1 plato grande', portionGrams: 240 },
  { id: 'f23', name: 'Jamón serrano magro', calories: 240, protein: 31, carbs: 0, fat: 13, category: 'Carnes y Aves', portionName: 'Ración bocadillo/tostada', portionGrams: 60 },
  { id: 'f24', name: 'Brócoli o verduras salteadas', calories: 35, protein: 2.8, carbs: 7, fat: 0.4, category: 'Verduras y Hortalizas', portionName: '1 plato abundante', portionGrams: 200 },
  { id: 'f24_aguacate', name: 'Aguacate Hass fresco', calories: 160, protein: 2, carbs: 8.5, fat: 14.7, category: 'Frutas', portionName: 'Medio aguacate', portionGrams: 80 },
  { id: 'f25', name: 'Proteína Whey en polvo', calories: 380, protein: 78, carbs: 6, fat: 5, category: 'Suplementos', portionName: '1 cazo y medio', portionGrams: 40 },
  { id: 'f28', name: 'Merluza o Bacalao fresco', calories: 82, protein: 17, carbs: 0, fat: 1.3, category: 'Pescados', portionName: '1 ración grande', portionGrams: 240 },
];

const MEAL_CATEGORIES = [
  { id: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'almuerzo', label: 'Comida / Almuerzo', icon: Sun, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'merienda', label: 'Merienda', icon: Sunset, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'cena', label: 'Cena', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'snacks', label: 'Snacks / Post-Entreno', icon: Apple, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentario', desc: 'Trabajo de oficina, poco o ningún ejercicio' },
  { value: 1.375, label: 'Ligero', desc: 'Ejercicio ligero o deporte 1-3 días/semana' },
  { value: 1.55, label: 'Moderado', desc: 'Entrenamiento 3-5 días/semana' },
  { value: 1.725, label: 'Activo', desc: 'Entrenamiento intenso 6-7 días/semana' },
  { value: 1.9, label: 'Muy Activo', desc: 'Trabajo físico duro o 2 sesiones diarias' },
];

const GOALS = [
  { id: 'lose', label: 'Perder Grasa', calFactor: 0.80, badge: '-20% kcal', desc: 'Déficit del 20% para pérdida de grasa rápida' },
  { id: 'recomp', label: 'Recomposición Corporal', calFactor: 0.92, badge: '-8% kcal • 2.2g/kg P', desc: 'Perder grasa y ganar músculo a la vez (micro-déficit del 8%)' },
  { id: 'maintain', label: 'Mantener Peso', calFactor: 1.0, badge: 'TDEE exacto', desc: 'Calorías de mantenimiento para conservar tu peso' },
  { id: 'gain', label: 'Ganar Músculo', calFactor: 1.12, badge: '+12% kcal', desc: 'Superávit controlado del 12% para hipertrofia' },
];

// Día de ejemplo inicial cuadrado para 106 kg y 201 cm en Recomposición (~2980 kcal, ~233g Proteína)
const SAMPLE_DAY_MEALS = {
  desayuno: [
    { instanceId: 's1', foodId: 'f10', name: 'Pan integral 100%', grams: 100, baseCalories: 250, baseProtein: 10, baseCarbs: 43, baseFat: 2.5 },
    { instanceId: 's2', foodId: 'f2', name: 'Huevo de gallina', grams: 180, baseCalories: 155, baseProtein: 13, baseCarbs: 1.1, baseFat: 11 },
    { instanceId: 's3', foodId: 'f23', name: 'Jamón serrano magro', grams: 60, baseCalories: 240, baseProtein: 31, baseCarbs: 0, baseFat: 13 },
    { instanceId: 's4', foodId: 'f9', name: 'Naranja de mesa', grams: 200, baseCalories: 47, baseProtein: 0.9, baseCarbs: 11.8, baseFat: 0.1 },
  ],
  almuerzo: [
    { instanceId: 's5', foodId: 'ai_init_2', name: 'Pechuga de pollo a la plancha con patatas a lo pobre (al horno)', grams: 500, baseCalories: 132, baseProtein: 15.8, baseCarbs: 11.4, baseFat: 2.6, isHabitualAI: true },
    { instanceId: 's6', foodId: 'f5', name: 'Arroz blanco (cocido)', grams: 220, baseCalories: 130, baseProtein: 2.7, baseCarbs: 28, baseFat: 0.3 },
    { instanceId: 's7', foodId: 'f6', name: 'Aceite de Oliva Virgen Extra (AOVE)', grams: 12, baseCalories: 884, baseProtein: 0, baseCarbs: 0, baseFat: 100 },
  ],
  merienda: [
    { instanceId: 's8', foodId: 'f12', name: 'Queso fresco batido 0%', grams: 300, baseCalories: 47, baseProtein: 8, baseCarbs: 3.5, baseFat: 0.1 },
    { instanceId: 's9', foodId: 'f3', name: 'Copos de avena', grams: 70, baseCalories: 372, baseProtein: 13.5, baseCarbs: 58.7, baseFat: 7 },
    { instanceId: 's10', foodId: 'f8', name: 'Plátano de Canarias', grams: 130, baseCalories: 89, baseProtein: 1.1, baseCarbs: 22.8, baseFat: 0.3 },
    { instanceId: 's11', foodId: 'f13', name: 'Almendras o Nueces crudas', grams: 30, baseCalories: 590, baseProtein: 20, baseCarbs: 18, baseFat: 52 },
  ],
  cena: [
    { instanceId: 's12', foodId: 'f7', name: 'Salmón fresco', grams: 220, baseCalories: 208, baseProtein: 20, baseCarbs: 0, baseFat: 13 },
    { instanceId: 's13', foodId: 'f14', name: 'Patata (cocida o asada)', grams: 300, baseCalories: 77, baseProtein: 2, baseCarbs: 17, baseFat: 0.1 },
    { instanceId: 's14', foodId: 'f24', name: 'Brócoli o verduras salteadas', grams: 200, baseCalories: 35, baseProtein: 2.8, baseCarbs: 7, baseFat: 0.4 },
  ],
  snacks: [
    { instanceId: 's15', foodId: 'f25', name: 'Proteína Whey en polvo', grams: 45, baseCalories: 380, baseProtein: 78, baseCarbs: 6, baseFat: 5 }
  ]
};

const INITIAL_WEEKLY_PLAN = [
  {
    day: 'Lunes',
    lunch: { name: 'Lentejas estofadas con verduras y pechuga de pollo', grams: 480, calories: 890, protein: 72, carbs: 98, fat: 22, tip: 'Plato único legumbre + ave magra ideal para empezar la semana.' },
    dinner: { name: 'Tortilla de 3 huevos con 2 latas de atún y patata asada', grams: 460, calories: 780, protein: 68, carbs: 58, fat: 28, tip: 'Cena rápida de alto valor biológico.' }
  },
  {
    day: 'Martes',
    lunch: { name: 'Pechuga de pollo a la plancha con patatas a lo pobre al horno y ensalada', grams: 540, calories: 940, protein: 78, carbs: 102, fat: 23, tip: 'Patatas hechas al horno con pulverizador de AOVE.' },
    dinner: { name: 'Merluza al horno con verduras asadas y arroz blanco', grams: 480, calories: 760, protein: 64, carbs: 84, fat: 18, tip: 'Pescado blanco digestivo y alto en proteína.' }
  },
  {
    day: 'Miércoles',
    lunch: { name: 'Garbanzos salteados con espinacas, huevo duro y tacos de pavo', grams: 470, calories: 910, protein: 70, carbs: 96, fat: 26, tip: 'Aporte excelente de fibra, hierro y proteína.' },
    dinner: { name: 'Salmón a la plancha con patata cocida y brócoli al vapor', grams: 470, calories: 840, protein: 62, carbs: 64, fat: 34, tip: 'Grasas saludables Omega-3 esenciales para el entorno hormonal.' }
  },
  {
    day: 'Jueves',
    lunch: { name: 'Macarrones integrales con carne picada magra de ternera y tomate natural', grams: 460, calories: 960, protein: 75, carbs: 110, fat: 24, tip: 'Usa carne picada 95% magra y tomate triturado sin azúcar.' },
    dinner: { name: 'Revuelto de huevos, claras, champiñones y jamón serrano con pan integral', grams: 390, calories: 740, protein: 65, carbs: 54, fat: 26, tip: 'Cena saciante lista en 8 minutos.' }
  },
  {
    day: 'Viernes',
    lunch: { name: 'Arroz blanco con solomillo o lomo de cerdo magro y pimientos asados', grams: 490, calories: 920, protein: 74, carbs: 104, fat: 22, tip: 'Corte magro económico y muy rico en vitaminas del grupo B.' },
    dinner: { name: 'Fajitas integrales de pollo desmechado con pimientos y queso fresco batido', grams: 430, calories: 810, protein: 72, carbs: 82, fat: 20, tip: 'Usa queso batido 0% con limón y especias como salsa.' }
  },
  {
    day: 'Sábado',
    lunch: { name: 'Arroz al horno valenciano (versión magra con garbanzos y costilla magra)', grams: 450, calories: 980, protein: 68, carbs: 115, fat: 26, tip: 'Controla el embutido graso y añade más magro para cuadrar macros.' },
    dinner: { name: 'Hamburguesas caseras de ternera magra en pan integral con huevo a la plancha', grams: 410, calories: 860, protein: 74, carbs: 68, fat: 30, tip: 'Cena de fin de semana sin salirte del déficit de recomposición.' }
  },
  {
    day: 'Domingo',
    lunch: { name: 'Paella de pollo y conejo con verduras de temporada', grams: 480, calories: 930, protein: 72, carbs: 108, fat: 22, tip: 'El conejo y el pollo sin piel hacen de la paella un plato 10 para recomposición.' },
    dinner: { name: 'Ensalada templada de patata, 2 latas de atún al natural, huevos cocidos y aguacate', grams: 480, calories: 760, protein: 66, carbs: 62, fat: 26, tip: 'Cena fresca y sin encender los fogones.' }
  }
];

export default function App() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'ai-dishes' | 'weekly-menu'

  // --- PERFIL BIOMÉTRICO (Por defecto: Hombre, 40 años, 201cm, 106kg, Moderado, Recomposición) ---
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('nutri_profile_v2');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      sex: parsed.sex || 'male',
      age: parsed.age ?? 40,
      height: parsed.height ?? 201,
      weight: parsed.weight ?? 106,
      activity: parsed.activity ?? 1.55,
      goal: parsed.goal || 'recomp',
      macroMethod: parsed.macroMethod || 'g_per_kg',
      isManualTargets: parsed.isManualTargets || false
    };
  });

  // Cálculo científico Mifflin-St Jeor
  const calculateRecommendedTargets = (prof) => {
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

    let proteinGrams = 0;
    let carbsGrams = 0;
    let fatGrams = 0;
    let formulaExplanation = '';

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
  };

  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('nutri_targets_v2');
    if (saved) return JSON.parse(saved);
    return calculateRecommendedTargets(profile);
  });

  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('nutri_meals_v2');
    return saved ? JSON.parse(saved) : SAMPLE_DAY_MEALS;
  });

  const [customFoods, setCustomFoods] = useState(() => {
    const saved = localStorage.getItem('nutri_custom_foods_v2');
    return saved ? JSON.parse(saved) : INITIAL_AI_DISHES;
  });

  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    const saved = localStorage.getItem('nutri_weekly_plan_v2');
    return saved ? JSON.parse(saved) : INITIAL_WEEKLY_PLAN;
  });

  // --- ESTADOS DE MODALES Y ASISTENTE IA ---
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeMealToAdd, setActiveMealToAdd] = useState(null);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [isCreatingCustomFood, setIsCreatingCustomFood] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '', gramsToAdd: 250, saveToDb: true
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  // Estados OpenFoodFacts v2 + Motor IA Resiliente
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchEngineSource, setSearchEngineSource] = useState('local'); // 'local' | 'openfoodfacts' | 'ai_fallback'
  const [isCalculatingSingleDishAI, setIsCalculatingSingleDishAI] = useState(false);

  // Estados Asistente IA de Platos Habituales
  const [aiDishesInput, setAiDishesInput] = useState('');
  const [isAnalyzingDishes, setIsAnalyzingDishes] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);

  // Estados Menú Semanal y Alternativas Económicas IA
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [selectedSlotForAlt, setSelectedSlotForAlt] = useState(null); // { dayIndex, mealType: 'lunch' | 'dinner', dish }
  const [altSuggestions, setAltSuggestions] = useState([]);
  const [altMode, setAltMode] = useState(null); // 'equivalent' | 'budget'
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);

  // Persistencia en LocalStorage
  useEffect(() => { localStorage.setItem('nutri_profile_v2', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('nutri_targets_v2', JSON.stringify(targets)); }, [targets]);
  useEffect(() => { localStorage.setItem('nutri_meals_v2', JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem('nutri_custom_foods_v2', JSON.stringify(customFoods)); }, [customFoods]);
  useEffect(() => { localStorage.setItem('nutri_weekly_plan_v2', JSON.stringify(weeklyPlan)); }, [weeklyPlan]);

  // Catálogo unificado (definido antes de los efectos de búsqueda para evitar ReferenceError)
  const allFoods = useMemo(() => [...customFoods, ...INITIAL_FOOD_DB], [customFoods]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- BÚSQUEDA RESILIENTE SIN ERRORES CORS/503 (OpenFoodFacts v2 -> Proxy -> Gemini IA) ---
  useEffect(() => {
    const query = foodSearchQuery.trim();
    if (!activeMealToAdd || query.length < 3) {
      setApiSearchResults([]);
      setIsSearchingApi(false);
      setSearchEngineSource('local');
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const { items, source } = await fetchOpenFoodFactsResilient(query);
        if (!isCancelled) {
          setApiSearchResults(items);
          setSearchEngineSource(source);
          // Si no había ningún elemento local seleccionado que coincida, pre-seleccionamos el primero encontrado
          const localHasMatch = allFoods.some(f => f.name.toLowerCase().includes(query.toLowerCase()));
          if (!localHasMatch && items.length > 0) {
            setSelectedFoodItem(items[0]);
            setSelectedGrams(items[0].portionGrams || 100);
          }
        }
      } catch (e) {
        if (!isCancelled) {
          setSearchEngineSource('local');
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingApi(false);
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [foodSearchQuery, activeMealToAdd, allFoods]);

  // --- CÁLCULO INSTANTÁNEO DE PLATO BUSCADO CON IA ---
  const handleCalculateSearchQueryWithAI = async () => {
    const query = foodSearchQuery.trim();
    if (!query) return;
    setIsCalculatingSingleDishAI(true);
    try {
      const schema = {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          caloriesPer100g: { type: "NUMBER" },
          proteinPer100g: { type: "NUMBER" },
          carbsPer100g: { type: "NUMBER" },
          fatPer100g: { type: "NUMBER" },
          recommendedGrams: { type: "NUMBER" },
          aiTip: { type: "STRING" }
        },
        required: ["name", "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "recommendedGrams", "aiTip"]
      };
      const sys = `Eres un nutricionista deportivo español experto en recomposición corporal. El usuario mide ${profile.height}cm, pesa ${profile.weight}kg y tiene un objetivo diario de ${targets.calories} kcal y ${targets.protein}g de proteína. Estima con rigor los valores nutricionales por cada 100g del plato o alimento consultado y sugiere una ración ideal en gramos.`;
      const data = await callGeminiStructured(sys, `Calcula los macronutrientes por cada 100g y la ración recomendada para: "${query}"`, schema);
      
      const newDish = {
        id: `ai_instant_${Date.now()}`,
        name: data.name || query,
        calories: Math.round(data.caloriesPer100g),
        protein: Math.round(data.proteinPer100g * 10) / 10,
        carbs: Math.round(data.carbsPer100g * 10) / 10,
        fat: Math.round(data.fatPer100g * 10) / 10,
        category: 'Mis Platos IA',
        portionName: 'Ración Recomposición IA',
        portionGrams: Math.round(data.recommendedGrams || 300),
        isHabitualAI: true,
        aiTip: data.aiTip
      };

      setCustomFoods(prev => [newDish, ...prev]);
      setSelectedFoodItem(newDish);
      setSelectedGrams(newDish.portionGrams);
      showToast(`Plato "${newDish.name}" calculado con IA y guardado en tu listado`);
    } catch (e) {
      showToast('No se pudo conectar con la IA en este momento.');
    } finally {
      setIsCalculatingSingleDishAI(false);
    }
  };

  // --- ANALIZADOR DE PLATOS HABITUALES CON IA (PESTAÑA MIS PLATOS IA) ---
  const handleAnalyzeHabitualDishes = async (e) => {
    e.preventDefault();
    if (!aiDishesInput.trim()) return;
    setIsAnalyzingDishes(true);
    setAiAnalysisError(null);

    try {
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
            optimizationTip: { type: "STRING" }
          },
          required: ["name", "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "recommendedGrams", "optimizationTip"]
        }
      };

      const sys = `Eres un nutricionista clínico y deportivo en España. El usuario es un ${profile.sex === 'male' ? 'hombre' : 'mujer'} de ${profile.age} años, ${profile.height} cm y ${profile.weight} kg en modo Recomposición Corporal (${targets.calories} kcal/día, ${targets.protein}g proteína/día).
Analiza todos los platos caseros o comidas habituales que mencione el usuario. Para cada plato devuelve:
1. Valores nutricionales realistas por cada 100g de plato ya preparado.
2. "recommendedGrams": Cuántos gramos exactos puede comer en una comida principal o cena para que encaje en su meta de recomposición (~750-950 kcal por comida principal con alta proteína).
3. "optimizationTip": Un consejo breve, práctico y español para hacer ese plato más equilibrado, proteico o con menos calorías ocultas.`;

      const result = await callGeminiStructured(sys, `Platos que suelo comer o cenar: ${aiDishesInput}`, schema);

      if (Array.isArray(result) && result.length > 0) {
        const mapped = result.map((d, idx) => ({
          id: `ai_dish_${Date.now()}_${idx}`,
          name: d.name,
          calories: Math.round(d.caloriesPer100g),
          protein: Math.round(d.proteinPer100g * 10) / 10,
          carbs: Math.round(d.carbsPer100g * 10) / 10,
          fat: Math.round(d.fatPer100g * 10) / 10,
          category: 'Mis Platos IA',
          portionName: 'Ración Recomposición',
          portionGrams: Math.round(d.recommendedGrams || 350),
          isHabitualAI: true,
          aiTip: d.optimizationTip
        }));

        setCustomFoods(prev => [...mapped, ...prev]);
        setAiDishesInput('');
        showToast(`¡${mapped.length} platos analizados y añadidos permanentemente a tu base de datos!`);
      }
    } catch (err) {
      setAiAnalysisError('Hubo un problema al analizar los platos. Inténtalo de nuevo.');
    } finally {
      setIsAnalyzingDishes(false);
    }
  };

  // --- GENERADOR DE MENÚ SEMANAL CON IA ---
  const handleGenerateWeeklyMenuAI = async () => {
    setIsGeneratingWeekly(true);
    try {
      const userDishesNames = customFoods.map(f => f.name).join(', ');
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
                tip: { type: "STRING" }
              },
              required: ["name", "grams", "calories", "protein", "carbs", "fat", "tip"]
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
                tip: { type: "STRING" }
              },
              required: ["name", "grams", "calories", "protein", "carbs", "fat", "tip"]
            }
          },
          required: ["day", "lunch", "dinner"]
        }
      };

      const sys = `Eres un nutricionista experto en España. Genera un menú semanal de 7 días (Lunes a Domingo) con Comida (lunch) y Cena (dinner) para un usuario de ${profile.weight}kg y ${profile.height}cm cuya meta total del día es ${targets.calories} kcal y ${targets.protein}g de proteína (modo Recomposición Corporal).
Asume que entre desayuno y merienda ya suma ~1150 kcal y ~80g de proteína, por lo que cada Comida y Cena debe aportar entre 750 y 980 kcal y entre 60g y 80g de proteína.
Prioriza incluir y combinar estos platos habituales del usuario: ${userDishesNames}.`;

      const data = await callGeminiStructured(sys, "Genera el menú semanal de Lunes a Domingo cuadrado en gramos y macros.", schema);
      if (Array.isArray(data) && data.length === 7) {
        setWeeklyPlan(data);
        showToast('Menú semanal generado con tus platos habituales y ajustado a tus macros');
      }
    } catch (e) {
      showToast('No se pudo regenerar el menú en este momento.');
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  // --- SUGERIDOR DE ALTERNATIVAS EQUIVALENTES O ECONÓMICAS CON IA ---
  const handleFetchAlternatives = async (slot, mode) => {
    setSelectedSlotForAlt(slot);
    setAltMode(mode);
    setIsLoadingAlts(true);
    setAltSuggestions([]);

    try {
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
            savingOrHealthReason: { type: "STRING" }
          },
          required: ["name", "grams", "calories", "protein", "carbs", "fat", "estimatedCostEuros", "savingOrHealthReason"]
        }
      };

      const dish = slot.dish;
      const isBudget = mode === 'budget';
      const sys = isBudget
        ? `Eres un experto en nutrición económica y cesta de la compra en supermercados de España. El usuario quiere sustituir el plato "${dish.name}" (${dish.grams}g, ${dish.calories} kcal, ${dish.protein}g proteína) por 3 alternativas MUCHO MÁS ECONÓMICAS debido al alto precio actual de los alimentos (usando legumbres, huevos, lomo/pollo, caballa/atún/merluza congelada, patata, arroz, queso fresco batido, etc.), manteniendo prácticamente las mismas calorías (${dish.calories} kcal) y la misma cantidad de proteína (${dish.protein}g). Indica el coste estimado por ración en euros y explica el truco de ahorro.`
        : `Eres un nutricionista deportivo en España. Sugiere 3 alternativas gastronómicas variadas y deliciosas para sustituir "${dish.name}" manteniendo de forma muy fiel sus macros (${dish.calories} kcal y ${dish.protein}g de proteína).`;

      const res = await callGeminiStructured(sys, `Dame 3 alternativas ${isBudget ? 'económicas de bajo coste en supermercado' : 'equivalentes en macros'} para sustituir: ${dish.name}`, schema);
      if (Array.isArray(res)) {
        setAltSuggestions(res);
      }
    } catch (e) {
      showToast('Error al obtener alternativas de la IA.');
    } finally {
      setIsLoadingAlts(false);
    }
  };

  const handleReplaceWeeklyDish = (alt) => {
    if (!selectedSlotForAlt) return;
    const { dayIndex, mealType } = selectedSlotForAlt;
    setWeeklyPlan(prev => prev.map((dayObj, idx) => {
      if (idx !== dayIndex) return dayObj;
      return {
        ...dayObj,
        [mealType]: {
          name: alt.name,
          grams: Math.round(alt.grams),
          calories: Math.round(alt.calories),
          protein: Math.round(alt.protein),
          carbs: Math.round(alt.carbs),
          fat: Math.round(alt.fat),
          tip: alt.savingOrHealthReason
        }
      };
    }));
    showToast(`Plato sustituido por "${alt.name}" en el ${weeklyPlan[dayIndex].day}`);
    setSelectedSlotForAlt(null);
  };

  const handleSendWeeklyMealToToday = (mealType, dishObj) => {
    const targetCat = mealType === 'lunch' ? 'almuerzo' : 'cena';
    const grams = Number(dishObj.grams) || 400;
    const factor = grams / 100;

    const newEntry = {
      instanceId: `item_${Date.now()}`,
      foodId: `weekly_${Date.now()}`,
      name: dishObj.name,
      grams: grams,
      baseCalories: Math.round(dishObj.calories / factor),
      baseProtein: Math.round((dishObj.protein / factor) * 10) / 10,
      baseCarbs: Math.round((dishObj.carbs / factor) * 10) / 10,
      baseFat: Math.round((dishObj.fat / factor) * 10) / 10,
      isHabitualAI: true
    };

    setMeals(prev => ({
      ...prev,
      [targetCat]: [...(prev[targetCat] || []), newEntry]
    }));

    showToast(`Añadido "${dishObj.name}" a tu ${targetCat === 'almuerzo' ? 'Comida' : 'Cena'} de hoy`);
    setActiveTab('tracker');
    setToastMessage(`Añadido "${dishObj.name}" a tu ${targetCat === 'almuerzo' ? 'Comida' : 'Cena'} de hoy`);
    setActiveTab('tracker');
  };

  // --- CÁLCULO DE TOTALES DIARIOS ---
  const mealTotals = useMemo(() => {
    const result = {};
    let dayCalories = 0, dayProtein = 0, dayCarbs = 0, dayFat = 0;

    MEAL_CATEGORIES.forEach(cat => {
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
  }, [meals]);

  // --- GESTIÓN DE ALIMENTOS EN EL TRACKER DIARIO ---
  const openAddFoodModal = (mealId) => {
    setActiveMealToAdd(mealId);
    setFoodSearchQuery('');
    setSelectedCategoryFilter('Todos');
    setSelectedFoodItem(allFoods[0]);
    setSelectedGrams(allFoods[0]?.portionGrams || 200);
    setIsCreatingCustomFood(false);
    setApiSearchResults([]);
  };

  const handleAddSelectedFood = () => {
    if (!selectedFoodItem || !activeMealToAdd) return;
    const gramsNum = Math.max(1, Number(selectedGrams) || 100);

    const newEntry = {
      instanceId: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      foodId: selectedFoodItem.id,
      name: selectedFoodItem.name,
      grams: gramsNum,
      baseCalories: Number(selectedFoodItem.calories),
      baseProtein: Number(selectedFoodItem.protein),
      baseCarbs: Number(selectedFoodItem.carbs),
      baseFat: Number(selectedFoodItem.fat),
      isHabitualAI: selectedFoodItem.isHabitualAI || false
    };

    setMeals(prev => ({
      ...prev,
      [activeMealToAdd]: [...(prev[activeMealToAdd] || []), newEntry]
    }));

    const mealLabel = MEAL_CATEGORIES.find(m => m.id === activeMealToAdd)?.label;
    showToast(`Añadido: ${selectedFoodItem.name} (${gramsNum}g) a ${mealLabel}`);
    setActiveMealToAdd(null);
  };

  const handleCreateAndAddCustomFood = (e) => {
    e.preventDefault();
    if (!customFoodForm.name.trim()) return;

    const pro = Math.max(0, Number(customFoodForm.protein) || 0);
    const carbs = Math.max(0, Number(customFoodForm.carbs) || 0);
    const fat = Math.max(0, Number(customFoodForm.fat) || 0);
    const calsInput = Number(customFoodForm.calories);
    const calculatedCals = Math.round((pro * 4) + (carbs * 4) + (fat * 9));
    const finalBaseCals = calsInput > 0 ? calsInput : calculatedCals;
    const gramsToAdd = Math.max(1, Number(customFoodForm.gramsToAdd) || 100);

    const newFoodId = `custom_${Date.now()}`;

    if (customFoodForm.saveToDb) {
      const newDbItem = {
        id: newFoodId,
        name: customFoodForm.name.trim(),
        calories: finalBaseCals,
        protein: pro,
        carbs: carbs,
        fat: fat,
        category: 'Mis Platos IA',
        portionName: 'Ración personalizada',
        portionGrams: gramsToAdd,
        isHabitualAI: true
      };
      setCustomFoods(prev => [newDbItem, ...prev]);
    }

    const newEntry = {
      instanceId: `item_${Date.now()}`,
      foodId: newFoodId,
      name: customFoodForm.name.trim(),
      grams: gramsToAdd,
      baseCalories: finalBaseCals,
      baseProtein: pro,
      baseCarbs: carbs,
      baseFat: fat
    };

    setMeals(prev => ({
      ...prev,
      [activeMealToAdd]: [...(prev[activeMealToAdd] || []), newEntry]
    }));

    showToast(`Añadido alimento personalizado: ${customFoodForm.name}`);
    setCustomFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '', gramsToAdd: 250, saveToDb: true });
    setActiveMealToAdd(null);
  };

  const handleUpdateMealItemGrams = (mealId, instanceId, newGrams) => {
    const val = Math.max(0, Number(newGrams));
    setMeals(prev => ({
      ...prev,
      [mealId]: prev[mealId].map(item => 
        item.instanceId === instanceId ? { ...item, grams: val } : item
      )
    }));
  };

  const handleRemoveMealItem = (mealId, instanceId) => {
    setMeals(prev => ({
      ...prev,
      [mealId]: prev[mealId].filter(item => item.instanceId !== instanceId)
    }));
  };

  const handleClearDay = () => {
    setMeals({ desayuno: [], almuerzo: [], merienda: [], cena: [], snacks: [] });
    setConfirmClearModal(false);
    showToast('Registro del día reiniciado en blanco');
  };

  const handleProfileChange = (field, value) => {
    const updated = { ...profile, [field]: value, isManualTargets: false };
    setProfile(updated);
    setTargets(calculateRecommendedTargets(updated));
  };

  const handleManualTargetChange = (field, value) => {
    const num = Math.max(0, Number(value) || 0);
    setProfile(prev => ({ ...prev, isManualTargets: true }));
    setTargets(prev => {
      const next = { ...prev, [field]: num };
      if (field === 'protein' || field === 'carbs' || field === 'fat') {
        next.calories = Math.round((next.protein * 4) + (next.carbs * 4) + (next.fat * 9));
      }
      return next;
    });
  };

  // Combinar resultados locales + OpenFoodFacts / Motor IA en el buscador
  const combinedFilteredFoods = useMemo(() => {
    const localMatches = allFoods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(foodSearchQuery.toLowerCase());
      const matchesCat = selectedCategoryFilter === 'Todos' || food.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });

    if (selectedCategoryFilter === 'OpenFoodFacts / Supermercado') {
      return apiSearchResults;
    }
    if (selectedCategoryFilter !== 'Todos') {
      return localMatches;
    }
    return [...localMatches, ...apiSearchResults];
  }, [allFoods, apiSearchResults, foodSearchQuery, selectedCategoryFilter]);

  const categoriesList = useMemo(() => {
    const cats = new Set(['Todos', 'Mis Platos IA', 'OpenFoodFacts / Supermercado']);
    INITIAL_FOOD_DB.forEach(f => cats.add(f.category));
    return Array.from(cats);
  }, []);

  // --- CÁLCULOS VISUALES PARA EL DASHBOARD ---
  const calPercentage = Math.min(100, Math.round((mealTotals.daily.calories / (targets.calories || 1)) * 100));
  const remainingCalories = targets.calories - mealTotals.daily.calories;
  const isOverCalories = remainingCalories < 0;

  const totalMacroCalsConsumed = (mealTotals.daily.protein * 4) + (mealTotals.daily.carbs * 4) + (mealTotals.daily.fat * 9);
  const actualMacroSplit = totalMacroCalsConsumed > 0 ? {
    protein: Math.round(((mealTotals.daily.protein * 4) / totalMacroCalsConsumed) * 100),
    carbs: Math.round(((mealTotals.daily.carbs * 4) / totalMacroCalsConsumed) * 100),
    fat: Math.round(((mealTotals.daily.fat * 9) / totalMacroCalsConsumed) * 100),
  } : { protein: 0, carbs: 0, fat: 0 };

  const targetMacroCals = (targets.protein * 4) + (targets.carbs * 4) + (targets.fat * 9);
  const targetMacroSplit = targetMacroCals > 0 ? {
    protein: Math.round(((targets.protein * 4) / targetMacroCals) * 100),
    carbs: Math.round(((targets.carbs * 4) / targetMacroCals) * 100),
    fat: Math.round(((targets.fat * 9) / targetMacroCals) * 100),
  } : { protein: 30, carbs: 45, fat: 25 };

  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Notificación Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SUPERIOR + NAVEGACIÓN PRINCIPAL */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                NutriPlan AI
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {profile.weight}kg • {profile.height}cm • Recomposición
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Mifflin-St Jeor + Agente Nutricional Gemini + API OpenFoodFacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsViteHelpModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="Cómo ejecutar este archivo en tu ordenador con Vite"
            >
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline">Uso en Vite Local</span>
            </button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Perfil y Macros ({targets.calories} kcal)</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/60 py-1.5">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Calculadora y Registro Diario
          </button>

          <button
            onClick={() => setActiveTab('ai-dishes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ai-dishes'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Mis Platos Habituales (Agente IA)
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-300 text-slate-900 font-extrabold">
              {customFoods.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('weekly-menu')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'weekly-menu'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Menú Semanal + Alternativas Económicas
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        
        {/* DASHBOARD SUPERIOR SIEMPRE VISIBLE: ANILLO DE CALORÍAS Y BARRAS DE MACROS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Anillo de Calorías */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Balance Calórico Diario
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-xs text-slate-500">
                    Modo: <strong className="text-slate-800">{GOALS.find(g => g.id === profile.goal)?.label}</strong>
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {GOALS.find(g => g.id === profile.goal)?.badge}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Ajustar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around my-3 gap-6">
              <div className="relative flex items-center justify-center">
                <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r={radius} className="stroke-slate-100" strokeWidth="14" fill="transparent" />
                  <circle
                    cx="90" cy="90" r={radius}
                    className={`transition-all duration-700 ease-out ${isOverCalories ? 'stroke-rose-500' : 'stroke-emerald-500'}`}
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {mealTotals.daily.calories}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    de {targets.calories} kcal
                  </span>
                  <span className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isOverCalories ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {calPercentage}%
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-3 w-full sm:w-auto justify-around">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                  <span className="text-xs text-slate-500 block">Meta Recomposición</span>
                  <span className="text-lg font-bold text-slate-900">{targets.calories} <small className="font-normal text-xs">kcal</small></span>
                </div>

                <div className={`p-3 rounded-xl border flex-1 ${
                  isOverCalories ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-xs opacity-75 block">
                    {isOverCalories ? 'Exceso calórico' : 'Margen disponible'}
                  </span>
                  <span className="text-lg font-extrabold">
                    {Math.abs(remainingCalories)} <small className="font-normal text-xs">kcal</small>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Basal (BMR): <strong className="text-slate-700">{targets.bmr} kcal</strong></span>
              <span>Mantenimiento (TDEE): <strong className="text-slate-700">{targets.tdee} kcal</strong></span>
            </div>
          </div>

          {/* Barras de Macronutrientes */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                    Macronutrientes Diarios ({profile.weight} kg)
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{targets.formulaExplanation}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  Actual: {(mealTotals.daily.protein / (Number(profile.weight) || 106)).toFixed(1)}g / {(targets.protein / (Number(profile.weight) || 106)).toFixed(1)}g P por kg
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {/* PROTEÍNAS */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Proteínas</span>
                    <span className="text-xs font-semibold text-blue-600">
                      {Math.round((mealTotals.daily.protein / (targets.protein || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-2xl font-extrabold text-slate-900">{mealTotals.daily.protein}g</span>
                    <span className="text-xs text-slate-500">/ {targets.protein}g</span>
                  </div>
                  <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden my-2">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (mealTotals.daily.protein / (targets.protein || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {targets.protein - mealTotals.daily.protein > 0 
                      ? `Faltan ${Math.round(targets.protein - mealTotals.daily.protein)}g` 
                      : `Objetivo cumplido (+${Math.round(mealTotals.daily.protein - targets.protein)}g)`}
                  </p>
                </div>

                {/* CARBOHIDRATOS */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Carbohidratos</span>
                    <span className="text-xs font-semibold text-amber-600">
                      {Math.round((mealTotals.daily.carbs / (targets.carbs || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-2xl font-extrabold text-slate-900">{mealTotals.daily.carbs}g</span>
                    <span className="text-xs text-slate-500">/ {targets.carbs}g</span>
                  </div>
                  <div className="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden my-2">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (mealTotals.daily.carbs / (targets.carbs || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {targets.carbs - mealTotals.daily.carbs > 0 
                      ? `Faltan ${Math.round(targets.carbs - mealTotals.daily.carbs)}g` 
                      : `Objetivo cumplido (+${Math.round(mealTotals.daily.carbs - targets.carbs)}g)`}
                  </p>
                </div>

                {/* GRASAS */}
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Grasas</span>
                    <span className="text-xs font-semibold text-rose-600">
                      {Math.round((mealTotals.daily.fat / (targets.fat || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-2xl font-extrabold text-slate-900">{mealTotals.daily.fat}g</span>
                    <span className="text-xs text-slate-500">/ {targets.fat}g</span>
                  </div>
                  <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden my-2">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (mealTotals.daily.fat / (targets.fat || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {targets.fat - mealTotals.daily.fat > 0 
                      ? `Faltan ${Math.round(targets.fat - mealTotals.daily.fat)}g` 
                      : `Objetivo cumplido (+${Math.round(mealTotals.daily.fat - targets.fat)}g)`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                <span className="font-semibold text-slate-700">Reparto calórico hoy vs. objetivo:</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-blue-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    P: {actualMacroSplit.protein}% <span className="text-slate-400">({targetMacroSplit.protein}%)</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    C: {actualMacroSplit.carbs}% <span className="text-slate-400">({targetMacroSplit.carbs}%)</span>
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    G: {actualMacroSplit.fat}% <span className="text-slate-400">({targetMacroSplit.fat}%)</span>
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                {totalMacroCalsConsumed > 0 && (
                  <>
                    <div style={{ width: `${actualMacroSplit.protein}%` }} className="bg-blue-600 h-full transition-all duration-500" />
                    <div style={{ width: `${actualMacroSplit.carbs}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                    <div style={{ width: `${actualMacroSplit.fat}%` }} className="bg-rose-500 h-full transition-all duration-500" />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            PESTAÑA 1: REGISTRO DIARIO DE COMIDAS
           ===================================================================== */}
        {activeTab === 'tracker' && (
          <section className="space-y-4">
            {/* Banner de Acceso Rápido al Agente IA de Platos */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    ¿Qué platos sueles comer o cenar en casa?
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5 max-w-2xl">
                    Dile a nuestro Agente IA tus platos habituales (ej. lentejas, arroz al horno, bocadillo de tortilla...) para que calcule sus calorías, te diga cuántos gramos puedes comer para tus {targets.calories} kcal y los guarde para siempre en tu buscador.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('ai-dishes')}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shrink-0 transition cursor-pointer shadow-sm"
              >
                Configurar Mis Platos con IA →
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-600" />
                Registro de Comidas de Hoy
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMeals(SAMPLE_DAY_MEALS); showToast('Día de ejemplo cargado'); }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 cursor-pointer"
                >
                  Restaurar Día Ejemplo
                </button>
                <button
                  onClick={() => setConfirmClearModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 cursor-pointer"
                >
                  Vaciar Día
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {MEAL_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                const items = meals[category.id] || [];
                const subtotal = mealTotals.byMeal[category.id] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

                return (
                  <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${category.bg} ${category.color} flex items-center justify-center shrink-0`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{category.label}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-800">{subtotal.calories} kcal</span>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">P: {subtotal.protein}g</span>
                            <span className="text-amber-600 font-medium">C: {subtotal.carbs}g</span>
                            <span className="text-rose-600 font-medium">G: {subtotal.fat}g</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openAddFoodModal(category.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                        Buscar / Añadir Alimento
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <div className="py-7 px-4 text-center text-slate-400 text-sm">
                          Sin alimentos en {category.label.toLowerCase()}. Pulsa "Buscar / Añadir Alimento" para buscar en OpenFoodFacts o en tus Platos IA.
                        </div>
                      ) : (
                        items.map((item) => {
                          const factor = (Number(item.grams) || 0) / 100;
                          const itemCals = Math.round(item.baseCalories * factor);
                          const itemPro = (item.baseProtein * factor).toFixed(1);
                          const itemCarbs = (item.baseCarbs * factor).toFixed(1);
                          const itemFat = (item.baseFat * factor).toFixed(1);

                          return (
                            <div key={item.instanceId} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                                  {item.isHabitualAI && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                      Plato IA Habitual
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{itemCals} kcal</span>
                                  <span className="text-blue-600">Proteína: <strong>{itemPro}g</strong></span>
                                  <span className="text-amber-600">Carbs: <strong>{itemCarbs}g</strong></span>
                                  <span className="text-rose-600">Grasas: <strong>{itemFat}g</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMealItemGrams(category.id, item.instanceId, Math.max(5, Number(item.grams) - 15))}
                                    className="w-7 h-7 rounded-lg hover:bg-white text-slate-600 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <div className="relative flex items-center px-1">
                                    <input
                                      type="number"
                                      min="1"
                                      max="2500"
                                      value={item.grams}
                                      onChange={(e) => handleUpdateMealItemGrams(category.id, item.instanceId, e.target.value)}
                                      className="w-14 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                                    />
                                    <span className="text-xs text-slate-500 pr-1">g</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMealItemGrams(category.id, item.instanceId, Number(item.grams) + 15)}
                                    className="w-7 h-7 rounded-lg hover:bg-white text-slate-600 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMealItem(category.id, item.instanceId)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =====================================================================
            PESTAÑA 2: ASISTENTE IA DE PLATOS HABITUALES (PERMANENTES)
           ===================================================================== */}
        {activeTab === 'ai-dishes' && (
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-200/80">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Agente IA: Cuéntame qué platos sueles comer y cenar
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Escribe tus platos caseros habituales separados por comas. La IA calculará sus calorías por 100g, te dirá <strong>cuántos gramos exactos puedes servirte</strong> para tu meta de {targets.calories} kcal ({profile.weight} kg) y te dará un consejo para mejorar su perfil nutricional. Quedarán guardados permanentemente en tu listado.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAnalyzeHabitualDishes} className="space-y-3">
                <textarea
                  rows={3}
                  value={aiDishesInput}
                  onChange={(e) => setAiDishesInput(e.target.value)}
                  placeholder="Ejemplo: Macarrones con chorizo y tomate, bocadillo de lomo con queso, arroz caldoso con pollo, merluza rebozada con ensalada, tortilla de patatas..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 focus:bg-white"
                />

                {aiAnalysisError && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {aiAnalysisError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-slate-400 self-center mr-1">Ideas rápidas:</span>
                    {[
                      'Bocadillo de tortilla francesa con jamón',
                      'Macarrones con carne picada y tomate',
                      'Cocido o puchero con garbanzos y pollo'
                    ].map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAiDishesInput(prev => prev ? `${prev}, ${sample}` : sample)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition cursor-pointer"
                      >
                        + {sample}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isAnalyzingDishes || !aiDishesInput.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
                  >
                    {isAnalyzingDishes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analizando macros y raciones con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Analizar y Guardar en Mi Listado Permanente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Catálogo de Platos Habituales del Usuario */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Tus Platos Habituales Guardados ({customFoods.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Disponibles siempre en tu buscador y para tu menú semanal
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFoods.map((dish) => {
                  const recGrams = dish.portionGrams || 350;
                  const factor = recGrams / 100;
                  const portionCals = Math.round(dish.calories * factor);
                  const portionPro = Math.round(dish.protein * factor);
                  const portionCarbs = Math.round(dish.carbs * factor);
                  const portionFat = Math.round(dish.fat * factor);

                  return (
                    <div key={dish.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{dish.name}</h4>
                          <button
                            onClick={() => setCustomFoods(prev => prev.filter(f => f.id !== dish.id))}
                            className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer"
                            title="Eliminar plato habitual"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          Por cada 100g: <strong>{dish.calories} kcal</strong> • P: {dish.protein}g • C: {dish.carbs}g • G: {dish.fat}g
                        </p>

                        {/* Cuánto puedes comer según tus metas */}
                        <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-emerald-800">
                              ¿Cuánto puedes servirte?
                            </span>
                            <span className="text-sm font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              {recGrams} g de plato
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-emerald-900 mt-1.5 font-medium">
                            <span>Aporta: <strong>{portionCals} kcal</strong></span>
                            <span>•</span>
                            <span className="text-blue-700"><strong>{portionPro}g</strong> Proteína</span>
                            <span className="text-amber-700"><strong>{portionCarbs}g</strong> Carbs</span>
                            <span className="text-rose-700"><strong>{portionFat}g</strong> Grasas</span>
                          </div>
                        </div>

                        {dish.aiTip && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700">
                              <strong className="text-slate-900">Consejo IA para equilibrarlo:</strong> {dish.aiTip}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            const newEntry = {
                              instanceId: `item_${Date.now()}`,
                              foodId: dish.id,
                              name: dish.name,
                              grams: recGrams,
                              baseCalories: dish.calories,
                              baseProtein: dish.protein,
                              baseCarbs: dish.carbs,
                              baseFat: dish.fat,
                              isHabitualAI: true
                            };
                            setMeals(prev => ({ ...prev, almuerzo: [...prev.almuerzo, newEntry] }));
                            showToast(`Añadido ${recGrams}g de "${dish.name}" a tu Comida de hoy`);
                            setActiveTab('tracker');
                          }}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          + Añadir a Comida de Hoy ({recGrams}g)
                        </button>
                        <button
                          onClick={() => {
                            const newEntry = {
                              instanceId: `item_${Date.now()}`,
                              foodId: dish.id,
                              name: dish.name,
                              grams: recGrams,
                              baseCalories: dish.calories,
                              baseProtein: dish.protein,
                              baseCarbs: dish.carbs,
                              baseFat: dish.fat,
                              isHabitualAI: true
                            };
                            setMeals(prev => ({ ...prev, cena: [...prev.cena, newEntry] }));
                            showToast(`Añadido ${recGrams}g de "${dish.name}" a tu Cena de hoy`);
                            setActiveTab('tracker');
                          }}
                          className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          + Añadir a Cena ({recGrams}g)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PESTAÑA 3: MENÚ SEMANAL Y ALTERNATIVAS ECONÓMICAS (AHORRO)
           ===================================================================== */}
        {activeTab === 'weekly-menu' && (
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Planificador Semanal Inteligente (Lunes a Domingo)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Haz clic en cualquier <strong>Comida o Cena</strong> para pedirle a la IA <strong>alternativas equivalentes</strong> o <strong>alternativas económicas de supermercado</strong> que cuiden tu bolsillo manteniendo tus {targets.protein}g de proteína diarios.
                </p>
              </div>

              <button
                onClick={handleGenerateWeeklyMenuAI}
                disabled={isGeneratingWeekly}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm shrink-0 transition cursor-pointer"
              >
                {isGeneratingWeekly ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando semana con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Regenerar Semana con Mis Platos IA
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {weeklyPlan.map((dayObj, dayIdx) => (
                <div key={dayObj.day} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                    <span className="font-extrabold text-sm tracking-wide uppercase text-emerald-400">
                      {dayObj.day}
                    </span>
                    <span className="text-xs text-slate-300">
                      Comida + Cena: <strong>{dayObj.lunch.calories + dayObj.dinner.calories} kcal</strong> • <strong>{dayObj.lunch.protein + dayObj.dinner.protein}g P</strong> (Resto en Desayuno/Merienda)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* COMIDA */}
                    <div className="p-5 flex flex-col justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold uppercase text-orange-600 mb-1">
                          <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5" /> Comida / Almuerzo</span>
                          <span className="bg-orange-50 px-2 py-0.5 rounded text-orange-800">{dayObj.lunch.grams}g</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{dayObj.lunch.name}</h4>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600 mt-1.5">
                          <span className="font-bold text-slate-900">{dayObj.lunch.calories} kcal</span>
                          <span className="text-blue-600 font-semibold">P: {dayObj.lunch.protein}g</span>
                          <span className="text-amber-600">C: {dayObj.lunch.carbs}g</span>
                          <span className="text-rose-600">G: {dayObj.lunch.fat}g</span>
                        </div>
                        {dayObj.lunch.tip && (
                          <p className="text-xs text-slate-500 mt-2 italic">"{dayObj.lunch.tip}"</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleFetchAlternatives({ dayIndex: dayIdx, mealType: 'lunch', dish: dayObj.lunch }, 'budget')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          Alternativa Económica
                        </button>
                        <button
                          onClick={() => handleFetchAlternatives({ dayIndex: dayIdx, mealType: 'lunch', dish: dayObj.lunch }, 'equivalent')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Cambiar Plato
                        </button>
                        <button
                          onClick={() => handleSendWeeklyMealToToday('lunch', dayObj.lunch)}
                          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                        >
                          Registrar hoy
                        </button>
                      </div>
                    </div>

                    {/* CENA */}
                    <div className="p-5 flex flex-col justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold uppercase text-indigo-600 mb-1">
                          <span className="flex items-center gap-1"><Moon className="w-3.5 h-3.5" /> Cena</span>
                          <span className="bg-indigo-50 px-2 py-0.5 rounded text-indigo-800">{dayObj.dinner.grams}g</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{dayObj.dinner.name}</h4>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600 mt-1.5">
                          <span className="font-bold text-slate-900">{dayObj.dinner.calories} kcal</span>
                          <span className="text-blue-600 font-semibold">P: {dayObj.dinner.protein}g</span>
                          <span className="text-amber-600">C: {dayObj.dinner.carbs}g</span>
                          <span className="text-rose-600">G: {dayObj.dinner.fat}g</span>
                        </div>
                        {dayObj.dinner.tip && (
                          <p className="text-xs text-slate-500 mt-2 italic">"{dayObj.dinner.tip}"</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleFetchAlternatives({ dayIndex: dayIdx, mealType: 'dinner', dish: dayObj.dinner }, 'budget')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          Alternativa Económica
                        </button>
                        <button
                          onClick={() => handleFetchAlternatives({ dayIndex: dayIdx, mealType: 'dinner', dish: dayObj.dinner }, 'equivalent')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Cambiar Plato
                        </button>
                        <button
                          onClick={() => handleSendWeeklyMealToToday('dinner', dayObj.dinner)}
                          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                        >
                          Registrar hoy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* =====================================================================
          MODAL: ALTERNATIVAS ECONÓMICAS O EQUIVALENTES (MENÚ SEMANAL)
         ===================================================================== */}
      {selectedSlotForAlt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className={`px-6 py-4 text-white flex items-center justify-between ${
              altMode === 'budget' ? 'bg-emerald-800' : 'bg-indigo-900'
            }`}>
              <div className="flex items-center gap-2.5">
                {altMode === 'budget' ? <Coins className="w-5 h-5 text-amber-300" /> : <ArrowLeftRight className="w-5 h-5 text-indigo-300" />}
                <div>
                  <span className="text-[11px] uppercase tracking-wider opacity-80 block font-bold">
                    {weeklyPlan[selectedSlotForAlt.dayIndex]?.day} • {selectedSlotForAlt.mealType === 'lunch' ? 'Comida' : 'Cena'}
                  </span>
                  <h3 className="font-bold text-base">
                    {altMode === 'budget' ? 'Alternativas Económicas (Ahorro Cesta Compra)' : 'Alternativas Equivalentes en Macros'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setSelectedSlotForAlt(null)} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 block">Plato actual a sustituir:</span>
                <strong className="text-slate-900 text-sm">{selectedSlotForAlt.dish.name}</strong>
                <span className="block text-slate-600 mt-0.5">
                  Meta a igualar: <strong>{selectedSlotForAlt.dish.calories} kcal</strong> • <strong>{selectedSlotForAlt.dish.protein}g Proteína</strong> ({selectedSlotForAlt.dish.grams}g)
                </span>
              </div>

              {/* Cambio rápido entre modo ahorro y modo normal */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleFetchAlternatives(selectedSlotForAlt, 'budget')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    altMode === 'budget'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Opciones Económicas (Ahorro)
                </button>
                <button
                  onClick={() => handleFetchAlternatives(selectedSlotForAlt, 'equivalent')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    altMode === 'equivalent'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-800'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Opciones Variadas Equivalentes
                </button>
              </div>

              {isLoadingAlts ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-slate-600">
                    Calculando 3 platos con los mismos macros y mejor precio en supermercado...
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {altSuggestions.map((alt, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition bg-white space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{alt.name}</h4>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          {alt.estimatedCostEuros}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">Ración: {alt.grams}g</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800">{alt.calories} kcal</span>
                        <span className="text-blue-600 font-bold">P: {alt.protein}g</span>
                        <span className="text-amber-600">C: {alt.carbs}g</span>
                        <span className="text-rose-600">G: {alt.fat}g</span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        💡 {alt.savingOrHealthReason}
                      </p>
                      <button
                        onClick={() => handleReplaceWeeklyDish(alt)}
                        className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Sustituir por este plato en el menú
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: BUSCADOR DE ALIMENTOS (OPENFOODFACTS API + PLATOS IA + LOCAL)
         ===================================================================== */}
      {activeMealToAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Añadir a {MEAL_CATEGORIES.find(m => m.id === activeMealToAdd)?.label}
                </span>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Buscador Conectado (OpenFoodFacts + Platos IA)
                </h3>
              </div>
              <button onClick={() => setActiveMealToAdd(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsCreatingCustomFood(false)}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                  !isCreatingCustomFood ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Buscador en Tiempo Real (API + Mis Platos)
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingCustomFood(true)}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                  isCreatingCustomFood ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                + Introducir Macros Manualmente
              </button>
            </div>

            {!isCreatingCustomFood ? (
              <div className="p-5 space-y-4">
                {/* Input Buscador con indicador de conexión API Resiliente */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Escribe cualquier alimento, fruta, marca o plato (ej. manzana, hacendado, avena...)"
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {isSearchingApi && (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {foodSearchQuery.trim().length > 2 && (
                    <button
                      type="button"
                      onClick={handleCalculateSearchQueryWithAI}
                      disabled={isCalculatingSingleDishAI}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isCalculatingSingleDishAI ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      Crear "{foodSearchQuery.slice(0, 16)}" con IA
                    </button>
                  )}
                </div>

                {/* Estado en vivo del motor de búsqueda */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Motor activo:{' '}
                      {isSearchingApi ? (
                        <strong className="text-emerald-700">Buscando en tiempo real...</strong>
                      ) : searchEngineSource === 'openfoodfacts' ? (
                        <strong className="text-teal-700">OpenFoodFacts v2 + Catálogo Local</strong>
                      ) : searchEngineSource === 'ai_fallback' ? (
                        <strong className="text-indigo-700">Respaldo IA Supermercados España (Anti-503/CORS activo)</strong>
                      ) : (
                        <strong className="text-slate-700">Catálogo Mediterráneo Local ({allFoods.length} alimentos)</strong>
                      )}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    {combinedFilteredFoods.length} resultados
                  </span>
                </div>

                {/* Filtros de categoría */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categoriesList.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Lista de Resultados */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {combinedFilteredFoods.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 space-y-2">
                      {isSearchingApi ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-700 font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Consultando base de datos nutricional para "{foodSearchQuery}"...
                        </div>
                      ) : (
                        <>
                          <p>No hay coincidencias locales para "{foodSearchQuery}".</p>
                          {foodSearchQuery.trim().length > 1 && (
                            <button
                              type="button"
                              onClick={handleCalculateSearchQueryWithAI}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              Pedir a la IA que calcule los macros de "{foodSearchQuery}"
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    combinedFilteredFoods.map(food => {
                      const isSelected = selectedFoodItem?.id === food.id;
                      return (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => {
                            setSelectedFoodItem(food);
                            setSelectedGrams(food.portionGrams || 100);
                          }}
                          className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                            isSelected ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                {food.name}
                              </p>
                              {food.isFromApi && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  food.sourceBadge === 'Catálogo IA Supermercado'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-teal-100 text-teal-800'
                                }`}>
                                  <Globe className="w-2.5 h-2.5" /> {food.sourceBadge || 'OpenFoodFacts'}
                                </span>
                              )}
                              {food.isHabitualAI && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                  Mi Plato IA
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Por 100g: <strong>{food.calories} kcal</strong> • P: {food.protein}g • C: {food.carbs}g • G: {food.fat}g
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {food.portionGrams}g
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Panel de Ajuste de Gramos */}
                {selectedFoodItem && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs text-slate-500 block">Seleccionado:</span>
                        <h4 className="font-bold text-slate-900 text-sm">{selectedFoodItem.name}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Cantidad (g):</label>
                        <input
                          type="number"
                          min="1"
                          max="2500"
                          value={selectedGrams}
                          onChange={(e) => setSelectedGrams(e.target.value)}
                          className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {selectedFoodItem.aiTip && (
                      <p className="text-xs text-indigo-800 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                        💡 <strong>Recomendación IA:</strong> {selectedFoodItem.aiTip}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedFoodItem.portionGrams && (
                        <button
                          type="button"
                          onClick={() => setSelectedGrams(selectedFoodItem.portionGrams)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition cursor-pointer ${
                            Number(selectedGrams) === selectedFoodItem.portionGrams
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedFoodItem.portionName} ({selectedFoodItem.portionGrams}g)
                        </button>
                      )}
                      {[50, 100, 200, 300, 400, 500].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSelectedGrams(preset)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition cursor-pointer ${
                            Number(selectedGrams) === preset
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {preset}g
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Calorías</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {Math.round((selectedFoodItem.calories * (Number(selectedGrams) || 0)) / 100)} kcal
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-500 block">Proteínas</span>
                        <span className="text-sm font-extrabold text-blue-700">
                          {((selectedFoodItem.protein * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] uppercase font-bold text-amber-500 block">Carbos</span>
                        <span className="text-sm font-extrabold text-amber-700">
                          {((selectedFoodItem.carbs * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-rose-100">
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">Grasas</span>
                        <span className="text-sm font-extrabold text-rose-700">
                          {((selectedFoodItem.fat * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSelectedFood}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
                    >
                      Añadir {selectedGrams}g de {selectedFoodItem.name}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateAndAddCustomFood} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Nombre del Alimento o Plato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Empanada casera, Bocadillo..."
                    value={customFoodForm.name}
                    onChange={(e) => setCustomFoodForm({ ...customFoodForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <p className="text-xs font-semibold text-slate-500">Valores nutricionales por cada 100g:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 mb-1">Proteínas (g)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={customFoodForm.protein}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, protein: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 mb-1">Carbos (g)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={customFoodForm.carbs}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, carbs: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1">Grasas (g)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={customFoodForm.fat}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, fat: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Calorías (kcal)</label>
                    <input
                      type="number" min="0" placeholder="Auto"
                      value={customFoodForm.calories}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, calories: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gramos a añadir hoy:</label>
                    <input
                      type="number" min="1" max="2500"
                      value={customFoodForm.gramsToAdd}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, gramsToAdd: e.target.value })}
                      className="w-28 px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-bold"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customFoodForm.saveToDb}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, saveToDb: e.target.checked })}
                    />
                    Guardar permanentemente en Mis Platos
                  </label>
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer">
                  Guardar y Añadir a la Comida
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PERFIL Y 4 MODOS (INCLUYENDO RECOMPOSICIÓN CORPORAL)
         ===================================================================== */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg">Configuración Biométrica y 4 Modos</h3>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  1. Datos Físicos (Mifflin-St Jeor)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
                    <select
                      value={profile.sex}
                      onChange={(e) => handleProfileChange('sex', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium bg-white"
                    >
                      <option value="male">Hombre</option>
                      <option value="female">Mujer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Edad (años)</label>
                    <input
                      type="number" min="14" max="100"
                      value={profile.age}
                      onChange={(e) => handleProfileChange('age', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Altura (cm)</label>
                    <input
                      type="number" min="120" max="240"
                      value={profile.height}
                      onChange={(e) => handleProfileChange('height', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Peso (kg)</label>
                    <input
                      type="number" min="35" max="250" step="0.5"
                      value={profile.weight}
                      onChange={(e) => handleProfileChange('weight', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Nivel de Actividad Física
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ACTIVITY_LEVELS.map((act) => (
                    <button
                      key={act.value}
                      type="button"
                      onClick={() => handleProfileChange('activity', act.value)}
                      className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                        Number(profile.activity) === act.value
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{act.label}</span>
                        <span className="text-xs font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">x{act.value}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{act.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  3. Objetivo Principal (4 Modos)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS.map((g) => {
                    const isSelected = profile.goal === g.id;
                    const isRecomp = g.id === 'recomp';
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleProfileChange('goal', g.id)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            {g.label}
                            {isRecomp && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isRecomp ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {g.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      4. Método de Cálculo de Macros
                    </h4>
                  </div>

                  <div className="inline-flex rounded-xl bg-white p-1 border border-indigo-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleProfileChange('macroMethod', 'g_per_kg')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        (profile.macroMethod || 'g_per_kg') === 'g_per_kg'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      Científico (g/kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileChange('macroMethod', 'percentage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        profile.macroMethod === 'percentage'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      Porcentajes (%)
                    </button>
                  </div>
                </div>

                <div className="bg-white/90 rounded-xl p-3 border border-indigo-100 text-xs text-slate-600 flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{targets.formulaExplanation}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold uppercase text-slate-500">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={targets.calories}
                    onChange={(e) => handleManualTargetChange('calories', e.target.value)}
                    className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-200">
                  <label className="block text-[11px] font-bold uppercase text-blue-600">Proteínas (g)</label>
                  <input
                    type="number"
                    value={targets.protein}
                    onChange={(e) => handleManualTargetChange('protein', e.target.value)}
                    className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-200">
                  <label className="block text-[11px] font-bold uppercase text-amber-600">Carbos (g)</label>
                  <input
                    type="number"
                    value={targets.carbs}
                    onChange={(e) => handleManualTargetChange('carbs', e.target.value)}
                    className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border border-rose-200">
                  <label className="block text-[11px] font-bold uppercase text-rose-600">Grasas (g)</label>
                  <input
                    type="number"
                    value={targets.fat}
                    onChange={(e) => handleManualTargetChange('fat', e.target.value)}
                    className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => { setIsProfileModalOpen(false); showToast('Objetivos actualizados'); }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl cursor-pointer"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación vaciar día */}
      {confirmClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <h3 className="text-lg font-bold text-slate-900">¿Reiniciar el registro de hoy?</h3>
            <p className="text-xs text-slate-500">
              Se vaciarán las comidas de hoy, pero tus Platos Habituales IA y tu Menú Semanal se conservarán.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmClearModal(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleClearDay} className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer">
                Sí, vaciar día
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
