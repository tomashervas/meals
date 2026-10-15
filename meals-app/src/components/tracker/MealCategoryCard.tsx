import React from 'react';
import { Search } from 'lucide-react';
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
          onClick={() => onOpenAddModal(category.id)}
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
