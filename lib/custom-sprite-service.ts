/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface CustomSpriteRecord {
  id: string; // normalized key e.g. "iron_sword"
  targetName: string; // display name e.g. "Iron Sword"
  targetType: 'item' | 'tool' | 'ingredient' | 'any';
  imageUrl: string; // Data URL or Image URL
  authorId?: string;
  authorName?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'forge_custom_sprites_v1';
const listeners = new Set<(sprites: Record<string, CustomSpriteRecord>) => void>();

// In-memory cache loaded initially from localStorage for zero-latency boots
let customSpritesCache: Record<string, CustomSpriteRecord> = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

export function normalizeSpriteKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\(\)/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function notifySubscribers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customSpritesCache));
  } catch {
    // Ignore storage quota limits if base64 sprites are large
  }
  listeners.forEach((fn) => {
    try {
      fn(customSpritesCache);
    } catch (e) {
      console.error('Error notifying custom sprite subscriber:', e);
    }
  });
}

export function subscribeCustomSprites(
  callback: (sprites: Record<string, CustomSpriteRecord>) => void
): () => void {
  listeners.add(callback);
  // Send immediate cached value
  callback(customSpritesCache);
  return () => {
    listeners.delete(callback);
  };
}

export function getAllCustomSprites(): Record<string, CustomSpriteRecord> {
  return customSpritesCache;
}

export function getCustomSprite(name: string): CustomSpriteRecord | undefined {
  if (!name) return undefined;
  const key = normalizeSpriteKey(name);
  return customSpritesCache[key] || customSpritesCache[name.toLowerCase().trim()];
}

let syncInitialized = false;

export function initCustomSpritesSync(): () => void {
  if (syncInitialized) return () => {};
  syncInitialized = true;

  try {
    const spritesCol = collection(db, 'custom_sprites');
    const unsubscribe = onSnapshot(
      spritesCol,
      (snapshot) => {
        const nextMap: Record<string, CustomSpriteRecord> = { ...customSpritesCache };
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as CustomSpriteRecord;
          const id = change.doc.id;
          if (change.type === 'removed') {
            delete nextMap[id];
          } else if (data && data.imageUrl) {
            nextMap[id] = {
              id: id,
              targetName: data.targetName || id,
              targetType: data.targetType || 'any',
              imageUrl: data.imageUrl,
              authorId: data.authorId || '',
              authorName: data.authorName || 'Artisan',
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          }
        });
        customSpritesCache = nextMap;
        notifySubscribers();
      },
      (error) => {
        // Fallback gracefully without interrupting user flow if offline
        console.warn('Custom sprites real-time listener notice:', error.message);
      }
    );

    return () => {
      unsubscribe();
      syncInitialized = false;
    };
  } catch (err) {
    console.warn('Could not initialize custom sprites sync:', err);
    return () => {};
  }
}

/**
 * Optimizes an uploaded image file into a crisp 64x64 or 128x128 pixel art data URL
 */
export async function processSpriteImage(
  file: File,
  targetResolution: number = 64
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read uploaded image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetResolution;
        canvas.height = targetResolution;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Enable crisp pixelated scaling
        ctx.imageSmoothingEnabled = false;

        // Calculate aspect ratio fit (contain with transparent background)
        const scale = Math.min(targetResolution / img.width, targetResolution / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const x = Math.round((targetResolution - w) / 2);
        const y = Math.round((targetResolution - h) / 2);

        ctx.clearRect(0, 0, targetResolution, targetResolution);
        ctx.drawImage(img, x, y, w, h);

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads and saves a custom sprite override to Firestore so everyone sees it
 */
export async function saveCustomSpriteToCloud(params: {
  targetName: string;
  imageUrl: string;
  targetType?: 'item' | 'tool' | 'ingredient' | 'any';
  authorName?: string;
}): Promise<CustomSpriteRecord> {
  const { targetName, imageUrl, targetType = 'any', authorName } = params;
  const key = normalizeSpriteKey(targetName);

  if (!key) {
    throw new Error('Please provide a valid item or tool name for this sprite.');
  }
  if (!imageUrl || !imageUrl.startsWith('data:image')) {
    throw new Error('Please provide a valid image file for the sprite.');
  }

  const currentUser = auth.currentUser;
  const spriteRecord: CustomSpriteRecord = {
    id: key,
    targetName: targetName.trim(),
    targetType,
    imageUrl,
    authorId: currentUser?.uid || 'community',
    authorName: authorName || currentUser?.displayName || 'Artisan',
    updatedAt: new Date().toISOString(),
  };

  // 1. Update local cache immediately for instantaneous UI response
  customSpritesCache[key] = spriteRecord;
  notifySubscribers();

  // 2. Persist to Firestore custom_sprites collection for everyone to see
  try {
    const spriteDoc = doc(db, 'custom_sprites', key);
    await setDoc(spriteDoc, spriteRecord);
  } catch (error) {
    console.warn('Notice when saving sprite to cloud database:', error);
    // Even if cloud save hits offline mode, local cache remains available
  }

  return spriteRecord;
}

/**
 * Reverts a sprite to default procedural generation
 */
export async function deleteCustomSpriteFromCloud(targetName: string): Promise<void> {
  const key = normalizeSpriteKey(targetName);
  if (!key) return;

  delete customSpritesCache[key];
  notifySubscribers();

  try {
    const spriteDoc = doc(db, 'custom_sprites', key);
    await deleteDoc(spriteDoc);
  } catch (error) {
    console.warn('Notice when deleting sprite from cloud:', error);
  }
}
