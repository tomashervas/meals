import React from 'react';
import { Search, Plus } from 'lucide-react';
import type { MealCategory, MealItem, MacroTotals } from '../../types/nutrition';
import { MealItemRow } from './MealItemRow';

interface MealCategoryCardProps {
  category: MealCategory;
  items: MealItem[];
  subtotal: MacroTotals;
  onOpenAddModal: (mealId: string) => void;
  onUpdateGrams: (mealId: string, instanceId: string, grams: string | number) => void;
  onRemoveItem: (mealId: string, instanceId: string) => void;
}

export const MealCategoryCard: React.FC<MealCategoryCardProps> = ({
  category,
  items,
  subtotal,
  onOpenAddModal,
  onUpdateGrams,
  onRemoveItem,
}) => {
  const IconComponent = category.icon;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="px-3.5 sm:px-5 py-3 sm:py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${category.bg} ${category.color} flex items-center justify-center shrink-0`}>
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{category.label}</h3>
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-800">{subtotal.calories} kcal</span>
              <span>•</span>
              <span className="text-blue-600 font-medium">P: {subtotal.protein}g</span>
              <span className="text-amber-600 font-medium">C: {subtotal.carbs}g</span>
              <span className="text-rose-600 font-medium">G: {subtotal.fat}g</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenAddModal(category.id)}
          title="Buscar / Añadir Alimento"
          aria-label={`Buscar o añadir alimento a ${category.label}`}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer shrink-0"
        >
          <Search className="w-4 h-4 shrink-0" />
          <Plus className="w-3.5 h-3.5 shrink-0 sm:hidden" />
          <span className="hidden sm:inline">Buscar / Añadir Alimento</span>
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="py-7 px-4 text-center text-slate-400 text-sm">
            Sin alimentos en {category.label.toLowerCase()}. Pulsa "Buscar / Añadir Alimento" para buscar en OpenFoodFacts o en tus Platos IA.
          </div>
        ) : (
          items.map((item) => (
            <MealItemRow
              key={item.instanceId}
              item={item}
              categoryMealId={category.id}
              onUpdateGrams={onUpdateGrams}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>
    </div>
  );
};
