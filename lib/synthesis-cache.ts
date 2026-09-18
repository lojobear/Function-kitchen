/**
 * Synthesis Result Cache
 * Stores crafted items to prevent re-synthesizing identical requests
 * Acts as a permanent cache that survives page reloads
 */

export interface SynthesisResult {
  itemName: string;
  description: string;
  rarity: string;
  category: string;
  emoji: string;
  ingredients?: string[];
  recipe?: string;
  timestamp?: number;
  efficiency?: number;
}

export interface SynthesisCacheEntry {
  key: string;
  result: SynthesisResult;
  timestamp: number;
  hitCount: number;
}

const CACHE_STORAGE_KEY = 'synthesis_cache_v1';
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 1000; // Max items to store
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory cache for instant access
let memoryCache = new Map<string, SynthesisCacheEntry>();
let isInitialized = false;

// Event listener callbacks for cache updates
type CacheChangeListener = () => void;
const listeners = new Set<CacheChangeListener>();

export function subscribeToCacheChanges(listener: CacheChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Cache listener error:', e);
    }
  });
}

// Load from storage on startup
function initializeCache() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data && (data.version === CACHE_VERSION || Array.isArray(data))) {
        const entries: [string, SynthesisCacheEntry][] = Array.isArray(data)
          ? data
          : data.entries || [];
        memoryCache = new Map(entries);
      }
    }
  } catch (e) {
    console.warn('Failed to load synthesis cache:', e);
  }
}

// Save cache to localStorage
function persistCache() {
  try {
    if (typeof window === 'undefined') return;

    const entries = Array.from(memoryCache.entries());
    localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify({ version: CACHE_VERSION, entries })
    );
    notifyListeners();
  } catch (e) {
    // Storage full or quota exceeded, silently keep working in memory
    console.warn('Cache persist notice:', e);
  }
}

/**
 * Create a cache key from synthesis request parameters
 */
export function createSynthesisKey(
  ingredients: string[] = [],
  actions: string[] = [],
  goal: string = ''
): string {
  const sortedIngredients = [...ingredients].map((i) => i.trim().toLowerCase()).sort();
  const sortedActions = [...actions].map((a) => a.trim().toLowerCase()).sort();
  const normalizedGoal = goal.trim().toLowerCase();

  const normalized = [
    sortedIngredients.join('|'),
    sortedActions.join('|'),
    normalizedGoal,
  ].join('::');

  try {
    return btoa(encodeURIComponent(normalized));
  } catch {
    return normalized;
  }
}

// Alias matching quickstart guide
export const createCacheKey = createSynthesisKey;

/**
 * Get cached synthesis result if available
 */
export function getCachedSynthesis(key: string): SynthesisResult | null {
  initializeCache();

  const entry = memoryCache.get(key);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    memoryCache.delete(key);
    persistCache();
    return null;
  }

  // Track hits
  entry.hitCount = (entry.hitCount || 0) + 1;
  persistCache();

  console.log(`✅ Synthesis Cache hit (${entry.hitCount}x): ${entry.result.itemName}`);
  return entry.result;
}

/**
 * Store synthesis result in cache
 */
export function cacheSynthesisResult(key: string, result: SynthesisResult): void {
  initializeCache();

  // Evict oldest entry if cache is full
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;

    memoryCache.forEach((entry, k) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = k;
      }
    });

    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }

  memoryCache.set(key, {
    key,
    result: {
      ...result,
      timestamp: result.timestamp || Date.now(),
    },
    timestamp: Date.now(),
    hitCount: 0,
  });

  persistCache();
  console.log(`💾 Cached synthesis: ${result.itemName}`);
}

// Alias matching quickstart guide
export const cacheSynthesis = cacheSynthesisResult;

/**
 * Get cache statistics
 */
export function getCacheStats() {
  initializeCache();

  let totalHits = 0;
  memoryCache.forEach((entry) => {
    totalHits += entry.hitCount || 0;
  });

  return {
    size: memoryCache.size,
    totalHits,
    estimatedSavedCalls: totalHits,
    apiCallsSaved: totalHits,
    estimatedAPICallsSaved: totalHits,
  };
}

/**
 * Clear cache
 */
export function clearSynthesisCache(): void {
  initializeCache();
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }
  notifyListeners();
}

// Alias matching quickstart guide
export const clearCache = clearSynthesisCache;

/**
 * Get all cached items (for monitoring and preview)
 */
export function getAllCachedSynthesis(): SynthesisCacheEntry[] {
  initializeCache();
  return Array.from(memoryCache.values());
}
