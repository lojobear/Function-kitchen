import { useState, useCallback, useMemo } from 'react';
import { Ingredient, KitchenAction, TimelineEntry, FinishedItem } from '../constants';

export interface CraftingState {
  ingredients: Ingredient[];
  selectedIngredients: Set<string>;
  selectedActions: Set<string>;
  isCrafting: boolean;
  finishedItems: FinishedItem[];
  timeline: TimelineEntry[];
  inputGoal: string;
}

export function useCraftingState(initialIngredients: Ingredient[] = []) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [isCrafting, setIsCrafting] = useState(false);
  const [finishedItems, setFinishedItems] = useState<FinishedItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [inputGoal, setInputGoal] = useState('');

  // Memoized derived state
  const selectedIngredientObjects = useMemo(
    () => ingredients.filter((ing) => selectedIngredients.has(ing.name)),
    [ingredients, selectedIngredients]
  );

  // Actions
  const toggleIngredient = useCallback((ingredientName: string) => {
    setSelectedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  }, []);

  const toggleAction = useCallback((actionName: string) => {
    setSelectedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionName)) {
        newSet.delete(actionName);
      } else {
        newSet.add(actionName);
      }
      return newSet;
    });
  }, []);

  const addIngredient = useCallback((ingredient: Ingredient) => {
    setIngredients((prev) => [ingredient, ...prev]);
  }, []);

  const removeIngredient = useCallback((ingredientName: string) => {
    setIngredients((prev) =>
      prev.filter((ing) => ing.name !== ingredientName)
    );
  }, []);

  const addFinishedItem = useCallback((item: FinishedItem) => {
    setFinishedItems((prev) => [item, ...prev]);
  }, []);

  const addTimelineEntry = useCallback((entry: TimelineEntry) => {
    setTimeline((prev) => [...prev, entry]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIngredients(new Set());
    setSelectedActions(new Set());
  }, []);

  const reset = useCallback(() => {
    setSelectedIngredients(new Set());
    setSelectedActions(new Set());
    setInputGoal('');
    setIsCrafting(false);
  }, []);

  return {
    // State
    ingredients,
    setIngredients,
    selectedIngredients,
    setSelectedIngredients,
    selectedActions,
    setSelectedActions,
    isCrafting,
    setIsCrafting,
    finishedItems,
    setFinishedItems,
    timeline,
    setTimeline,
    inputGoal,
    setInputGoal,

    // Derived state
    selectedIngredientObjects,
    hasSelection: selectedIngredients.size > 0 || selectedActions.size > 0,

    // Actions
    toggleIngredient,
    toggleAction,
    addIngredient,
    removeIngredient,
    addFinishedItem,
    addTimelineEntry,
    clearSelection,
    reset,
  };
}
