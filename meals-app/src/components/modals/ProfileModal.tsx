import React from 'react';
import {
  Activity,
  X,
  Sparkles,
  Scale,
  Award,
} from 'lucide-react';
import type { UserProfile, MacroTargets } from '../../types/nutrition';
import { ACTIVITY_LEVELS, GOALS } from '../../constants/initialData';

interface ProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  targets: MacroTargets;
  onProfileChange: (field: keyof UserProfile, value: UserProfile[keyof UserProfile]) => void;
  onManualTargetChange: (field: 'calories' | 'protein' | 'carbs' | 'fat', value: string | number) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  profile,
  targets,
  onProfileChange,
  onManualTargetChange,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="font-bold text-base sm:text-lg truncate">Configuración Biométrica y 4 Modos</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Datos Físicos (Mifflin-St Jeor)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
                <select
                  value={profile.sex}
                  onChange={(e) => onProfileChange('sex', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium bg-white"
                >
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Edad (años)</label>
                <input
                  type="number"
                  min="14"
                  max="100"
                  value={profile.age}
                  onChange={(e) => onProfileChange('age', Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Altura (cm)</label>
                <input
                  type="number"
                  min="120"
                  max="240"
                  value={profile.height}
                  onChange={(e) => onProfileChange('height', Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  min="35"
                  max="250"
                  step="0.5"
                  value={profile.weight}
                  onChange={(e) => onProfileChange('weight', Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              2. Nivel de Actividad Física
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACTIVITY_LEVELS.map((act) => (
                <button
                  key={act.value}
                  type="button"
                  onClick={() => onProfileChange('activity', act.value)}
                  className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                    Number(profile.activity) === act.value
                      ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{act.label}</span>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      x{act.value}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{act.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              3. Objetivo Principal (4 Modos)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOALS.map((g) => {
                const isSelected = profile.goal === g.id;
                const isRecomp = g.id === 'recomp';
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onProfileChange('goal', g.id)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        {g.label}
                        {isRecomp && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isRecomp ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {g.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  4. Método de Cálculo de Macros
                </h4>
              </div>

              <div className="inline-flex rounded-xl bg-white p-1 border border-indigo-200 shrink-0">
                <button
                  type="button"
                  onClick={() => onProfileChange('macroMethod', 'g_per_kg')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    (profile.macroMethod || 'g_per_kg') === 'g_per_kg'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Científico (g/kg)
                </button>
                <button
                  type="button"
                  onClick={() => onProfileChange('macroMethod', 'percentage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    profile.macroMethod === 'percentage'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Porcentajes (%)
                </button>
              </div>
            </div>

            <div className="bg-white/90 rounded-xl p-3 border border-indigo-100 text-xs text-slate-600 flex items-start gap-2.5">
              <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{targets.formulaExplanation}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold uppercase text-slate-500">Calorías (kcal)</label>
              <input
                type="number"
                value={targets.calories}
                onChange={(e) => onManualTargetChange('calories', e.target.value)}
                className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200">
              <label className="block text-[11px] font-bold uppercase text-blue-600">Proteínas (g)</label>
              <input
                type="number"
                value={targets.protein}
                onChange={(e) => onManualTargetChange('protein', e.target.value)}
                className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="block text-[11px] font-bold uppercase text-amber-600">Carbos (g)</label>
              <input
                type="number"
                value={targets.carbs}
                onChange={(e) => onManualTargetChange('carbs', e.target.value)}
                className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
              />
            </div>
            <div className="bg-white p-3 rounded-xl border border-rose-200">
              <label className="block text-[11px] font-bold uppercase text-rose-600">Grasas (g)</label>
              <input
                type="number"
                value={targets.fat}
                onChange={(e) => onManualTargetChange('fat', e.target.value)}
                className="w-full text-lg font-extrabold text-slate-900 mt-1 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
