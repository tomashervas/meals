import React from "react";
import type {
  WeeklyDayPlan,
  WeeklyMealDish,
  AltMode,
  SelectedSlotForAlt,
} from "../../types/nutrition";
import { WeeklyMealSlot } from "./WeeklyMealSlot";

interface WeeklyDayCardProps {
  dayPlan: WeeklyDayPlan;
  dayIndex: number;
  onFetchAlternatives: (slot: SelectedSlotForAlt, mode: AltMode) => void;
  onSendMealToToday: (
    mealType: "lunch" | "dinner",
    dish: WeeklyMealDish,
  ) => void;
}

export const WeeklyDayCard: React.FC<WeeklyDayCardProps> = ({
  dayPlan,
  dayIndex,
  onFetchAlternatives,
  onSendMealToToday,
}) => {
  const totalCalories = dayPlan.lunch.calories + dayPlan.dinner.calories;
  const totalProtein = dayPlan.lunch.protein + dayPlan.dinner.protein;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between space-x-4">
        <span className="font-extrabold text-sm tracking-wide uppercase text-emerald-400">
          {dayPlan.day}
        </span>
        <span className="text-xs text-slate-300">
          Comida + Cena: <strong>{totalCalories} kcal</strong> •{" "}
          <strong>{totalProtein}g P</strong> (Resto en Desayuno/Merienda)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <WeeklyMealSlot
          dayIndex={dayIndex}
          mealType="lunch"
          dish={dayPlan.lunch}
          onFetchAlternatives={onFetchAlternatives}
          onSendMealToToday={onSendMealToToday}
        />
        <WeeklyMealSlot
          dayIndex={dayIndex}
          mealType="dinner"
          dish={dayPlan.dinner}
          onFetchAlternatives={onFetchAlternatives}
          onSendMealToToday={onSendMealToToday}
        />
      </div>
    </div>
  );
};
