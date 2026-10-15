import React from 'react';
import { Trash2 } from 'lucide-react';
import type { MealItem } from '../../types/nutrition';

interface MealItemRowProps {
  item: MealItem;
  categoryMealId: string;
  onUpdateGrams: (mealId: string, instanceId: string, grams: string | number) => void;
  onRemoveItem: (mealId: string, instanceId: string) => void;
}

export const MealItemRow: React.FC<MealItemRowProps> = ({
  item,
  categoryMealId,
  onUpdateGrams,
  onRemoveItem,
}) => {
  const factor = (Number(item.grams) || 0) / 100;
  const itemCals = Math.round(item.baseCalories * factor);
  const itemPro = (item.baseProtein * factor).toFixed(1);
  const itemCarbs = (item.baseCarbs * factor).toFixed(1);
  const itemFat = (item.baseFat * factor).toFixed(1);

  return (
    <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
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
            onClick={() => onUpdateGrams(categoryMealId, item.instanceId, Math.max(5, Number(item.grams) - 15))}
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
              onChange={(e) => onUpdateGrams(categoryMealId, item.instanceId, e.target.value)}
              className="w-14 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
            />
            <span className="text-xs text-slate-500 pr-1">g</span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateGrams(categoryMealId, item.instanceId, Number(item.grams) + 15)}
            className="w-7 h-7 rounded-lg hover:bg-white text-slate-600 font-bold text-sm flex items-center justify-center transition cursor-pointer"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemoveItem(categoryMealId, item.instanceId)}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
