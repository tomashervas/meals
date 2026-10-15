import React from 'react';
import { Calendar, Loader2, Sparkles } from 'lucide-react';
import type {
  WeeklyDayPlan,
  WeeklyMealDish,
  MacroTargets,
  AltMode,
  SelectedSlotForAlt,
} from '../../types/nutrition';
import { WeeklyDayCard } from './WeeklyDayCard';

interface WeeklyMenuTabProps {
  weeklyPlan: WeeklyDayPlan[];
  targets: MacroTargets;
  isGeneratingWeekly: boolean;
  onGenerateWeeklyMenu: () => void;
  onFetchAlternatives: (slot: SelectedSlotForAlt, mode: AltMode) => void;
  onSendMealToToday: (mealType: 'lunch' | 'dinner', dish: WeeklyMealDish) => void;
}

export const WeeklyMenuTab: React.FC<WeeklyMenuTabProps> = ({
  weeklyPlan,
  targets,
  isGeneratingWeekly,
  onGenerateWeeklyMenu,
  onFetchAlternatives,
  onSendMealToToday,
}) => {
  return (
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
          onClick={onGenerateWeeklyMenu}
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
        {weeklyPlan.map((dayPlan, dayIdx) => (
          <WeeklyDayCard
            key={dayPlan.day}
            dayPlan={dayPlan}
            dayIndex={dayIdx}
            onFetchAlternatives={onFetchAlternatives}
            onSendMealToToday={onSendMealToToday}
          />
        ))}
      </div>
    </section>
  );
};
