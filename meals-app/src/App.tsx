import React, { useState, useEffect, useMemo } from "react";
import type {
  UserProfile,
  MacroTargets,
  DailyMeals,
  FoodItem,
  WeeklyDayPlan,
  WeeklyMealDish,
  AlternativeDish,
  ActiveTab,
  SearchEngineSource,
  AltMode,
  SelectedSlotForAlt,
  CustomFoodFormData,
} from "./types/nutrition";
import {
  INITIAL_AI_DISHES,
  INITIAL_FOOD_DB,
  MEAL_CATEGORIES,
  SAMPLE_DAY_MEALS,
  INITIAL_WEEKLY_PLAN,
} from "./constants/initialData";
import {
  calculateRecommendedTargets,
  calculateMealTotals,
} from "./utils/calculations";
import { fetchOpenFoodFactsResilient } from "./services/openFoodFacts";
import {
  calculateSingleDishWithAI,
  analyzeHabitualDishesWithAI,
  generateWeeklyMenuWithAI,
  fetchDishAlternativesWithAI,
} from "./services/nutritionAi";

import { Toast } from "./components/common/Toast";
import { Header } from "./components/layout/Header";
import { Dashboard } from "./components/dashboard/Dashboard";
import { DailyTrackerTab } from "./components/tracker/DailyTrackerTab";
import { HabitualDishesTab } from "./components/ai-dishes/HabitualDishesTab";
import { WeeklyMenuTab } from "./components/weekly/WeeklyMenuTab";

import { ProfileModal } from "./components/modals/ProfileModal";
import { AddFoodModal } from "./components/modals/AddFoodModal";
import { AlternativesModal } from "./components/modals/AlternativesModal";
import { ConfirmClearModal } from "./components/modals/ConfirmClearModal";

