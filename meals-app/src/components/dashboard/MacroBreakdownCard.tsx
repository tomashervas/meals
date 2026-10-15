import React from 'react';
import { PieChart, Info } from 'lucide-react';
import type { UserProfile, MacroTargets, MacroTotals } from '../../types/nutrition';
import { calculateActualMacroSplit, calculateTargetMacroSplit } from '../../utils/calculations';

interface MacroBreakdownCardProps {
  profile: UserProfile;
  targets: MacroTargets;
  dailyTotals: MacroTotals;
}

export const MacroBreakdownCard: React.FC<MacroBreakdownCardProps> = ({
  profile,
  targets,
  dailyTotals,
}) => {
  const actualMacroSplit = calculateActualMacroSplit(dailyTotals);
  const targetMacroSplit = calculateTargetMacroSplit(targets);
  const totalMacroCalsConsumed = (dailyTotals.protein * 4) + (dailyTotals.carbs * 4) + (dailyTotals.fat * 9);
  const userWeight = Number(profile.weight) || 106;

  return (
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
            Actual: {(dailyTotals.protein / userWeight).toFixed(1)}g / {(targets.protein / userWeight).toFixed(1)}g P por kg
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* PROTEÍNAS */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Proteínas</span>
              <span className="text-xs font-semibold text-blue-600">
                {Math.round((dailyTotals.protein / (targets.protein || 1)) * 100)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-extrabold text-slate-900">{dailyTotals.protein}g</span>
              <span className="text-xs text-slate-500">/ {targets.protein}g</span>
            </div>
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (dailyTotals.protein / (targets.protein || 1)) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {targets.protein - dailyTotals.protein > 0
                ? `Faltan ${Math.round(targets.protein - dailyTotals.protein)}g`
                : `Objetivo cumplido (+${Math.round(dailyTotals.protein - targets.protein)}g)`}
            </p>
          </div>

          {/* CARBOHIDRATOS */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Carbohidratos</span>
              <span className="text-xs font-semibold text-amber-600">
                {Math.round((dailyTotals.carbs / (targets.carbs || 1)) * 100)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-extrabold text-slate-900">{dailyTotals.carbs}g</span>
              <span className="text-xs text-slate-500">/ {targets.carbs}g</span>
            </div>
            <div className="w-full h-2.5 bg-amber-100 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (dailyTotals.carbs / (targets.carbs || 1)) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {targets.carbs - dailyTotals.carbs > 0
                ? `Faltan ${Math.round(targets.carbs - dailyTotals.carbs)}g`
                : `Objetivo cumplido (+${Math.round(dailyTotals.carbs - targets.carbs)}g)`}
            </p>
          </div>

          {/* GRASAS */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Grasas</span>
              <span className="text-xs font-semibold text-rose-600">
                {Math.round((dailyTotals.fat / (targets.fat || 1)) * 100)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-extrabold text-slate-900">{dailyTotals.fat}g</span>
              <span className="text-xs text-slate-500">/ {targets.fat}g</span>
            </div>
            <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (dailyTotals.fat / (targets.fat || 1)) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {targets.fat - dailyTotals.fat > 0
                ? `Faltan ${Math.round(targets.fat - dailyTotals.fat)}g`
                : `Objetivo cumplido (+${Math.round(dailyTotals.fat - targets.fat)}g)`}
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
  );
};
