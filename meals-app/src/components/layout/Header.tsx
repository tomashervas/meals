import React from "react";
import { Flame, Utensils, ChefHat, Calendar, Sliders } from "lucide-react";
import type {
  UserProfile,
  MacroTargets,
  ActiveTab,
} from "../../types/nutrition";

interface HeaderProps {
  profile: UserProfile;
  targets: MacroTargets;
  activeTab: ActiveTab;
  customFoodsCount: number;
  onTabChange: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  targets,
  activeTab,
  customFoodsCount,
  onTabChange,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              NutriPlan AI
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Mifflin-St Jeor + Agente Nutricional Gemini + API OpenFoodFacts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Perfil y Macros ({targets.calories} kcal)</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/60 py-1.5">
        <button
          onClick={() => onTabChange("tracker")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "tracker"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200/70"
          }`}
        >
          <Utensils className="w-4 h-4" />
          Calculadora y Registro Diario
        </button>

        <button
          onClick={() => onTabChange("ai-dishes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "ai-dishes"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200/70"
          }`}
        >
          <ChefHat className="w-4 h-4" />
          Mis Platos Habituales (Agente IA)
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-300 text-slate-900 font-extrabold">
            {customFoodsCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange("weekly-menu")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "weekly-menu"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200/70"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Menú Semanal + Alternativas Económicas
        </button>
      </div>
    </header>
  );
};
