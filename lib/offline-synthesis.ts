/**
 * Offline & Procedural Synthesis Fallback
 * Provides instant local generation when API quota or network failures occur
 */

import { SynthesisResult } from './synthesis-cache';
import { analyzeItem } from './tagging-engine';
import { getItemColor } from './sprite-engine';

export function generateOfflineSynthesis(
  goal: string,
  rarityInput?: string,
  categoryInput?: string
): SynthesisResult {
  const analysis = analyzeItem(goal, { type: 'finished_item' });
  const rarity = (rarityInput || analysis.raritySuggestion || 'Common') as 'Common' | 'Rare' | 'Epic' | 'Legendary';
  const category = categoryInput || analysis.suggestedCategory || 'Crafted Artifact';
  const emoji = analysis.primaryEmoji || '✨';

  return {
    itemName: goal,
    description: `✨ Procedural Synthesis: A masterfully structured ${rarity.toLowerCase()} ${category.toLowerCase()} crafted via local heuristic generation.`,
    rarity,
    category,
    emoji,
    recipe: 'Local procedural synthesis',
    timestamp: Date.now(),
    efficiency: 1.0,
  };
}

export const synthesizeOffline = generateOfflineSynthesis;

/**
 * Executes an async API call with automatic graceful fallback on quota (429/resource exhausted) or network limits.
 */
export async function tryOfflineSynthesis(
  goal: string,
  apiCall: () => Promise<any>,
  onFallback?: (reason: string) => void
): Promise<any> {
  try {
    return await apiCall();
  } catch (error: any) {
    const msg = error?.message || '';
    const status = error?.status;
    const isRateLimitError =
      status === 429 ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('rate limit');

    if (isRateLimitError) {
      console.warn(`⚠️ API rate/quota limit reached for "${goal}". Engaging offline fallback.`);
      onFallback?.('API quota exceeded; engaged local procedural synthesis.');
      return generateOfflineSynthesis(goal);
    }

    throw error;
  }
}

/**
 * Generic try/fallback helper
 */
export async function tryWithFallback<T>(
  fn: () => Promise<T>,
  fallback: () => T,
  onError?: (reason: string) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error?.message || '';
    const status = error?.status;
    const isQuota =
      status === 429 ||
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('rate');

    if (isQuota) {
      console.warn('⚠️ API quota or rate limit caught, serving fallback');
      onError?.('API limit reached. Switching to local generation.');
      return fallback();
    }

    throw error;
  }
}
