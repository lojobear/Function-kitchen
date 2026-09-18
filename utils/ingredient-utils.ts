import { Ingredient } from '../constants';
import { getRarityFromName } from './item-utils';

/**
 * Normalizes an ingredient name for collision checks and matching
 */
export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds an ingredient in an inventory array by normalized name
 */
export function findIngredientInInventory(
  name: string,
  inventory: Ingredient[]
): Ingredient | null {
  const normalizedSearch = normalizeIngredientName(name);
  return (
    inventory.find(
      (ing) => normalizeIngredientName(ing.name) === normalizedSearch
    ) || null
  );
}

/**
 * Checks if an ingredient is already present in inventory
 */
export function isDuplicateIngredient(
  name: string,
  inventory: Ingredient[]
): boolean {
  return findIngredientInInventory(name, inventory) !== null;
}

/**
 * Filters ingredients by rarity level
 */
export function filterByRarity(
  ingredients: Ingredient[],
  rarity: string
): Ingredient[] {
  return ingredients.filter((ing) => getRarityFromName(ing.name) === rarity);
}

/**
 * Groups ingredients by category
 */
export function groupIngredientsByCategory(
  ingredients: Ingredient[]
): Record<string, Ingredient[]> {
  return ingredients.reduce(
    (acc, ing) => {
      const category = ing.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(ing);
      return acc;
    },
    {} as Record<string, Ingredient[]>
  );
}

/**
 * Finds duplicates in an inventory array
 */
export function findDuplicateIngredients(
  inventory: Ingredient[]
): Ingredient[] {
  const seen = new Set<string>();
  const duplicates: Ingredient[] = [];

  for (const ing of inventory) {
    const normalized = normalizeIngredientName(ing.name);
    if (seen.has(normalized)) {
      duplicates.push(ing);
    }
    seen.add(normalized);
  }

  return duplicates;
}
