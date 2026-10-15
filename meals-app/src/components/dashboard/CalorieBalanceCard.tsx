import React from 'react';
import { Target, Edit3 } from 'lucide-react';
import type { UserProfile, MacroTargets } from '../../types/nutrition';
import { GOALS } from '../../constants/initialData';

interface CalorieBalanceCardProps {
  profile: UserProfile;
  targets: MacroTargets;
  dailyCalories: number;
  onOpenProfile: () => void;
}

export const CalorieBalanceCard: React.FC<CalorieBalanceCardProps> = ({
  profile,
  targets,
  dailyCalories,
  onOpenProfile,
}) => {
  const currentGoal = GOALS.find(g => g.id === profile.goal);
  const calPercentage = Math.min(100, Math.round((dailyCalories / (targets.calories || 1)) * 100));
  const remainingCalories = targets.calories - dailyCalories;
  const isOverCalories = remainingCalories < 0;

  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercentage / 100) * circumference;

  return (
    <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Balance Calórico Diario
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-500">
              Modo: <strong className="text-slate-800">{currentGoal?.label}</strong>
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentGoal?.badge}
            </span>
          </div>
        </div>
        <button
          onClick={onOpenProfile}
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
              {dailyCalories}
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
  );
};
