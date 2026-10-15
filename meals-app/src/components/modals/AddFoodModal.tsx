import React from 'react';
import {
  X,
  Search,
  Loader2,
  Sparkles,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import type {
  FoodItem,
  SearchEngineSource,
  CustomFoodFormData,
} from '../../types/nutrition';

interface AddFoodModalProps {
  isOpen: boolean;
  mealId: string | null;
  mealLabel: string;
  foodSearchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isSearchingApi: boolean;
  searchEngineSource: SearchEngineSource;
  totalCatalogCount: number;
  categoriesList: string[];
  selectedCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  filteredFoods: FoodItem[];
  selectedFoodItem: FoodItem | null;
  onSelectFoodItem: (item: FoodItem) => void;
  selectedGrams: number | string;
  onSelectedGramsChange: (grams: number | string) => void;
  isCalculatingSingleDishAI: boolean;
  onCalculateWithAI: () => void;
  onAddSelectedFood: () => void;
  isCreatingCustomFood: boolean;
  setIsCreatingCustomFood: (val: boolean) => void;
  customFoodForm: CustomFoodFormData;
  onCustomFoodFormChange: (data: CustomFoodFormData) => void;
  onCreateAndAddCustomFood: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isOpen,
  mealLabel,
  foodSearchQuery,
  onSearchQueryChange,
  isSearchingApi,
  searchEngineSource,
  totalCatalogCount,
  categoriesList,
  selectedCategoryFilter,
  onCategoryFilterChange,
  filteredFoods,
  selectedFoodItem,
  onSelectFoodItem,
  selectedGrams,
  onSelectedGramsChange,
  isCalculatingSingleDishAI,
  onCalculateWithAI,
  onAddSelectedFood,
  isCreatingCustomFood,
  setIsCreatingCustomFood,
  customFoodForm,
  onCustomFoodFormChange,
  onCreateAndAddCustomFood,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              Añadir a {mealLabel}
            </span>
            <h3 className="font-bold text-lg flex items-center gap-2">
              Buscador Conectado (OpenFoodFacts + Platos IA)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setIsCreatingCustomFood(false)}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              !isCreatingCustomFood
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Buscador en Tiempo Real (API + Mis Platos)
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingCustomFood(true)}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              isCreatingCustomFood
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Introducir Macros Manualmente
          </button>
        </div>

        {!isCreatingCustomFood ? (
          <div className="p-5 space-y-4">
            {/* Input Buscador con indicador de conexión API Resiliente */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Escribe cualquier alimento, fruta, marca o plato (ej. manzana, hacendado, avena...)"
                  value={foodSearchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {isSearchingApi && (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {foodSearchQuery.trim().length > 2 && (
                <button
                  type="button"
                  onClick={onCalculateWithAI}
                  disabled={isCalculatingSingleDishAI}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isCalculatingSingleDishAI ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  Crear "{foodSearchQuery.slice(0, 16)}" con IA
                </button>
              )}
            </div>

            {/* Estado en vivo del motor de búsqueda */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Motor activo:{' '}
                  {isSearchingApi ? (
                    <strong className="text-emerald-700">Buscando en tiempo real...</strong>
                  ) : searchEngineSource === 'openfoodfacts' ? (
                    <strong className="text-teal-700">OpenFoodFacts v2 + Catálogo Local</strong>
                  ) : searchEngineSource === 'ai_fallback' ? (
                    <strong className="text-indigo-700">Respaldo IA Supermercados España (Anti-503/CORS activo)</strong>
                  ) : (
                    <strong className="text-slate-700">Catálogo Mediterráneo Local ({totalCatalogCount} alimentos)</strong>
                  )}
                </span>
              </div>
              <span className="text-slate-400">
                {filteredFoods.length} resultados
              </span>
            </div>

            {/* Filtros de categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryFilterChange(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de Resultados */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredFoods.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 space-y-2">
                  {isSearchingApi ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando base de datos nutricional para "{foodSearchQuery}"...
                    </div>
                  ) : (
                    <>
                      <p>No hay coincidencias locales para "{foodSearchQuery}".</p>
                      {foodSearchQuery.trim().length > 1 && (
                        <button
                          type="button"
                          onClick={onCalculateWithAI}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          Pedir a la IA que calcule los macros de "{foodSearchQuery}"
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                filteredFoods.map(food => {
                  const isSelected = selectedFoodItem?.id === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => {
                        onSelectFoodItem(food);
                        onSelectedGramsChange(food.portionGrams || 100);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                        isSelected ? 'bg-emerald-50/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {food.name}
                          </p>
                          {food.isFromApi && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              food.sourceBadge === 'Catálogo IA Supermercado'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}>
                              <Globe className="w-2.5 h-2.5" /> {food.sourceBadge || 'OpenFoodFacts'}
                            </span>
                          )}
                          {food.isHabitualAI && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              Mi Plato IA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Por 100g: <strong>{food.calories} kcal</strong> • P: {food.protein}g • C: {food.carbs}g • G: {food.fat}g
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {food.portionGrams}g
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Panel de Ajuste de Gramos */}
            {selectedFoodItem && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-500 block">Seleccionado:</span>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedFoodItem.name}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Cantidad (g):</label>
                    <input
                      type="number"
                      min="1"
                      max="2500"
                      value={selectedGrams}
                      onChange={(e) => onSelectedGramsChange(e.target.value)}
                      className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {selectedFoodItem.aiTip && (
                  <p className="text-xs text-indigo-800 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                    💡 <strong>Recomendación IA:</strong> {selectedFoodItem.aiTip}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedFoodItem.portionGrams && (
                    <button
                      type="button"
                      onClick={() => onSelectedGramsChange(selectedFoodItem.portionGrams!)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition cursor-pointer ${
                        Number(selectedGrams) === selectedFoodItem.portionGrams
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {selectedFoodItem.portionName} ({selectedFoodItem.portionGrams}g)
                    </button>
                  )}
                  {[50, 100, 200, 300, 400, 500].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onSelectedGramsChange(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition cursor-pointer ${
                        Number(selectedGrams) === preset
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Calorías</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {Math.round((selectedFoodItem.calories * (Number(selectedGrams) || 0)) / 100)} kcal
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-blue-500 block">Proteínas</span>
                    <span className="text-sm font-extrabold text-blue-700">
                      {((selectedFoodItem.protein * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-100">
                    <span className="text-[10px] uppercase font-bold text-amber-500 block">Carbos</span>
                    <span className="text-sm font-extrabold text-amber-700">
                      {((selectedFoodItem.carbs * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-rose-100">
                    <span className="text-[10px] uppercase font-bold text-rose-500 block">Grasas</span>
                    <span className="text-sm font-extrabold text-rose-700">
                      {((selectedFoodItem.fat * (Number(selectedGrams) || 0)) / 100).toFixed(1)} g
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAddSelectedFood}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  Añadir {selectedGrams}g de {selectedFoodItem.name}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={onCreateAndAddCustomFood} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nombre del Alimento o Plato *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Empanada casera, Bocadillo..."
                value={customFoodForm.name}
                onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, name: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <p className="text-xs font-semibold text-slate-500">Valores nutricionales por cada 100g:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-600 mb-1">Proteínas (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={customFoodForm.protein}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, protein: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-600 mb-1">Carbos (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={customFoodForm.carbs}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, carbs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-600 mb-1">Grasas (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={customFoodForm.fat}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, fat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calorías (kcal)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Auto"
                  value={customFoodForm.calories}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, calories: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gramos a añadir hoy:</label>
                <input
                  type="number"
                  min="1"
                  max="2500"
                  value={customFoodForm.gramsToAdd}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, gramsToAdd: Number(e.target.value) || 0 })}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customFoodForm.saveToDb}
                  onChange={(e) => onCustomFoodFormChange({ ...customFoodForm, saveToDb: e.target.checked })}
                />
                Guardar permanentemente en Mis Platos
              </label>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Guardar y Añadir a la Comida
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
