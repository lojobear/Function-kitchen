import { analyzeItem } from '../lib/tagging-engine';

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export function getFallbackEmoji(itemName: string): string {
  const analysis = analyzeItem(itemName);
  return analysis.primaryEmoji;
}

export function getRarityFromName(itemName: string): Rarity {
  const analysis = analyzeItem(itemName);
  return analysis.raritySuggestion;
}

export function getCategoryFromName(itemName: string): string {
  const analysis = analyzeItem(itemName);
  return analysis.suggestedCategory;
}

export function getItemStats(itemName: string) {
  return {
    emoji: getFallbackEmoji(itemName),
    rarity: getRarityFromName(itemName),
    category: getCategoryFromName(itemName),
  };
}

/**
 * Validates if an item name is suitable for crafting
 */
export function isValidItemName(name: string): boolean {
  return (
    name.trim().length >= 2 &&
    name.trim().length <= 100 &&
    !/[<>{}|\\^[\]`]/.test(name)
  );
}

/**
 * Sanitizes item name for storage
 */
export function sanitizeItemName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
