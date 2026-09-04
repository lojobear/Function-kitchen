/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Background Pixel Sprite Painter & Cache
 * Processes items asynchronously and reveals a completed, detailed 64x64 matrix.
 * New identities intentionally spend time in a visible generation state.
 */

import { GoogleGenAI } from '@google/genai';
import {
  hashString,
  shadeColor,
  getItemColor,
  detectArchetype,
  hexToRgb,
} from './sprite-engine';
import {
  addAutomaticOutlines64,
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
  source: 'ai' | 'semantic';
  tags?: string[];
}

// In-memory fast cache
const memorySpriteCache = new Map<string, CachedSpriteData>();
const processingQueue = new Set<string>();
const listeners = new Set<(name: string, data: CachedSpriteData) => void>();
const SPRITE_CACHE_VERSION = 'v65_semantic_identity';
const MIN_GENERATION_MS = 1200;
const GENERATION_VARIANCE_MS = 900;
let imageClient: GoogleGenAI | null = null;

export interface SpriteGenerationOptions {
  preferAI?: boolean;
}

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

function getImageClient(): GoogleGenAI | null {
  if (imageClient) return imageClient;
  const apiKey = typeof process !== 'undefined'
    ? process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY || process.env?.API_KEY
    : '';
  if (!apiKey || apiKey === 'placeholder_key') return null;
  imageClient = new GoogleGenAI({ apiKey });
  return imageClient;
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The generated sprite image could not be decoded.'));
    image.src = dataUrl;
  });
}

async function generatedImageToMatrix(
  data: string,
  mimeType: string,
  primaryColor: string
): Promise<PixelMatrix64> {
  const image = await loadImage(`data:${mimeType};base64,${data}`);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable for sprite conversion.');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 64, 64);
  const scale = Math.min(64 / image.width, 64 / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  ctx.drawImage(image, Math.floor((64 - width) / 2), Math.floor((64 - height) / 2), width, height);

  const pixels = ctx.getImageData(0, 0, 64, 64).data;
  const cornerIndexes = [0, 63, 63 * 64, 64 * 64 - 1];
  const background = cornerIndexes.reduce((sum, index) => {
    const offset = index * 4;
    return {
      r: sum.r + pixels[offset],
      g: sum.g + pixels[offset + 1],
      b: sum.b + pixels[offset + 2],
    };
  }, { r: 0, g: 0, b: 0 });
  background.r /= cornerIndexes.length;
  background.g /= cornerIndexes.length;
  background.b /= cornerIndexes.length;

  // Flood-fill a flat or gently shaded generated background from the canvas
  // edges. This preserves enclosed highlights/details while producing alpha.
  const backgroundMask = new Uint8Array(64 * 64);
  const queue: number[] = [];
  const enqueueBackgroundPixel = (index: number) => {
    if (backgroundMask[index]) return;
    const offset = index * 4;
    const rgb = { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
    if (pixels[offset + 3] < 72 || colorDistance(rgb, background) < 68) {
      backgroundMask[index] = 1;
      queue.push(index);
    }
  };
  for (let i = 0; i < 64; i++) {
    enqueueBackgroundPixel(i);
    enqueueBackgroundPixel(63 * 64 + i);
    enqueueBackgroundPixel(i * 64);
    enqueueBackgroundPixel(i * 64 + 63);
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const x = index % 64;
    const y = Math.floor(index / 64);
    if (x > 0) enqueueBackgroundPixel(index - 1);
    if (x < 63) enqueueBackgroundPixel(index + 1);
    if (y > 0) enqueueBackgroundPixel(index - 64);
    if (y < 63) enqueueBackgroundPixel(index + 64);
  }

  const paletteHex = [
    '#040711',
    shadeColor(primaryColor, -45),
    primaryColor,
    shadeColor(primaryColor, 40),
    '#ffffff',
    '#1e293b',
    '#64748b',
    '#cbd5e1',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#8b5cf6',
    '#06b6d4',
    '#92400e',
    '#fef3c7',
    '#090d16',
    '#eab308',
    '#ec4899',
    '#0f172a',
    '#dc2626',
    '#059669',
    '#78350f',
  ];
  const palette = paletteHex.map(hexToRgb);
  const matrix: PixelMatrix64 = Array.from({ length: 64 }, () => new Array(64).fill(0));
  let occupied = 0;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const offset = (y * 64 + x) * 4;
      const alpha = pixels[offset + 3];
      const rgb = { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
      if (alpha < 72 || backgroundMask[y * 64 + x]) continue;

      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < palette.length; i++) {
        const distance = colorDistance(rgb, palette[i]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = i;
        }
      }
      matrix[y][x] = nearest + 1;
      occupied += 1;
    }
  }

  if (occupied < 90 || occupied > 3300) {
    throw new Error('Generated artwork did not isolate cleanly as a sprite.');
  }

  addAutomaticOutlines64(matrix);
  return matrix;
}

async function synthesizeAISpriteMatrix(
  name: string,
  category: string,
  rarity: string,
  primaryColor: string
): Promise<PixelMatrix64 | null> {
  const client = getImageClient();
  if (!client || typeof document === 'undefined') return null;

  const prompt = `Create exactly one isolated RPG inventory sprite representing "${name}" (${category || 'crafted item'}, ${rarity}).

Hard requirements:
- true old-school pixel art designed on a logical 64 by 64 grid
- immediately recognizable, name-specific silhouette; do not reuse a generic orb, badge, or template
- dark fantasy crafting-game style with a vibrant limited palette
- crisp hard pixel clusters, no anti-aliasing, thick near-black outline
- top-left lighting with 1-2 pixel white specular highlights
- centered with an 8 pixel margin
- transparent alpha background: no scenery, card, frame, floor, shadow, glow, halo, text, or UI
- if this is a process, depict the actual tool action/process rather than a symbol`;

  const interaction = await client.interactions.create({
    model: 'gemini-3.1-flash-image',
    input: prompt,
    response_modalities: ['image'],
    response_format: {
      type: 'image',
      mime_type: 'image/png',
      aspect_ratio: '1:1',
      image_size: '512',
    },
  });

  const imageOutput = interaction.outputs?.find(
    (output: any) => output?.type === 'image' && output?.data
  ) as { data?: string; mime_type?: string } | undefined;
  if (!imageOutput?.data) return null;

  return generatedImageToMatrix(
    imageOutput.data,
    imageOutput.mime_type || 'image/png',
    primaryColor
  );
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
  rarity: string = 'Common',
  options: SpriteGenerationOptions = {}
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
      let matrix: PixelMatrix64 | null = null;
      let source: CachedSpriteData['source'] = 'semantic';

      if (options.preferAI) {
        try {
          matrix = await synthesizeAISpriteMatrix(cleanName, category, rarity, primaryColor);
          if (matrix) source = 'ai';
        } catch (error) {
          console.warn('AI sprite generation unavailable; using semantic 64x64 fallback:', error);
        }
      }

      // Guaranteed offline/quota fallback. It is still a name-specific 64x64
      // matrix, but AI image generation is preferred for newly created entries.
      matrix ||= synthesizeSemanticPixelMatrix(cleanName, category, emoji);

      const cachedData: CachedSpriteData = {
        name: cleanName,
        matrix,
        createdAt: Date.now(),
        source,
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
