/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Background Pixel Sprite Painter & Cache
 * Processes items asynchronously and reveals a completed, detailed 64x64 matrix.
 * New identities intentionally spend time in a visible generation state.
 */

import {
  hashString,
  shadeColor,
  getItemColor,
  detectArchetype,
} from './sprite-engine';
import {
  generateArchetypePixelMatrix64,
  PixelMatrix64,
} from './sprite-engine-64';

export type PixelMatrix = PixelMatrix64;
export type PixelMatrix24 = PixelMatrix64; // Backwards compatible alias

export interface CachedSpriteData {
  name: string;
  matrix: PixelMatrix64;
  colors?: Record<number, string>;
  createdAt: number;
  source: 'semantic';
  tags?: string[];
}

// In-memory fast cache
const memorySpriteCache = new Map<string, CachedSpriteData>();
const processingQueue = new Set<string>();
const listeners = new Set<(name: string, data: CachedSpriteData) => void>();
const SPRITE_CACHE_VERSION = 'v66_local_artisan';
const MIN_GENERATION_MS = 3400;
const GENERATION_VARIANCE_MS = 1600;

function getStorageKey(name: string): string {
  return `sprite_matrix_${SPRITE_CACHE_VERSION}_${name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;
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
// Generates completely unique 64x64 pixel art tailored strictly to the name
// ============================================================================

/**
 * Synthesizes a high-fidelity 64x64 pixel matrix tailored to any natural name
 */
export function synthesizeSemanticPixelMatrix(
  name: string,
  category: string = '',
  emoji: string = ''
): PixelMatrix64 {
  const cleanName = name.trim();
  const archetype = detectArchetype(cleanName, category, emoji);
  const seed = hashString(cleanName + category + emoji);
  return generateArchetypePixelMatrix64(archetype, seed, cleanName, category);
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

  // Give every brand-new identity a visible generation window. The duration is
  // deterministic, so remounting a card never produces erratic timing.
  const generationDelay = MIN_GENERATION_MS + (hashString(`${cleanName}:${category}`) % GENERATION_VARIANCE_MS);
  setTimeout(async () => {
    try {
      const primaryColor = getItemColor({ name: cleanName, category, rarity });
      // Sprites never consume Gemini quota. The local engine builds a crisp,
      // name-specific 64x64 matrix after the visible generation interval.
      const matrix = synthesizeSemanticPixelMatrix(cleanName, category, emoji);

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
          6: '#1e293b', // Secondary Dark (Carbon / Deep Walnut / Slate)
          7: '#64748b', // Secondary Mid (Silver / Steel)
          8: '#cbd5e1', // Secondary Light (Platinum / Chrome)
          9: '#ef4444', // Ruby / Crimson / Fire Red
          10: '#f97316', // Flame Orange / Amber
          11: '#f59e0b', // Imperial Gold / Honey Butter
          12: '#10b981', // Emerald Nature / Spore Green
          13: '#8b5cf6', // Arcane Purple Rune
          14: '#06b6d4', // Electric Cyan / Plasma Arc
          15: '#92400e', // Warm Wood Brown / Leather
          16: '#fef3c7', // Soft Cream / Pasta Ivory
          17: '#090d16', // Deep Ambient Shadow
          18: '#eab308', // Electric Yellow
          19: '#ec4899', // Neon Pink
          20: '#0f172a', // Midnight Navy
          21: '#dc2626', // Rich Red Marinara
          22: '#059669', // Fresh Mint Green
          23: '#78350f', // Roasted Brown Crust
        },
      };

      saveSpriteToCache(cleanName, cachedData);
    } catch (e) {
      console.warn('Background sprite generation failed for:', cleanName, e);
    } finally {
      processingQueue.delete(cleanName.toLowerCase());
    }
  }, generationDelay);
}
