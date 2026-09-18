/**
 * Pre-computation for Common Synthesis Items
 * Populates cache with common starter recipes to prevent redundant API calls
 */

import { cacheSynthesisResult, createSynthesisKey, getCachedSynthesis } from './synthesis-cache';
import { saveSpriteToCache } from './background-sprite-painter';
import { saveStoredRecord, getSavedSprite } from './pollinations-sprite-pipeline';
import { computeCanonicalItemId } from './canonical-item';
import { drawProceduralSprite64 } from './sprite-engine-64';
import { getItemColor } from './sprite-engine';
import { STARTING_INGREDIENTS, COOKING_ACTIONS, PRESET_IDEAS } from '../constants';

export const COMMON_ITEMS = [
  {
    name: 'Laser Sword',
    rarity: 'Epic',
    category: 'Weapon',
    emoji: '⚔️',
    description: 'A plasma-charged energy blade constructed from refined steel, focusing crystals, and a plasma emitter.',
    recipe: 'Refined Steel Ingot + Tempered Blade Core + Focusing Emitter Matrix',
  },
  {
    name: 'Potion of Invisibility',
    rarity: 'Rare',
    category: 'Alchemy',
    emoji: '🧪',
    description: 'An ethereal translucent elixir brewed from arcane powder, starlight, and mana distillate.',
    recipe: 'Purified Arcane Powder + Concentrated Mana Distillate + Radiant Spectral Essence',
  },
  {
    name: 'Cybernetic Watch',
    rarity: 'Rare',
    category: 'Tech',
    emoji: '⌚',
    description: 'A compact wearable timepiece containing a synaptic micro-controller, neural power unit, and precision housing.',
    recipe: 'Circuit Substrate + Micro-Controller Firmware + Powered Neural Power Unit',
  },
  {
    name: 'Tonkotsu Ramen',
    rarity: 'Common',
    category: 'Gourmet',
    emoji: '🍜',
    description: 'A steaming bowl of artisan wheat noodles in a rich reduction broth garnished with herbs.',
    recipe: 'Artisan Culinary Base Dough + Aromatic Reduction Sauce + Fine Garnish',
  },
  {
    name: 'Refined Steel Ingot',
    rarity: 'Common',
    category: 'Component',
    emoji: '🧱',
    description: 'A dense ingot of high-grade smelted iron and purified coal.',
    recipe: 'Iron Ore + Coal',
  },
  {
    name: 'High-Density Circuit Substrate',
    rarity: 'Common',
    category: 'Component',
    emoji: '🟫',
    description: 'A laser-etched silicon wafer laced with conductive copper tracing.',
    recipe: 'Silicon + Copper Wire',
  },
  {
    name: 'Space Shuttle',
    rarity: 'Legendary',
    category: 'Vehicle',
    emoji: '🚀',
    description: 'A reinforced orbital space transport with heat shields, ion thrusters, and guidance computers.',
    recipe: 'Aerospace Alloy Hull + Ion Propulsion Core + Guidance Computer',
  },
  {
    name: 'Gourmet Truffle Pizza',
    rarity: 'Epic',
    category: 'Culinary',
    emoji: '🍕',
    description: 'Wood-fired artisan pizza with fermented dough, San Marzano sauce, fresh mozzarella, and shaved truffles.',
    recipe: 'Wood-Fired Crust + Marinara Glaze + Shaved Truffle Mozzarella',
  },
  {
    name: 'Phoenix Feather Wand',
    rarity: 'Legendary',
    category: 'Magic',
    emoji: '🪄',
    description: 'A carved elderwood wand encasing an authentic radiant phoenix feather core.',
    recipe: 'Carved Elderwood Wand + Phoenix Feather Core + Arcane Binding Rune',
  },
  {
    name: 'Quantum Core Reactor',
    rarity: 'Legendary',
    category: 'Tech',
    emoji: '⚛️',
    description: 'A toroidal magnetic containment reactor producing zero-point quantum plasma.',
    recipe: 'Superconducting Toroid + Plasma Chamber + Quantum Containment Shield',
  },
];

/**
 * Procedurally render a 64x64 pixel sprite and save to fast memory + local storage caches
 */
export function pregenerateSprite(
  name: string,
  category: string = 'general',
  emoji: string = '✨',
  rarity: string = 'Common'
): string | null {
  if (typeof document === 'undefined') return null;

  try {
    const canonicalId = computeCanonicalItemId({
      name,
      category,
      emoji,
      rarity,
    });

    // Check if already in persistent Pollinations / procedural cache
    const existing = getSavedSprite(canonicalId) || getSavedSprite(name);
    if (existing?.dataUrl) {
      return existing.dataUrl;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const computedColor = getItemColor({ name, category, rarity });
    drawProceduralSprite64(
      canvas,
      {
        name,
        category,
        emoji,
        color: computedColor,
        rarity: rarity as any,
      },
      64
    );

    const dataUrl = canvas.toDataURL('image/png');

    // Save to Pollinations pipeline cache
    saveStoredRecord({
      canonicalId,
      name,
      displayName: name,
      dataUrl,
      width: 64,
      height: 64,
      createdAt: Date.now(),
      promptUsed: 'High-Fidelity 64x64 Procedural Pixel Art',
      source: 'procedural-fallback',
    });

    // Save to background sprite matrix cache
    saveSpriteToCache(name, {
      name,
      canonicalId,
      dataUrl,
      matrix: [],
      createdAt: Date.now(),
      source: 'semantic',
    });

    return dataUrl;
  } catch (err) {
    console.warn(`[Precompute] Failed to pregenerate sprite for "${name}":`, err);
    return null;
  }
}

/**
 * Pre-compute synthesis cache and generate proper 64x64 sprites on initial load
 */
export function initializePrecomputation(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Pre-generate proper sprites for all 40 Starting Ingredients
    for (const ing of STARTING_INGREDIENTS) {
      pregenerateSprite(ing.name, ing.category, ing.emoji, 'Common');
    }

    // 2. Pre-generate proper sprites for all 100 Crafting Tools & Actions
    for (const act of COOKING_ACTIONS) {
      pregenerateSprite(act.name, act.category || 'tool', act.emoji, 'Common');
      if (act.displayName && act.displayName !== act.name) {
        pregenerateSprite(act.displayName, act.category || 'tool', act.emoji, 'Common');
      }
    }

    // 3. Pre-generate proper sprites for all 8 Preset Masterpieces
    for (const preset of PRESET_IDEAS) {
      pregenerateSprite(preset.name, preset.tag || 'Masterpiece', preset.emoji, 'Epic');
    }

    // 4. Pre-compute synthesis cache and sprites for Common Items
    for (const item of COMMON_ITEMS) {
      const key = createSynthesisKey([], [], item.name);
      if (!getCachedSynthesis(key)) {
        cacheSynthesisResult(key, {
          itemName: item.name,
          description: item.description,
          rarity: item.rarity,
          category: item.category,
          emoji: item.emoji,
          recipe: item.recipe,
          efficiency: 1.0,
        });
      }
      pregenerateSprite(item.name, item.category, item.emoji, item.rarity);
    }

    console.log('⚡ High-fidelity 64x64 pixel sprites pregenerated for all ingredients, tools, and presets.');
  } catch (e) {
    console.warn('Precomputation notice:', e);
  }
}
