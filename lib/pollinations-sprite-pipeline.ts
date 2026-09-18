/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pollinations Pixel-Art 64x64 Sprite Pipeline
 *
 * Implements:
 * 1. Asynchronous non-blocking background generation
 * 2. Deterministic canonical ID caching & reuse
 * 3. 8-point rich visual description integration
 * 4. Strict Pollinations prompt template
 * 5. 512x512 source generation
 * 6. Background isolation & flood-fill extraction
 * 7. Tight object cropping
 * 8. Exactly 64x64 nearest-neighbor downscaling (no anti-aliasing)
 * 9. 24-40 color quantization with hard pixel edges and transparency
 * 10. Permanent storage by canonical ID
 * 11. Retry with simplified prompt on failure
 * 12. Complete debug logging
 */

import { ResolvedItemIdentity, resolveItemIdentity, ItemResolutionInput } from './canonical-item';
import { quantizeImageDataInPlace, colorDistanceSq, RGB } from './color-quantizer';

export interface ProcessedSpriteRecord {
  canonicalId: string;
  name: string;
  displayName: string;
  dataUrl: string; // 64x64 transparent PNG
  width: 64;
  height: 64;
  createdAt: number;
  promptUsed: string;
  source: 'pollinations' | 'pollinations-retry' | 'procedural-fallback';
}

// In-memory lookup tables
const memorySpriteCacheById = new Map<string, ProcessedSpriteRecord>();
const memorySpriteCacheByName = new Map<string, ProcessedSpriteRecord>();
const pendingGenerations = new Set<string>();
const spriteReadyListeners = new Set<(record: ProcessedSpriteRecord) => void>();

const STORAGE_PREFIX = 'pollinations_sprite_v2_';
const INDEX_PREFIX = 'pollinations_index_v2_';

// ----------------------------------------------------------------------------
// Requirement 11: Structured Debug Logger
// ----------------------------------------------------------------------------
export const SpriteDebugLogger = {
  newItemCreated: (name: string, category: string) => {
    console.log(`[SpritePipeline] new item created: "${name}" [Category: ${category}]`);
  },
  canonicalId: (name: string, canonicalId: string) => {
    console.log(`[SpritePipeline] canonical ID: ${canonicalId} (Item: "${name}")`);
  },
  cacheHit: (canonicalId: string, name: string) => {
    console.log(`[SpritePipeline] cache hit: ${canonicalId} ("${name}") - reusing existing 64x64 sprite`);
  },
  cacheMiss: (canonicalId: string, name: string) => {
    console.log(`[SpritePipeline] cache miss: ${canonicalId} ("${name}") - scheduling asynchronous generation`);
  },
  imageRequestStarted: (canonicalId: string, name: string, promptPreview: string) => {
    console.log(`[SpritePipeline] image request started: [${canonicalId}] "${name}" -> Prompt: "${promptPreview.slice(0, 95)}..."`);
  },
  imageReceived: (canonicalId: string, name: string, dimensions: string) => {
    console.log(`[SpritePipeline] image received: [${canonicalId}] "${name}" (${dimensions})`);
  },
  postProcessingStarted: (canonicalId: string, name: string) => {
    console.log(`[SpritePipeline] post-processing started: [${canonicalId}] "${name}" (background isolation, crop, 64x64 nearest-neighbor, color quantization)`);
  },
  spriteSaved: (canonicalId: string, name: string) => {
    console.log(`[SpritePipeline] sprite saved: [${canonicalId}] "${name}" (64x64 transparent PNG permanently stored)`);
  },
  generationFailed: (canonicalId: string, name: string, reason: string) => {
    console.warn(`[SpritePipeline] generation failed: [${canonicalId}] "${name}" -> Reason: ${reason}`);
  },
};

// ----------------------------------------------------------------------------
// Local Storage & Memory Cache Helpers
// ----------------------------------------------------------------------------

function loadStoredRecord(canonicalId: string): ProcessedSpriteRecord | null {
  if (memorySpriteCacheById.has(canonicalId)) {
    return memorySpriteCacheById.get(canonicalId)!;
  }

  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${canonicalId}`);
    if (raw) {
      const record = JSON.parse(raw) as ProcessedSpriteRecord;
      memorySpriteCacheById.set(canonicalId, record);
      memorySpriteCacheByName.set(record.name.toLowerCase().trim(), record);
      return record;
    }
  } catch (err) {
    console.warn('[SpritePipeline] Error reading localStorage sprite record:', err);
  }
  return null;
}

export function saveStoredRecord(record: ProcessedSpriteRecord): void {
  memorySpriteCacheById.set(record.canonicalId, record);
  memorySpriteCacheByName.set(record.name.toLowerCase().trim(), record);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${record.canonicalId}`, JSON.stringify(record));
      localStorage.setItem(`${INDEX_PREFIX}${record.name.toLowerCase().trim()}`, record.canonicalId);
    } catch (err) {
      console.warn('[SpritePipeline] localStorage write warning (quota possibly exceeded):', err);
    }
  }

  // Notify active UI subscribers
  spriteReadyListeners.forEach((fn) => {
    try {
      fn(record);
    } catch (e) {
      // Ignore listener error
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pollinations-sprite-ready', {
        detail: record,
      })
    );
  }
}

