/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Background Pixel Sprite Painter & Cache
 * Processes items asynchronously in the background so crafting is 100% instant and never blocked.
 * Synthesizes ultra-detailed 24x24 pixel art matrices matching the exact item name.
 */

import { GoogleGenAI } from '@google/genai';
import {
  hashString,
  SpritePRNG,
  shadeColor,
  getItemColor,
  detectArchetype,
  generateArchetypePixelMatrix,
} from './sprite-engine';

export type PixelMatrix24 = number[][];

export interface CachedSpriteData {
  name: string;
  matrix: PixelMatrix24;
  colors?: Record<number, string>;
  createdAt: number;
  source: 'ai' | 'semantic';
  tags?: string[];
}

// In-memory fast cache
const memorySpriteCache = new Map<string, CachedSpriteData>();
const processingQueue = new Set<string>();
const listeners = new Set<(name: string, data: CachedSpriteData) => void>();

function getStorageKey(name: string): string {
  return `sprite_matrix_v5_${name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Check if a sprite already exists in memory or localStorage cache
 */
export function getCachedSprite(name: string): CachedSpriteData | null {
  if (!name) return null;
  const cleanName = name.toLowerCase().trim();
  if (memorySpriteCache.has(cleanName)) {
    return memorySpriteCache.get(cleanName)!;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(getStorageKey(cleanName));
      if (raw) {
        const parsed = JSON.parse(raw) as CachedSpriteData;
        memorySpriteCache.set(cleanName, parsed);
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Save sprite to cache and notify all listeners
 */
export function saveSpriteToCache(name: string, data: CachedSpriteData) {
  const cleanName = name.toLowerCase().trim();
  memorySpriteCache.set(cleanName, data);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(getStorageKey(cleanName), JSON.stringify(data));
    } catch {
      // Storage might be full
    }
  }

  // Notify listeners
  listeners.forEach((fn) => {
    try {
      fn(name, data);
    } catch {
      // Ignore listener error
    }
  });

  // Custom DOM event for easy component binding
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('item-sprite-updated', {
        detail: { name, data },
      })
    );
  }
}

/**
 * Subscribe to sprite updates
 */
export function onSpriteUpdated(fn: (name: string, data: CachedSpriteData) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ============================================================================
// Semantic Pixel Matrix Synthesizer
// Generates completely unique 24x24 pixel art tailored strictly to the name
// ============================================================================

/**
 * Synthesizes a high-fidelity 24x24 pixel matrix tailored to any natural name
 */
export function synthesizeSemanticPixelMatrix(
  name: string,
  category: string = '',
  emoji: string = ''
): PixelMatrix24 {
  const cleanName = name.trim();
  const archetype = detectArchetype(cleanName, category, emoji);
  const seed = hashString(cleanName + category + emoji);
  return generateArchetypePixelMatrix(archetype, seed, cleanName, category);
}

// ============================================================================
// Background Worker / Painter Queue
// ============================================================================

/**
 * Enqueue an item to be synthesized in the background.
 * Completely non-blocking and executes asynchronously.
 */
export function enqueueBackgroundSpriteGeneration(
  name: string,
  category: string = '',
  emoji: string = '',
  rarity: string = 'Common'
) {
  if (!name || !name.trim()) return;
  const cleanName = name.trim();

  // If already cached, nothing to do!
  if (getCachedSprite(cleanName)) return;

  // Prevent duplicate concurrent jobs
  if (processingQueue.has(cleanName.toLowerCase())) return;
  processingQueue.add(cleanName.toLowerCase());

  // Execute on next tick in the background
  setTimeout(async () => {
    try {
      // 1. Synthesize detailed semantic pixel matrix
      const matrix = synthesizeSemanticPixelMatrix(cleanName, category, emoji);
      const primaryColor = getItemColor({ name: cleanName, category, rarity });

      const cachedData: CachedSpriteData = {
        name: cleanName,
        matrix,
        createdAt: Date.now(),
        source: 'semantic',
        colors: {
          0: 'transparent',
          1: '#040711', // Deep Dark RPG Contour Outline
          2: shadeColor(primaryColor, -45), // Deep Shadow
          3: primaryColor, // Base Mid-tone
          4: shadeColor(primaryColor, 40), // Specular Highlight
          5: '#ffffff', // Radiant Core Pure White
          6: '#334155', // Secondary Dark (Gunmetal / Deep Walnut)
          7: '#94a3b8', // Secondary Light (Silver / Polished Steel)
          8: '#ef4444', // Ruby / Crimson Plasma
          9: '#f87171', // Gem Specular
          10: '#f59e0b', // Imperial Gold / Honey Butter
          11: '#10b981', // Emerald Nature / Spore Green
          12: '#38bdf8', // Ice Sheen / Distillation Glass
          13: '#c084fc', // Arcane Purple Rune
          14: '#06b6d4', // Cyan Plasma Arc
          15: '#0f172a', // Ambient Shadow
        },
      };

      saveSpriteToCache(cleanName, cachedData);
    } catch (e) {
      console.warn('Background sprite generation failed for:', cleanName, e);
    } finally {
      processingQueue.delete(cleanName.toLowerCase());
    }
  }, 0);
}
