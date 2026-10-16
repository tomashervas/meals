import React from 'react';
import { X, Coins, ArrowLeftRight, Loader2 } from 'lucide-react';
import type {
  WeeklyDayPlan,
  SelectedSlotForAlt,
  AlternativeDish,
  AltMode,
} from '../../types/nutrition';

interface AlternativesModalProps {
  selectedSlot: SelectedSlotForAlt | null;
  weeklyPlan: WeeklyDayPlan[];
  altMode: AltMode | null;
  altSuggestions: AlternativeDish[];
  isLoadingAlts: boolean;
  onClose: () => void;
  onFetchAlternatives: (slot: SelectedSlotForAlt, mode: AltMode) => void;
  onReplaceDish: (alt: AlternativeDish) => void;
}

export const AlternativesModal: React.FC<AlternativesModalProps> = ({
  selectedSlot,
  weeklyPlan,
  altMode,
  altSuggestions,
  isLoadingAlts,
  onClose,
  onFetchAlternatives,
  onReplaceDish,
}) => {
  if (!selectedSlot) return null;

  const currentDay = weeklyPlan[selectedSlot.dayIndex]?.day;
  const mealName = selectedSlot.mealType === 'lunch' ? 'Comida' : 'Cena';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        <div
          className={`px-4 py-3 sm:px-6 sm:py-4 text-white flex items-center justify-between shrink-0 sticky top-0 z-20 ${
            altMode === 'budget' ? 'bg-emerald-800' : 'bg-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {altMode === 'budget' ? (
              <Coins className="w-5 h-5 text-amber-300 shrink-0" />
            ) : (
              <ArrowLeftRight className="w-5 h-5 text-indigo-300 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider opacity-80 block font-bold truncate">
                {currentDay} • {mealName}
              </span>
              <h3 className="font-bold text-sm sm:text-base truncate">
                {altMode === 'budget'
                  ? 'Alternativas Económicas (Ahorro)'
                  : 'Alternativas Equivalentes en Macros'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 block">Plato actual a sustituir:</span>
            <strong className="text-slate-900 text-sm">{selectedSlot.dish.name}</strong>
            <span className="block text-slate-600 mt-0.5">
              Meta a igualar: <strong>{selectedSlot.dish.calories} kcal</strong> •{' '}
              <strong>{selectedSlot.dish.protein}g Proteína</strong> ({selectedSlot.dish.grams}g)
            </span>
          </div>

          {/* Cambio rápido entre modo ahorro y modo normal */}
          <div className="flex gap-2">
            <button
              onClick={() => onFetchAlternatives(selectedSlot, 'budget')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                altMode === 'budget'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Opciones Económicas (Ahorro)
            </button>
            <button
              onClick={() => onFetchAlternatives(selectedSlot, 'equivalent')}
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
            <div className="space-y-3">
              {altSuggestions.map((alt, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition bg-white space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{alt.name}</h4>
                    {alt.estimatedCostEuros && (
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        {alt.estimatedCostEuros}
                      </span>
                    )}
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
                    onClick={() => onReplaceDish(alt)}
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
  );
};
