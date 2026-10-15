import React from 'react';
import { Sun, Moon, Coins, ArrowLeftRight } from 'lucide-react';
import type { WeeklyMealDish, AltMode, SelectedSlotForAlt } from '../../types/nutrition';

interface WeeklyMealSlotProps {
  dayIndex: number;
  mealType: 'lunch' | 'dinner';
  dish: WeeklyMealDish;
  onFetchAlternatives: (slot: SelectedSlotForAlt, mode: AltMode) => void;
  onSendMealToToday: (mealType: 'lunch' | 'dinner', dish: WeeklyMealDish) => void;
}

export const WeeklyMealSlot: React.FC<WeeklyMealSlotProps> = ({
  dayIndex,
  mealType,
  dish,
  onFetchAlternatives,
  onSendMealToToday,
}) => {
  const isLunch = mealType === 'lunch';
  const IconComponent = isLunch ? Sun : Moon;
  const colorClass = isLunch ? 'text-orange-600' : 'text-indigo-600';
  const badgeClass = isLunch ? 'bg-orange-50 text-orange-800' : 'bg-indigo-50 text-indigo-800';
  const label = isLunch ? 'Comida / Almuerzo' : 'Cena';

  return (
    <div className="p-5 flex flex-col justify-between gap-3 hover:bg-slate-50/70 transition">
      <div>
        <div className={`flex items-center justify-between text-xs font-bold uppercase ${colorClass} mb-1`}>
          <span className="flex items-center gap-1">
            <IconComponent className="w-3.5 h-3.5" /> {label}
          </span>
          <span className={`px-2 py-0.5 rounded ${badgeClass}`}>{dish.grams}g</span>
        </div>
        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{dish.name}</h4>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 mt-1.5">
          <span className="font-bold text-slate-900">{dish.calories} kcal</span>
          <span className="text-blue-600 font-semibold">P: {dish.protein}g</span>
          <span className="text-amber-600">C: {dish.carbs}g</span>
          <span className="text-rose-600">G: {dish.fat}g</span>
        </div>
        {dish.tip && (
          <p className="text-xs text-slate-500 mt-2 italic">"{dish.tip}"</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onFetchAlternatives({ dayIndex, mealType, dish }, 'budget')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
        >
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          Alternativa Económica
        </button>
        <button
          onClick={() => onFetchAlternatives({ dayIndex, mealType, dish }, 'equivalent')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Cambiar Plato
        </button>
        <button
          onClick={() => onSendMealToToday(mealType, dish)}
          className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-900 underline cursor-pointer"
        >
          Registrar hoy
        </button>
      </div>
    </div>
  );
};