export default function App() {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState<ActiveTab>("tracker");

  // --- PERFIL BIOMÉTRICO (Por defecto: Hombre, 40 años, 201cm, 106kg, Moderado, Recomposición) ---
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("nutri_profile_v2");
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      sex: parsed.sex || "male",
      age: parsed.age ?? 40,
      height: parsed.height ?? 201,
      weight: parsed.weight ?? 106,
      activity: parsed.activity ?? 1.55,
      goal: parsed.goal || "recomp",
      macroMethod: parsed.macroMethod || "g_per_kg",
      isManualTargets: parsed.isManualTargets || false,
    };
  });

  const [targets, setTargets] = useState<MacroTargets>(() => {
    const saved = localStorage.getItem("nutri_targets_v2");
    if (saved) return JSON.parse(saved);
    return calculateRecommendedTargets(profile);
  });

  const [meals, setMeals] = useState<DailyMeals>(() => {
    const saved = localStorage.getItem("nutri_meals_v2");
    return saved ? JSON.parse(saved) : SAMPLE_DAY_MEALS;
  });

  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem("nutri_custom_foods_v2");
    return saved ? JSON.parse(saved) : INITIAL_AI_DISHES;
  });

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyDayPlan[]>(() => {
    const saved = localStorage.getItem("nutri_weekly_plan_v2");
    return saved ? JSON.parse(saved) : INITIAL_WEEKLY_PLAN;
  });

  // --- ESTADOS DE MODALES Y ASISTENTE IA ---
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeMealToAdd, setActiveMealToAdd] = useState<string | null>(null);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Todos");
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(
    null,
  );
  const [selectedGrams, setSelectedGrams] = useState<number | string>(100);
  const [isCreatingCustomFood, setIsCreatingCustomFood] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState<CustomFoodFormData>({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    gramsToAdd: 250,
    saveToDb: true,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  // Estados OpenFoodFacts v2 + Motor IA Resiliente
  const [apiSearchResults, setApiSearchResults] = useState<FoodItem[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchEngineSource, setSearchEngineSource] =
    useState<SearchEngineSource>("local");
  const [isCalculatingSingleDishAI, setIsCalculatingSingleDishAI] =
    useState(false);

  // Estados Asistente IA de Platos Habituales
  const [isAnalyzingDishes, setIsAnalyzingDishes] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  // Estados Menú Semanal y Alternativas Económicas IA
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);
  const [selectedSlotForAlt, setSelectedSlotForAlt] =
    useState<SelectedSlotForAlt | null>(null);
  const [altSuggestions, setAltSuggestions] = useState<AlternativeDish[]>([]);
  const [altMode, setAltMode] = useState<AltMode | null>(null);
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);

  // Persistencia en LocalStorage
  useEffect(() => {
    localStorage.setItem("nutri_profile_v2", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("nutri_targets_v2", JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    localStorage.setItem("nutri_meals_v2", JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem("nutri_custom_foods_v2", JSON.stringify(customFoods));
  }, [customFoods]);

  useEffect(() => {
    localStorage.setItem("nutri_weekly_plan_v2", JSON.stringify(weeklyPlan));
  }, [weeklyPlan]);

  // Catálogo unificado (definido antes de los efectos de búsqueda para evitar ReferenceError)
  const allFoods = useMemo(
    () => [...customFoods, ...INITIAL_FOOD_DB],
    [customFoods],
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- BÚSQUEDA RESILIENTE SIN ERRORES CORS/503 (OpenFoodFacts v2 -> Proxy -> Gemini IA) ---
  useEffect(() => {
    const query = foodSearchQuery.trim();
    if (!activeMealToAdd || query.length < 3) {
      const resetTimer = setTimeout(() => {
        setApiSearchResults([]);
        setIsSearchingApi(false);
        setSearchEngineSource("local");
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const { items, source } = await fetchOpenFoodFactsResilient(query);
        if (!isCancelled) {
          setApiSearchResults(items);
          setSearchEngineSource(source);
          // Si no había ningún elemento local seleccionado que coincida, pre-seleccionamos el primero encontrado
          const localHasMatch = allFoods.some((f) =>
            f.name.toLowerCase().includes(query.toLowerCase()),
          );
          if (!localHasMatch && items.length > 0) {
            setSelectedFoodItem(items[0]);
            setSelectedGrams(items[0].portionGrams || 100);
          }
        }
      } catch {
        if (!isCancelled) {
          setSearchEngineSource("local");
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingApi(false);
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [foodSearchQuery, activeMealToAdd, allFoods]);

  // --- CÁLCULO INSTANTÁNEO DE PLATO BUSCADO CON IA ---
  const handleCalculateSearchQueryWithAI = async () => {
    const query = foodSearchQuery.trim();
    if (!query) return;
    setIsCalculatingSingleDishAI(true);
    try {
      const newDish = await calculateSingleDishWithAI(query, profile, targets);
      setCustomFoods((prev) => [newDish, ...prev]);
      setSelectedFoodItem(newDish);
      setSelectedGrams(newDish.portionGrams || 300);
      showToast(
        `Plato "${newDish.name}" calculado con IA y guardado en tu listado`,
      );
    } catch {
      showToast("No se pudo conectar con la IA en este momento.");
    } finally {
      setIsCalculatingSingleDishAI(false);
    }
  };

  // --- ANALIZADOR DE PLATOS HABITUALES CON IA (PESTAÑA MIS PLATOS IA) ---
  const handleAnalyzeHabitualDishes = async (dishesInput: string) => {
    if (!dishesInput.trim()) return;
    setIsAnalyzingDishes(true);
    setAiAnalysisError(null);

    try {
      const mapped = await analyzeHabitualDishesWithAI(
        dishesInput,
        profile,
        targets,
      );
      if (mapped.length > 0) {
        setCustomFoods((prev) => [...mapped, ...prev]);
        showToast(
          `¡${mapped.length} platos analizados y añadidos permanentemente a tu base de datos!`,
        );
      }
    } catch {
      setAiAnalysisError(
        "Hubo un problema al analizar los platos. Inténtalo de nuevo.",
      );
    } finally {
      setIsAnalyzingDishes(false);
    }
  };

  // --- GENERADOR DE MENÚ SEMANAL CON IA ---
  const handleGenerateWeeklyMenuAI = async () => {
    setIsGeneratingWeekly(true);
    try {
      const userDishesNames = customFoods.map((f) => f.name).join(", ");
      const data = await generateWeeklyMenuWithAI(
        userDishesNames,
        profile,
        targets,
      );
      if (data.length === 7) {
        setWeeklyPlan(data);
        showToast(
          "Menú semanal generado con tus platos habituales y ajustado a tus macros",
        );
      }
    } catch {
      showToast("No se pudo regenerar el menú en este momento.");
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  // --- SUGERIDOR DE ALTERNATIVAS EQUIVALENTES O ECONÓMICAS CON IA ---
  const handleFetchAlternatives = async (
    slot: SelectedSlotForAlt,
    mode: AltMode,
  ) => {
    setSelectedSlotForAlt(slot);
    setAltMode(mode);
    setIsLoadingAlts(true);
    setAltSuggestions([]);

    try {
      const res = await fetchDishAlternativesWithAI(slot.dish, mode);
      setAltSuggestions(res);
    } catch {
      showToast("Error al obtener alternativas de la IA.");
    } finally {
      setIsLoadingAlts(false);
    }
  };

  const handleReplaceWeeklyDish = (alt: AlternativeDish) => {
    if (!selectedSlotForAlt) return;
    const { dayIndex, mealType } = selectedSlotForAlt;
    setWeeklyPlan((prev) =>
      prev.map((dayObj, idx) => {
        if (idx !== dayIndex) return dayObj;
        return {
          ...dayObj,
          [mealType]: {
            name: alt.name,
            grams: Math.round(alt.grams),
            calories: Math.round(alt.calories),
            protein: Math.round(alt.protein),
            carbs: Math.round(alt.carbs),
            fat: Math.round(alt.fat),
            tip: alt.savingOrHealthReason,
          },
        };
      }),
    );
    showToast(
      `Plato sustituido por "${alt.name}" en el ${weeklyPlan[dayIndex].day}`,
    );
    setSelectedSlotForAlt(null);
  };

  const handleSendWeeklyMealToToday = (
    mealType: "lunch" | "dinner",
    dishObj: WeeklyMealDish,
  ) => {
    const targetCat = mealType === "lunch" ? "almuerzo" : "cena";
    const grams = Number(dishObj.grams) || 400;
    const factor = grams / 100;

    const newEntry = {
      instanceId: `item_${Date.now()}`,
      foodId: `weekly_${Date.now()}`,
      name: dishObj.name,
      grams: grams,
      baseCalories: Math.round(dishObj.calories / factor),
      baseProtein: Math.round((dishObj.protein / factor) * 10) / 10,
      baseCarbs: Math.round((dishObj.carbs / factor) * 10) / 10,
      baseFat: Math.round((dishObj.fat / factor) * 10) / 10,
      isHabitualAI: true,
    };

    setMeals((prev) => ({
      ...prev,
      [targetCat]: [...(prev[targetCat] || []), newEntry],
    }));

    showToast(
      `Añadido "${dishObj.name}" a tu ${targetCat === "almuerzo" ? "Comida" : "Cena"} de hoy`,
    );
    setActiveTab("tracker");
  };

  const handleAddHabitualDishToMeal = (
    mealCategory: "almuerzo" | "cena",
    dish: FoodItem,
    grams: number,
  ) => {
    const newEntry = {
      instanceId: `item_${Date.now()}`,
      foodId: dish.id,
      name: dish.name,
      grams: grams,
      baseCalories: dish.calories,
      baseProtein: dish.protein,
      baseCarbs: dish.carbs,
      baseFat: dish.fat,
      isHabitualAI: true,
    };
    setMeals((prev) => ({
      ...prev,
      [mealCategory]: [...(prev[mealCategory] || []), newEntry],
    }));
    const label = mealCategory === "almuerzo" ? "Comida" : "Cena";
    showToast(`Añadido ${grams}g de "${dish.name}" a tu ${label} de hoy`);
    setActiveTab("tracker");
  };

  const handleDeleteHabitualDish = (dishId: string) => {
    setCustomFoods((prev) => prev.filter((f) => f.id !== dishId));
  };

  // --- CÁLCULO DE TOTALES DIARIOS ---
  const mealTotals = useMemo(() => {
    return calculateMealTotals(meals, MEAL_CATEGORIES);
  }, [meals]);

  // --- GESTIÓN DE ALIMENTOS EN EL TRACKER DIARIO ---
  const openAddFoodModal = (mealId: string) => {
    setActiveMealToAdd(mealId);
    setFoodSearchQuery("");
    setSelectedCategoryFilter("Todos");
    setSelectedFoodItem(allFoods[0] || null);
    setSelectedGrams(allFoods[0]?.portionGrams || 200);
    setIsCreatingCustomFood(false);
    setApiSearchResults([]);
  };

  const handleAddSelectedFood = () => {
    if (!selectedFoodItem || !activeMealToAdd) return;
    const gramsNum = Math.max(1, Number(selectedGrams) || 100);

    const newEntry = {
      instanceId: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      foodId: selectedFoodItem.id,
      name: selectedFoodItem.name,
      grams: gramsNum,
      baseCalories: Number(selectedFoodItem.calories),
      baseProtein: Number(selectedFoodItem.protein),
      baseCarbs: Number(selectedFoodItem.carbs),
      baseFat: Number(selectedFoodItem.fat),
      isHabitualAI: selectedFoodItem.isHabitualAI || false,
    };

    setMeals((prev) => ({
      ...prev,
      [activeMealToAdd]: [...(prev[activeMealToAdd] || []), newEntry],
    }));

    const mealLabel = MEAL_CATEGORIES.find(
      (m) => m.id === activeMealToAdd,
    )?.label;
    showToast(
      `Añadido: ${selectedFoodItem.name} (${gramsNum}g) a ${mealLabel}`,
    );
    setActiveMealToAdd(null);
  };

  const handleCreateAndAddCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFoodForm.name.trim() || !activeMealToAdd) return;

    const pro = Math.max(0, Number(customFoodForm.protein) || 0);
    const carbs = Math.max(0, Number(customFoodForm.carbs) || 0);
    const fat = Math.max(0, Number(customFoodForm.fat) || 0);
    const calsInput = Number(customFoodForm.calories);
    const calculatedCals = Math.round(pro * 4 + carbs * 4 + fat * 9);
    const finalBaseCals = calsInput > 0 ? calsInput : calculatedCals;
    const gramsToAdd = Math.max(1, Number(customFoodForm.gramsToAdd) || 100);

    const newFoodId = `custom_${Date.now()}`;

    if (customFoodForm.saveToDb) {
      const newDbItem: FoodItem = {
        id: newFoodId,
        name: customFoodForm.name.trim(),
        calories: finalBaseCals,
        protein: pro,
        carbs: carbs,
        fat: fat,
        category: "Mis Platos IA",
        portionName: "Ración personalizada",
        portionGrams: gramsToAdd,
        isHabitualAI: true,
      };
      setCustomFoods((prev) => [newDbItem, ...prev]);
    }

    const newEntry = {
      instanceId: `item_${Date.now()}`,
      foodId: newFoodId,
      name: customFoodForm.name.trim(),
      grams: gramsToAdd,
      baseCalories: finalBaseCals,
      baseProtein: pro,
      baseCarbs: carbs,
      baseFat: fat,
    };

    setMeals((prev) => ({
      ...prev,
      [activeMealToAdd]: [...(prev[activeMealToAdd] || []), newEntry],
    }));

    showToast(`Añadido alimento personalizado: ${customFoodForm.name}`);
    setCustomFoodForm({
      name: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      gramsToAdd: 250,
      saveToDb: true,
    });
    setActiveMealToAdd(null);
  };

  const handleUpdateMealItemGrams = (
    mealId: string,
    instanceId: string,
    newGrams: string | number,
  ) => {
    const val = Math.max(0, Number(newGrams));
    setMeals((prev) => ({
      ...prev,
      [mealId]: (prev[mealId] || []).map((item) =>
        item.instanceId === instanceId ? { ...item, grams: val } : item,
      ),
    }));
  };

  const handleRemoveMealItem = (mealId: string, instanceId: string) => {
    setMeals((prev) => ({
      ...prev,
      [mealId]: (prev[mealId] || []).filter(
        (item) => item.instanceId !== instanceId,
      ),
    }));
  };

  const handleClearDay = () => {
    setMeals({
      desayuno: [],
      almuerzo: [],
      merienda: [],
      cena: [],
      snacks: [],
    });
    setConfirmClearModal(false);
    showToast("Registro del día reiniciado en blanco");
  };

  const handleProfileChange = (
    field: keyof UserProfile,
    value: UserProfile[keyof UserProfile],
  ) => {
    const updated = { ...profile, [field]: value, isManualTargets: false };
    setProfile(updated);
    setTargets(calculateRecommendedTargets(updated));
  };

  const handleManualTargetChange = (
    field: "calories" | "protein" | "carbs" | "fat",
    value: string | number,
  ) => {
    const num = Math.max(0, Number(value) || 0);
    setProfile((prev) => ({ ...prev, isManualTargets: true }));
    setTargets((prev) => {
      const next = { ...prev, [field]: num };
      if (field === "protein" || field === "carbs" || field === "fat") {
        next.calories = Math.round(
          next.protein * 4 + next.carbs * 4 + next.fat * 9,
        );
      }
      return next;
    });
  };

  // Combinar resultados locales + OpenFoodFacts / Motor IA en el buscador
  const combinedFilteredFoods = useMemo(() => {
    const localMatches = allFoods.filter((food) => {
      const matchesSearch = food.name
        .toLowerCase()
        .includes(foodSearchQuery.toLowerCase());
      const matchesCat =
        selectedCategoryFilter === "Todos" ||
        food.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });

    if (selectedCategoryFilter === "OpenFoodFacts / Supermercado") {
      return apiSearchResults;
    }
    if (selectedCategoryFilter !== "Todos") {
      return localMatches;
    }
    return [...localMatches, ...apiSearchResults];
  }, [allFoods, apiSearchResults, foodSearchQuery, selectedCategoryFilter]);

  const categoriesList = useMemo(() => {
    const cats = new Set([
      "Todos",
      "Mis Platos IA",
      "OpenFoodFacts / Supermercado",
    ]);
    INITIAL_FOOD_DB.forEach((f) => cats.add(f.category));
    return Array.from(cats);
  }, []);

  const activeCategoryLabel = activeMealToAdd
    ? MEAL_CATEGORIES.find((m) => m.id === activeMealToAdd)?.label ||
      activeMealToAdd
    : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Notificación Toast */}
      <Toast message={toastMessage} />

      {/* HEADER SUPERIOR + NAVEGACIÓN PRINCIPAL */}
      <Header
        profile={profile}
        targets={targets}
        activeTab={activeTab}
        customFoodsCount={customFoods.length}
        onTabChange={setActiveTab}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* DASHBOARD SUPERIOR SIEMPRE VISIBLE */}

        {/* PESTAÑA 1: REGISTRO DIARIO DE COMIDAS */}
        {activeTab === "tracker" && (
          <>
            <Dashboard
              profile={profile}
              targets={targets}
              dailyTotals={mealTotals.daily}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
            <DailyTrackerTab
              meals={meals}
              mealCategories={MEAL_CATEGORIES}
              targets={targets}
              mealTotals={mealTotals}
              onOpenAddModal={openAddFoodModal}
              onUpdateGrams={handleUpdateMealItemGrams}
              onRemoveItem={handleRemoveMealItem}
              onRestoreSampleDay={() => {
                setMeals(SAMPLE_DAY_MEALS);
                showToast("Día de ejemplo cargado");
              }}
              onOpenConfirmClear={() => setConfirmClearModal(true)}
              onGoToAiDishes={() => setActiveTab("ai-dishes")}
            />
          </>
        )}

        {/* PESTAÑA 2: ASISTENTE IA DE PLATOS HABITUALES (PERMANENTES) */}
        {activeTab === "ai-dishes" && (
          <HabitualDishesTab
            customFoods={customFoods}
            profile={profile}
            targets={targets}
            isAnalyzingDishes={isAnalyzingDishes}
            aiAnalysisError={aiAnalysisError}
            onAnalyzeDishes={handleAnalyzeHabitualDishes}
            onDeleteDish={handleDeleteHabitualDish}
            onAddToMeal={handleAddHabitualDishToMeal}
          />
        )}

        {/* PESTAÑA 3: MENÚ SEMANAL Y ALTERNATIVAS ECONÓMICAS */}
        {activeTab === "weekly-menu" && (
          <WeeklyMenuTab
            weeklyPlan={weeklyPlan}
            targets={targets}
            isGeneratingWeekly={isGeneratingWeekly}
            onGenerateWeeklyMenu={handleGenerateWeeklyMenuAI}
            onFetchAlternatives={handleFetchAlternatives}
            onSendMealToToday={handleSendWeeklyMealToToday}
          />
        )}
      </main>

      {/* MODAL: ALTERNATIVAS ECONÓMICAS O EQUIVALENTES (MENÚ SEMANAL) */}
      <AlternativesModal
        selectedSlot={selectedSlotForAlt}
        weeklyPlan={weeklyPlan}
        altMode={altMode}
        altSuggestions={altSuggestions}
        isLoadingAlts={isLoadingAlts}
        onClose={() => setSelectedSlotForAlt(null)}
        onFetchAlternatives={handleFetchAlternatives}
        onReplaceDish={handleReplaceWeeklyDish}
      />

      {/* MODAL: BUSCADOR DE ALIMENTOS (OPENFOODFACTS API + PLATOS IA + LOCAL) */}
      <AddFoodModal
        isOpen={Boolean(activeMealToAdd)}
        mealId={activeMealToAdd}
        mealLabel={activeCategoryLabel}
        foodSearchQuery={foodSearchQuery}
        onSearchQueryChange={setFoodSearchQuery}
        isSearchingApi={isSearchingApi}
        searchEngineSource={searchEngineSource}
        totalCatalogCount={allFoods.length}
        categoriesList={categoriesList}
        selectedCategoryFilter={selectedCategoryFilter}
        onCategoryFilterChange={setSelectedCategoryFilter}
        filteredFoods={combinedFilteredFoods}
        selectedFoodItem={selectedFoodItem}
        onSelectFoodItem={setSelectedFoodItem}
        selectedGrams={selectedGrams}
        onSelectedGramsChange={setSelectedGrams}
        isCalculatingSingleDishAI={isCalculatingSingleDishAI}
        onCalculateWithAI={handleCalculateSearchQueryWithAI}
        onAddSelectedFood={handleAddSelectedFood}
        isCreatingCustomFood={isCreatingCustomFood}
        setIsCreatingCustomFood={setIsCreatingCustomFood}
        customFoodForm={customFoodForm}
        onCustomFoodFormChange={setCustomFoodForm}
        onCreateAndAddCustomFood={handleCreateAndAddCustomFood}
        onClose={() => setActiveMealToAdd(null)}
      />

      {/* MODAL: PERFIL Y 4 MODOS */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        targets={targets}
        onProfileChange={handleProfileChange}
        onManualTargetChange={handleManualTargetChange}
        onClose={() => {
          setIsProfileModalOpen(false);
          showToast("Objetivos actualizados");
        }}
      />

      {/* MODAL: CONFIRMACIÓN VACIAR DÍA */}
      <ConfirmClearModal
        isOpen={confirmClearModal}
        onClose={() => setConfirmClearModal(false)}
        onConfirm={handleClearDay}
      />
    </div>
  );
}