/**
 * Check if a sprite is already permanently saved
 */
export function getSavedSprite(canonicalIdOrName: string): ProcessedSpriteRecord | null {
  if (!canonicalIdOrName) return null;
  const clean = canonicalIdOrName.trim();

  // Try direct ID lookup
  const byId = loadStoredRecord(clean);
  if (byId) return byId;

  // Try name lookup
  const cleanName = clean.toLowerCase();
  if (memorySpriteCacheByName.has(cleanName)) {
    return memorySpriteCacheByName.get(cleanName)!;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const mappedId = localStorage.getItem(`${INDEX_PREFIX}${cleanName}`);
      if (mappedId) {
        return loadStoredRecord(mappedId);
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export function isSpriteGenerating(canonicalIdOrName: string): boolean {
  if (!canonicalIdOrName) return false;
  return pendingGenerations.has(canonicalIdOrName.toLowerCase().trim());
}

export function subscribeSpriteReady(callback: (record: ProcessedSpriteRecord) => void): () => void {
  spriteReadyListeners.add(callback);
  return () => {
    spriteReadyListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Requirement 5: Prompt Template
// ----------------------------------------------------------------------------
export function buildPollinationsPrompt(itemName: string, detailedVisualDescription: string): string {
  return `single isolated inventory item: ${itemName}, ${detailedVisualDescription}, authentic 16-bit pixel art RPG inventory sprite, highly readable silhouette, dark fantasy style, limited palette, thick dark outline, top-left lighting, small specular highlights, centered object, no text, no hands, no environment, no scene, plain contrasting background, designed to remain readable when reduced to 64x64`;
}

export function buildSimplifiedPollinationsPrompt(itemName: string): string {
  return `single isolated inventory item: ${itemName}, authentic 16-bit pixel art RPG inventory sprite, highly readable silhouette, dark fantasy style, limited palette, thick dark outline, centered object, no text, no hands, plain contrasting background, 64x64 icon`;
}

// ----------------------------------------------------------------------------
// Requirement 6 & 9: Pollinations Fetcher
// ----------------------------------------------------------------------------
async function fetchPollinationsImage(
  prompt: string,
  seed: number,
  timeoutMs: number = 22000
): Promise<HTMLImageElement> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}`;

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout after ${timeoutMs}ms waiting for Pollinations`));
    }, timeoutMs);

    fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Pollinations HTTP error ${res.status} ${res.statusText}`);
        }
        return res.blob();
      })
      .then((blob) => {
        clearTimeout(timer);
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to decode image from blob'));
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        clearTimeout(timer);
        // Fallback: direct Image element load attempt
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(err);
        fallbackImg.src = url;
      });
  });
}

// ----------------------------------------------------------------------------
// Requirement 7: Canvas Post-Processing Engine
// ----------------------------------------------------------------------------

/**
 * Post-processes a 512x512 source image into an authentic 64x64 pixel art sprite:
 * 1. Background isolation via flood-fill from border pixels
 * 2. Tight bounding box cropping around the centered object
 * 3. Downscale to exactly 64x64 using nearest-neighbor scaling (imageSmoothingEnabled = false)
 * 4. 24-40 color quantization
 * 5. Hard pixel edges and clean alpha transparency
 */
export function processRawImageTo64Sprite(sourceImage: HTMLImageElement): string {
  // Step 1: Draw source image to 512x512 canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = 512;
  srcCanvas.height = 512;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not get 2d context for 512x512 canvas');

  srcCtx.drawImage(sourceImage, 0, 0, 512, 512);
  const srcImageData = srcCtx.getImageData(0, 0, 512, 512);
  const pixels = srcImageData.data;

  // Step 2: Sample border pixels to detect background color
  const samplePoints: RGB[] = [];
  // Sample along perimeter at 16px intervals
  for (let x = 0; x < 512; x += 16) {
    let offTop = x * 4;
    samplePoints.push({ r: pixels[offTop], g: pixels[offTop + 1], b: pixels[offTop + 2] });
    let offBottom = (511 * 512 + x) * 4;
    samplePoints.push({ r: pixels[offBottom], g: pixels[offBottom + 1], b: pixels[offBottom + 2] });
  }
  for (let y = 0; y < 512; y += 16) {
    let offLeft = y * 512 * 4;
    samplePoints.push({ r: pixels[offLeft], g: pixels[offLeft + 1], b: pixels[offLeft + 2] });
    let offRight = (y * 512 + 511) * 4;
    samplePoints.push({ r: pixels[offRight], g: pixels[offRight + 1], b: pixels[offRight + 2] });
  }

  // Calculate median / average background color
  const bgAvg: RGB = samplePoints.reduce(
    (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
    { r: 0, g: 0, b: 0 }
  );
  bgAvg.r = Math.round(bgAvg.r / samplePoints.length);
  bgAvg.g = Math.round(bgAvg.g / samplePoints.length);
  bgAvg.b = Math.round(bgAvg.b / samplePoints.length);

  // Step 3: Flood-fill background mask from borders inwards
  const bgMask = new Uint8Array(512 * 512);
  const queue: number[] = [];
  const colorToleranceSq = 52 * 52; // Color distance tolerance threshold

  const enqueueBorder = (idx: number) => {
    if (bgMask[idx]) return;
    const off = idx * 4;
    const currentRgb: RGB = { r: pixels[off], g: pixels[off + 1], b: pixels[off + 2] };
    if (pixels[off + 3] < 60 || colorDistanceSq(currentRgb, bgAvg) <= colorToleranceSq) {
      bgMask[idx] = 1;
      queue.push(idx);
    }
  };

  // Seed with all 4 boundary lines
  for (let i = 0; i < 512; i++) {
    enqueueBorder(i); // Top
    enqueueBorder(511 * 512 + i); // Bottom
    enqueueBorder(i * 512); // Left
    enqueueBorder(i * 512 + 511); // Right
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % 512;
    const y = Math.floor(idx / 512);

    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < 511 ? idx + 1 : -1,
      y > 0 ? idx - 512 : -1,
      y < 511 ? idx + 512 : -1,
    ];

    for (let n = 0; n < neighbors.length; n++) {
      const nIdx = neighbors[n];
      if (nIdx >= 0 && !bgMask[nIdx]) {
        const off = nIdx * 4;
        const nRgb: RGB = { r: pixels[off], g: pixels[off + 1], b: pixels[off + 2] };
        if (pixels[off + 3] < 60 || colorDistanceSq(nRgb, bgAvg) <= colorToleranceSq) {
          bgMask[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }
  }

  // Clear background pixels to alpha 0
  for (let i = 0; i < 512 * 512; i++) {
    if (bgMask[i]) {
      pixels[i * 4 + 3] = 0;
    }
  }
  srcCtx.putImageData(srcImageData, 0, 0);

  // Step 4: Find bounding box of foreground pixels (alpha >= 40)
  let minX = 512;
  let maxX = 0;
  let minY = 512;
  let maxY = 0;
  let foregroundCount = 0;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      if (pixels[idx + 3] >= 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foregroundCount++;
      }
    }
  }

  // Safety fallback if silhouette wasn't found or filled completely
  if (foregroundCount < 100 || minX >= maxX || minY >= maxY) {
    minX = 64;
    maxX = 448;
    minY = 64;
    maxY = 448;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const maxDim = Math.max(cropW, cropH);
  // Add 6% margin so pixel art doesn't touch canvas edges
  const padding = Math.max(8, Math.round(maxDim * 0.06));
  const squareDim = maxDim + padding * 2;

  // Center bounding box inside square crop
  const cropCenterX = minX + cropW / 2;
  const cropCenterY = minY + cropH / 2;
  const sourceCropX = Math.max(0, Math.min(512 - squareDim, Math.round(cropCenterX - squareDim / 2)));
  const sourceCropY = Math.max(0, Math.min(512 - squareDim, Math.round(cropCenterY - squareDim / 2)));
  const actualCropSize = Math.min(squareDim, 512 - sourceCropX, 512 - sourceCropY);

  // Step 5: Downscale to exactly 64x64 using nearest-neighbor scaling
  const destCanvas = document.createElement('canvas');
  destCanvas.width = 64;
  destCanvas.height = 64;
  const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
  if (!destCtx) throw new Error('Could not get 2d context for 64x64 canvas');

  // Disable all anti-aliasing / smoothing to preserve crisp pixel clusters
  destCtx.imageSmoothingEnabled = false;
  destCtx.clearRect(0, 0, 64, 64);

  // Draw cropped object into 64x64 canvas
  destCtx.drawImage(
    srcCanvas,
    sourceCropX,
    sourceCropY,
    actualCropSize,
    actualCropSize,
    0,
    0,
    64,
    64
  );

  // Step 6: Quantize colors to ~24-40 colors with hard pixel edges
  const targetImageData = destCtx.getImageData(0, 0, 64, 64);
  quantizeImageDataInPlace(targetImageData, 32);
  destCtx.putImageData(targetImageData, 0, 0);

  // Step 7: Export final 64x64 transparent PNG
  return destCanvas.toDataURL('image/png');
}

// ----------------------------------------------------------------------------
// Requirement 1, 2, 8, 9, 10: Asynchronous Pipeline Entry Point
// ----------------------------------------------------------------------------

/**
 * Trigger asynchronous sprite generation for an item.
 * 1. Checks if canonical ID already has a cached sprite (never regenerates unnecessarily).
 * 2. Fully resolves identity & visual description.
 * 3. Shows placeholder while generating in background.
 * 4. Calls Pollinations, post-processes to 64x64 PNG, and permanently saves record.
 */
export async function requestPollinationsSprite(
  input: ItemResolutionInput
): Promise<ProcessedSpriteRecord | null> {
  const item: ResolvedItemIdentity = resolveItemIdentity(input);
  const { canonicalId, displayName } = item;

  // Requirement 11 log: new item created & canonical ID
  SpriteDebugLogger.newItemCreated(displayName, item.category);
  SpriteDebugLogger.canonicalId(displayName, canonicalId);

  // Requirement 2: Check cache before generating
  const existing = getSavedSprite(canonicalId);
  if (existing) {
    SpriteDebugLogger.cacheHit(canonicalId, displayName);
    return existing;
  }

  SpriteDebugLogger.cacheMiss(canonicalId, displayName);

  // Prevent duplicate in-flight requests for the same identity
  if (pendingGenerations.has(canonicalId)) {
    return null;
  }
  pendingGenerations.add(canonicalId);
  pendingGenerations.add(displayName.toLowerCase().trim());

  // Execute asynchronously in background task (Requirement 10)
  setTimeout(async () => {
    try {
      const prompt = buildPollinationsPrompt(displayName, item.visualDescription);
      const seed = Math.abs(parseInt(canonicalId.slice(-8), 16)) || 4242;

      SpriteDebugLogger.imageRequestStarted(canonicalId, displayName, prompt);

      let sourceImage: HTMLImageElement | null = null;
      let usedSource: ProcessedSpriteRecord['source'] = 'pollinations';

      try {
        sourceImage = await fetchPollinationsImage(prompt, seed, 22000);
      } catch (err: any) {
        // Requirement 9: Retry once with simplified prompt
        SpriteDebugLogger.generationFailed(
          canonicalId,
          displayName,
          `Initial prompt error: ${err?.message || err}. Retrying with simplified prompt...`
        );

        const simplifiedPrompt = buildSimplifiedPollinationsPrompt(displayName);
        SpriteDebugLogger.imageRequestStarted(canonicalId, displayName, simplifiedPrompt);
        try {
          sourceImage = await fetchPollinationsImage(simplifiedPrompt, seed + 1, 22000);
          usedSource = 'pollinations-retry';
        } catch (retryErr: any) {
          SpriteDebugLogger.generationFailed(
            canonicalId,
            displayName,
            `Retry failed: ${retryErr?.message || retryErr}`
          );
        }
      }

      if (sourceImage) {
        SpriteDebugLogger.imageReceived(
          canonicalId,
          displayName,
          `${sourceImage.naturalWidth || 512}x${sourceImage.naturalHeight || 512}`
        );

        SpriteDebugLogger.postProcessingStarted(canonicalId, displayName);
        const dataUrl = processRawImageTo64Sprite(sourceImage);

        const record: ProcessedSpriteRecord = {
          canonicalId,
          name: item.name,
          displayName,
          dataUrl,
          width: 64,
          height: 64,
          createdAt: Date.now(),
          promptUsed: prompt,
          source: usedSource,
        };

        saveStoredRecord(record);
        SpriteDebugLogger.spriteSaved(canonicalId, displayName);
      }
    } catch (pipelineErr: any) {
      SpriteDebugLogger.generationFailed(
        canonicalId,
        displayName,
        `Pipeline exception: ${pipelineErr?.message || pipelineErr}`
      );
    } finally {
      pendingGenerations.delete(canonicalId);
      pendingGenerations.delete(displayName.toLowerCase().trim());
    }
  }, 100);

  return null;
}
