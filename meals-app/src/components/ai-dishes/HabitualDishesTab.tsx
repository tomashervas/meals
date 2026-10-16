import React, { useState } from "react";
import {
  ChefHat,
  BookOpen,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import type {
  FoodItem,
  UserProfile,
  MacroTargets,
} from "../../types/nutrition";
import { HabitualDishCard } from "./HabitualDishCard";

interface HabitualDishesTabProps {
  customFoods: FoodItem[];
  profile: UserProfile;
  targets: MacroTargets;
  isAnalyzingDishes: boolean;
  aiAnalysisError: string | null;
  onAnalyzeDishes: (dishesInput: string) => Promise<void>;
  onDeleteDish: (dishId: string) => void;
  onAddToMeal: (
    mealCategory: "almuerzo" | "cena",
    dish: FoodItem,
    grams: number,
  ) => void;
}

export const HabitualDishesTab: React.FC<HabitualDishesTabProps> = ({
  customFoods,
  profile,
  targets,
  isAnalyzingDishes,
  aiAnalysisError,
  onAnalyzeDishes,
  onDeleteDish,
  onAddToMeal,
}) => {
  const [dishesInput, setDishesInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishesInput.trim()) return;
    await onAnalyzeDishes(dishesInput);
    setDishesInput("");
  };

  const sampleIdeas = [
    "Bocadillo de tortilla francesa con jamón",
    "Macarrones con carne picada y tomate",
    "Cocido o puchero con garbanzos y pollo",
  ];

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-200/80">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Agente IA: Cuéntame qué platos sueles comer y cenar
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Escribe tus platos caseros habituales separados por comas. La IA
              calculará sus calorías por 100g, te dirá{" "}
              <strong>cuántos gramos exactos puedes servirte</strong> para tu
              meta de {targets.calories} kcal ({profile.weight} kg) y te dará un
              consejo para mejorar su perfil nutricional.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={3}
            value={dishesInput}
            onChange={(e) => setDishesInput(e.target.value)}
            placeholder="Ejemplo: Macarrones con chorizo y tomate, bocadillo de lomo con queso, arroz caldoso con pollo..."
            className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 focus:bg-white"
          />

          {aiAnalysisError && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {aiAnalysisError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-400 self-center mr-1">
                Ideas rápidas:
              </span>
              {sampleIdeas.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setDishesInput((prev) =>
                      prev ? `${prev}, ${sample}` : sample,
                    )
                  }
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition cursor-pointer"
                >
                  + {sample}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isAnalyzingDishes || !dishesInput.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
            >
              {isAnalyzingDishes ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando macros y raciones con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Analizar y Guardar en Mi Listado Permanente
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Catálogo de Platos Habituales del Usuario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Tus Platos Habituales Guardados ({customFoods.length})
          </h3>
          <span className="text-xs text-slate-500">
            Disponibles siempre en tu buscador y para tu menú semanal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFoods.map((dish) => (
            <HabitualDishCard
              key={dish.id}
              dish={dish}
              onDeleteDish={onDeleteDish}
              onAddToMeal={onAddToMeal}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
