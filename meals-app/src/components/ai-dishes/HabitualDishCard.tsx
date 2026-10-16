import React, { useState } from "react";
import { Trash2, Lightbulb, ChevronDown } from "lucide-react";
import type { FoodItem } from "../../types/nutrition";

interface HabitualDishCardProps {
  dish: FoodItem;
  onDeleteDish: (dishId: string) => void;
  onAddToMeal: (
    mealCategory: "almuerzo" | "cena",
    dish: FoodItem,
    grams: number,
  ) => void;
}

export const HabitualDishCard: React.FC<HabitualDishCardProps> = ({
  dish,
  onDeleteDish,
  onAddToMeal,
}) => {
  const [showTip, setShowTip] = useState(false);
  const recGrams = dish.portionGrams || 350;
  const factor = recGrams / 100;
  const portionCals = Math.round(dish.calories * factor);
  const portionPro = Math.round(dish.protein * factor);
  const portionCarbs = Math.round(dish.carbs * factor);
  const portionFat = Math.round(dish.fat * factor);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col justify-between gap-3 sm:gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-slate-900 text-base">{dish.name}</h4>
          <button
            onClick={() => onDeleteDish(dish.id)}
            className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer"
            title="Eliminar plato habitual"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-1">
          Por cada 100g: <strong>{dish.calories} kcal</strong> • P:{" "}
          {dish.protein}g • C: {dish.carbs}g • G: {dish.fat}g
        </p>

        {/* Cuánto puedes comer según tus metas */}
        <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">
              ¿Cuánto puedes servirte?
            </span>
            <span className="text-sm font-extrabold text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
              {recGrams} g de plato
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-emerald-900 mt-1.5 font-medium flex-wrap">
            <span>
              Aporta: <strong>{portionCals} kcal</strong>
            </span>
            <span>•</span>
            <span className="text-blue-700">
              <strong>{portionPro}g</strong> Proteína
            </span>
            <span className="text-amber-700">
              <strong>{portionCarbs}g</strong> Carbs
            </span>
            <span className="text-rose-700">
              <strong>{portionFat}g</strong> Grasas
            </span>
          </div>
        </div>

        {dish.aiTip && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowTip(!showTip)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{showTip ? "Ocultar consejo IA" : "Consejo IA"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-amber-600 transition-transform duration-200 ${
                  showTip ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTip && (
              <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700">
                  <strong className="text-slate-900">
                    Consejo IA para equilibrarlo:
                  </strong>{" "}
                  {dish.aiTip}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onAddToMeal("almuerzo", dish, recGrams)}
          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          + Añadir a Comida ({recGrams}g)
        </button>
        <button
          onClick={() => onAddToMeal("cena", dish, recGrams)}
          className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          + Añadir a Cena ({recGrams}g)
        </button>
      </div>
    </div>
  );
};
