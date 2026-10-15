import type { FoodItem, SearchEngineSource } from '../types/nutrition';
import { callGeminiStructured } from './gemini';

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

// --- MOTOR DE BÚSQUEDA MULTICAPA (Proxy Local Vite -> OpenFoodFacts .net con CORS -> Respaldo IA) ---
export async function fetchOpenFoodFactsResilient(
  query: string
): Promise<{ items: FoodItem[]; source: SearchEngineSource }> {
  const cleanQuery = encodeURIComponent(query.trim());
  const queryString = `search_terms=${cleanQuery}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,product_name_es,brands,nutriments,serving_size`;

  const endpointsToTry: Array<{ url: string; label: string }> = [];

  // En entorno local Vite, usar el proxy del servidor de desarrollo (elimina CORS y añade User-Agent)
  if (import.meta.env.DEV) {
    endpointsToTry.push({
      url: `/api/openfoodfacts/cgi/search.pl?${queryString}`,
      label: 'Vite Local Proxy'
    });
  }

  // Instancias .net de OpenFoodFacts (con cabeceras CORS access-control-allow-origin: * habilitadas)
  endpointsToTry.push(
    {
      url: `https://es.openfoodfacts.net/cgi/search.pl?${queryString}`,
      label: 'OpenFoodFacts España (.net CORS)'
    },
    {
      url: `https://world.openfoodfacts.net/cgi/search.pl?${queryString}`,
      label: 'OpenFoodFacts Mundial (.net CORS)'
    },
    {
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://es.openfoodfacts.net/cgi/search.pl?${queryString}`)}`,
      label: 'CORS Fallback Proxy'
    }
  );

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        const parsed: FoodItem[] = (data.products as OpenFoodFactsProduct[])
          .filter((p) => (p.product_name_es || p.product_name) && p.nutriments)
          .map((p, idx: number): FoodItem => {
            const n = p.nutriments ?? {};
            const rawKcal = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) || 0;
            const rawKj = Number(n['energy_100g'] ?? n['energy'] ?? 0) || 0;
            const pro = Math.round((Number(n.proteins_100g ?? n.proteins ?? 0) || 0) * 10) / 10;
            const carbs = Math.round((Number(n.carbohydrates_100g ?? n.carbohydrates ?? 0) || 0) * 10) / 10;
            const fat = Math.round((Number(n.fat_100g ?? n.fat ?? 0) || 0) * 10) / 10;
            const cals = Math.round(rawKcal || (rawKj ? rawKj / 4.184 : (pro * 4 + carbs * 4 + fat * 9)));

            const baseName = p.product_name_es || p.product_name || 'Alimento';
            const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';

            return {
              id: `off_${p.code || idx}_${Date.now()}`,
              name: `${baseName}${brand}`,
              calories: cals,
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
          .filter((item: FoodItem) => item.calories > 0 || item.protein > 0 || item.carbs > 0);

        if (parsed.length > 0) {
          return { items: parsed, source: 'openfoodfacts' };
        }
      }
    } catch {
      clearTimeout(timeoutId);
      // Continuar al siguiente endpoint disponible
    }
  }

  // Etapa 3: Respaldo inteligente con Gemini en caso de fallo o bloqueo de red
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

  try {
    const aiItems = await callGeminiStructured<Array<{
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      portionName?: string;
      portionGrams?: number;
    }>>(
      sys,
      `Busca alimentos o productos en España para el término: "${query}"`,
      schema
    );

    const mappedAi: FoodItem[] = (Array.isArray(aiItems) ? aiItems : []).map((item, idx) => ({
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

    if (mappedAi.length > 0) {
      return { items: mappedAi, source: 'ai_fallback' };
    }
  } catch {
    // Si la llamada de respaldo también fallara, devuelve lista vacía local
  }

  return { items: [], source: 'local' };
}
