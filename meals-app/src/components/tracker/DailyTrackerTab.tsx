import React from 'react';
import { Utensils, Sparkles } from 'lucide-react';
import type { DailyMeals, MealCategory, MacroTargets, MealTotalsResult } from '../../types/nutrition';
import { MealCategoryCard } from './MealCategoryCard';

interface DailyTrackerTabProps {
  meals: DailyMeals;
  mealCategories: MealCategory[];
  targets: MacroTargets;
  mealTotals: MealTotalsResult;
  onOpenAddModal: (mealId: string) => void;
  onUpdateGrams: (mealId: string, instanceId: string, grams: string | number) => void;
  onRemoveItem: (mealId: string, instanceId: string) => void;
  onRestoreSampleDay: () => void;
  onOpenConfirmClear: () => void;
  onGoToAiDishes: () => void;
}

export const DailyTrackerTab: React.FC<DailyTrackerTabProps> = ({
  meals,
  mealCategories,
  targets,
  mealTotals,
  onOpenAddModal,
  onUpdateGrams,
  onRemoveItem,
  onRestoreSampleDay,
  onOpenConfirmClear,
  onGoToAiDishes,
}) => {
  return (
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
          onClick={onGoToAiDishes}
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
            onClick={onRestoreSampleDay}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 cursor-pointer"
          >
            Restaurar Día Ejemplo
          </button>
          <button
            onClick={onOpenConfirmClear}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 cursor-pointer"
          >
            Vaciar Día
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {mealCategories.map((category) => {
          const items = meals[category.id] || [];
          const subtotal = mealTotals.byMeal[category.id] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

          return (
            <MealCategoryCard
              key={category.id}
              category={category}
              items={items}
              subtotal={subtotal}
              onOpenAddModal={onOpenAddModal}
              onUpdateGrams={onUpdateGrams}
              onRemoveItem={onRemoveItem}
            />
          );
        })}
      </div>
    </section>
  );
};
