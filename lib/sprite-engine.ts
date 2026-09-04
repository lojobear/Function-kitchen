/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Procedural Pixel-Art Sprite Synthesis Engine
 * Generates completely bespoke, distinct, high-detail pixel-art matrices for every item and tool.
 * Features 60+ bespoke handcrafted procedural templates with dynamic seed variations,
 * auto-framing, rich 16-color material shading, and automatic high-contrast RPG outlines.
 */

export interface SpriteConfig {
  name: string;
  emoji?: string;
  category?: string;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  color?: string;
  seed?: number;
  type?: 'ingredient' | 'tool' | 'finished_item';
}

// ----------------------------------------------------------------------------
// Deterministic Hash & Fast PRNG
// ----------------------------------------------------------------------------

export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export class SpritePRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? (seed >>> 0) : 123456789;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(chance: number = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ----------------------------------------------------------------------------
// Rarity Configurations & Palettes
// ----------------------------------------------------------------------------

export const RARITY_PALETTES = {
  Common: {
    border: '#9ca3af',
    glow: '#d1d5db',
    accent: '#e5e7eb',
    sparkles: 0,
    badgeBg: 'rgba(156, 163, 175, 0.2)',
  },
  Rare: {
    border: '#3b82f6',
    glow: '#60a5fa',
    accent: '#93c5fd',
    sparkles: 4,
    badgeBg: 'rgba(59, 130, 246, 0.2)',
  },
  Epic: {
    border: '#a855f7',
    glow: '#c084fc',
    accent: '#e9d5ff',
    sparkles: 7,
    badgeBg: 'rgba(168, 85, 247, 0.2)',
  },
  Legendary: {
    border: '#f59e0b',
    glow: '#fbbf24',
    accent: '#fef08a',
    sparkles: 12,
    badgeBg: 'rgba(245, 158, 11, 0.2)',
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Weapon: '#ef4444',
  'Weapon / Gear': '#ef4444',
  Alchemy: '#10b981',
  Tech: '#06b6d4',
  'High Tech': '#06b6d4',
  Engineering: '#f97316',
  Magic: '#a855f7',
  'Sci-Fi': '#ec4899',
  Cooking: '#eab308',
  Food: '#f59e0b',
  Gourmet: '#f59e0b',
  'Gourmet Dish': '#f59e0b',
  'Raw Material': '#64748b',
  Material: '#78716c',
  Element: '#3b82f6',
  Crafting: '#84cc16',
  Armor: '#6366f1',
  Component: '#8b5cf6',
  Custom: '#14b8a6',
  'Crafted Artifact': '#f59e0b',
  'Custom Material': '#14b8a6',
  'Custom Tool': '#f97316',
};

// Convert hex to rgb
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function shadeColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (val: number) => {
    const res = Math.round(val + (255 - val) * (percent / 100));
    return Math.max(0, Math.min(255, percent < 0 ? Math.round(val * (1 + percent / 100)) : res));
  };
  const nr = adjust(r).toString(16).padStart(2, '0');
  const ng = adjust(g).toString(16).padStart(2, '0');
  const nb = adjust(b).toString(16).padStart(2, '0');
  return `#${nr}${ng}${nb}`;
}

export function getItemColor(item: { name: string; category?: string; color?: string; rarity?: string }): string {
  if (item.color && item.color.startsWith('#')) {
    return item.color;
  }
  const n = (item.name || '').toLowerCase();

  // Keyword-specific semantic colors
  if (n.includes('waffle') || n.includes('pancake') || n.includes('toast') || n.includes('pastry') || n.includes('amber')) return '#d97706';
  if (n.includes('shallot') || n.includes('onion') || n.includes('beet') || n.includes('garlic')) return '#9333ea';
  if (n.includes('hydrosol') || n.includes('distill') || n.includes('essence') || n.includes('solvent') || n.includes('elixir')) return '#06b6d4';
  if (n.includes('cinder') || n.includes('ember') || n.includes('inferno') || n.includes('magma') || n.includes('flame') || n.includes('fire')) return '#ea580c';
  if (n.includes('cloth') || n.includes('fabric') || n.includes('silk') || n.includes('linen') || n.includes('weave') || n.includes('fiber')) return '#e11d48';
  if (n.includes('membrane') || n.includes('myco') || n.includes('spore') || n.includes('fungus') || n.includes('bio')) return '#10b981';
  if (n.includes('gold') || n.includes('solar') || n.includes('sun') || n.includes('starlight')) return '#f59e0b';
  if (n.includes('ice') || n.includes('frost') || n.includes('cryo') || n.includes('water') || n.includes('ocean')) return '#0284c7';
  if (n.includes('leaf') || n.includes('herb') || n.includes('plant') || n.includes('nature') || n.includes('moss')) return '#16a34a';
  if (n.includes('quantum') || n.includes('plasma') || n.includes('laser') || n.includes('cyber') || n.includes('reactor')) return '#06b6d4';
  if (n.includes('void') || n.includes('dark') || n.includes('shadow') || n.includes('arcane') || n.includes('mana')) return '#7c3aed';
  if (n.includes('steel') || n.includes('iron') || n.includes('titanium') || n.includes('metal') || n.includes('silver')) return '#64748b';
  if (n.includes('copper') || n.includes('bronze') || n.includes('leather') || n.includes('clay') || n.includes('bread')) return '#b45309';
  if (n.includes('lightning') || n.includes('thunder') || n.includes('electric') || n.includes('spark')) return '#eab308';
  if (n.includes('diamond') || n.includes('crystal') || n.includes('pure') || n.includes('glass')) return '#38bdf8';
  if (n.includes('poison') || n.includes('toxic') || n.includes('acid') || n.includes('slime')) return '#84cc16';
  if (n.includes('ruby') || n.includes('blood') || n.includes('crimson') || n.includes('heart')) return '#e11d48';

  if (item.category && CATEGORY_COLORS[item.category]) {
    return CATEGORY_COLORS[item.category];
  }
  const rarity = (item.rarity as keyof typeof RARITY_PALETTES) || 'Common';
  return RARITY_PALETTES[rarity]?.border || '#3b82f6';
}

import { generateArchetypePixelMatrix64, PixelMatrix64 } from './sprite-engine-64';

// ----------------------------------------------------------------------------
// Item Archetypes
// ----------------------------------------------------------------------------

export type ItemArchetype =
  | 'tool_smelt'
  | 'tool_forge'
  | 'tool_weld'
  | 'tool_knead'
  | 'tool_bake'
  | 'tool_roast'
  | 'tool_fry'
  | 'tool_distill'
  | 'tool_program'
  | 'tool_laser_cut'
  | 'tool_assemble'
  | 'tool_calibrate'
  | 'tool_enchant'
  | 'tool_carve'
  | 'tool_stitch'
  | 'tool_grind'
  | 'tool_finish'
  | 'gelato'
  | 'spaghetti'
  | 'pizza'
  | 'hot_sauce'
  | 'car'
  | 'glove'
  | 'waffle'
  | 'shallot'
  | 'hydrosol'
  | 'cindercloth'
  | 'myco_membrane'
  | 'mushroom'
  | 'sword'
  | 'dagger'
  | 'pickaxe'
  | 'spear'
  | 'axe'
  | 'hammer'
  | 'bow'
  | 'crossbow'
  | 'scythe'
  | 'blaster'
  | 'shield'
  | 'armor'
  | 'helmet'
  | 'boots'
  | 'gauntlet'
  | 'cloak'
  | 'ring'
  | 'amulet'
  | 'crown'
  | 'wand'
  | 'staff'
  | 'tome'
  | 'scroll'
  | 'orb'
  | 'potion'
  | 'cauldron'
  | 'food_bowl'
  | 'burger'
  | 'cake'
  | 'meat'
  | 'bread'
  | 'drink'
  | 'sushi'
  | 'cheese'
  | 'fruit'
  | 'tech_core'
  | 'chip'
  | 'battery'
  | 'robot'
  | 'rocket'
  | 'watch'
  | 'gear'
  | 'magnet'
  | 'wire'
  | 'torch'
  | 'compass'
  | 'telescope'
  | 'key'
  | 'chest'
  | 'ingot'
  | 'ore'
  | 'wood'
  | 'leaf'
  | 'flower'
  | 'feather'
  | 'fire'
  | 'ice'
  | 'water'
  | 'lightning'
  | 'star'
  | 'skull'
  | 'anvil'
  | 'cloth'
  | 'crystal'
  | 'fish'
  | 'tool_craft'
  | 'artifact';

export function detectArchetype(name: string = '', category: string = '', emoji: string = ''): ItemArchetype {
  const n = name.toLowerCase().trim();
  const c = category.toLowerCase().trim();
  const e = emoji.trim();

  // 1. Dedicated Crafting Tool Archetypes (highest priority when matching tools or actions)
  if (n === 'smelt' || n === 'cast' || n === 'quench' || n === 'temper' || n === 'purify_metal' || n === 'calcine' || n.includes('smelt')) return 'tool_smelt';
  if (n === 'forge' || n === 'hammer' || n === 'rivet' || n === 'shape' || n === 'shaping' || n.includes('forge')) return 'tool_forge';
  if (n === 'weld' || n === 'solder' || n.includes('weld')) return 'tool_weld';
  if (n === 'knead' || n === 'whisk' || n.includes('knead') || n === 'roll') return 'tool_knead';
  if (n === 'bake' || n.includes('bake') || n === 'oven') return 'tool_bake';
  if (n === 'roast' || n === 'grill' || n === 'smoke' || n === 'caramelize' || n.includes('roast')) return 'tool_roast';
  if (n === 'fry' || n === 'saute' || n.includes('fry')) return 'tool_fry';
  if (n === 'distill' || n === 'condense' || n === 'filter' || n === 'brew' || n === 'steep' || (n.includes('distill') && !n.includes('hydro'))) return 'tool_distill';
  if (n === 'program' || n === 'overclock' || n === 'tune' || n === 'charge' || n === 'energize' || n.includes('program')) return 'tool_program';
  if (n === 'laser_cut' || n === 'print_3d' || n.includes('laser')) return 'tool_laser_cut';
  if (n === 'assemble' || n === 'wire' || n === 'magnetize' || n === 'compress' || n.includes('assemble')) return 'tool_assemble';
  if (n === 'calibrate' || n === 'measure' || n.includes('calibrate')) return 'tool_calibrate';
  if (n === 'enchant' || n === 'empower' || n === 'summon' || n === 'charm' || n === 'channel' || n === 'inscribe' || n === 'bless' || n === 'curse' || n === 'alchemize' || n.includes('enchant')) return 'tool_enchant';
  if (n === 'carve' || n === 'sand' || n === 'varnish' || n.includes('carve')) return 'tool_carve';
  if (n === 'stitch' || n === 'weave' || n === 'weave_cloth' || n === 'laminate' || n === 'glue' || n.includes('stitch')) return 'tool_stitch';
  if (n === 'grind' || n === 'crush' || n === 'shred' || n === 'extract' || n === 'dissolve' || n.includes('grind') || n.includes('crush')) return 'tool_grind';
  if (n === 'finish_item' || n === 'serve' || n === 'showcase' || n.includes('finish')) return 'tool_finish';

  // 2. High-Specificity Natural Keyword Overrides (checked next)
  if (n.includes('gelato') || n.includes('ice cream') || n.includes('sorbet') || n.includes('sundae') || n.includes('parfait') || n.includes('cone')) return 'gelato';
  if (n.includes('spaghetti') || n.includes('meatball') || n.includes('pasta') || n.includes('lasagna') || n.includes('ravioli') || n.includes('fettuccine') || n.includes('noodle')) return 'spaghetti';
  if (n.includes('pizza') || n.includes('calzone') || n.includes('flatbread')) return 'pizza';
  if (n.includes('hot sauce') || n.includes('sauce') || n.includes('frank') || n.includes('sriracha') || n.includes('tabasco') || n.includes('condiment') || n.includes('ketchup') || n.includes('mustard') || n.includes('chili sauce') || n.includes('dip')) return 'hot_sauce';
  if (n.includes('tesla') || n.includes('roadster') || n.includes('car') || n.includes('automobile') || n.includes('vehicle') || n.includes('supercar') || n.includes('racecar') || n.includes('truck')) return 'car';
  if (n.includes('ufc') || n.includes('boxing') || n.includes('glove') || n.includes('mitt') || n.includes('handwrap')) return 'glove';
  if (n.includes('potion') || n.includes('invisibility') || n.includes('elixir') || n.includes('vial') || n.includes('flask') || n.includes('brew') || n.includes('draught') || n.includes('serum') || n.includes('tonic') || n.includes('alchemy')) return 'potion';

  if (n.includes('waffle') || n.includes('pancake') || n.includes('crepe')) return 'waffle';
  if (n.includes('shallot') || n.includes('onion') || n.includes('garlic') || n.includes('scallion') || n.includes('leek')) return 'shallot';
  if (n.includes('hydrosol') || n.includes('distill') || n.includes('distillate') || n.includes('solvent') || n.includes('essence') || n.includes('extract')) return 'hydrosol';
  if (n.includes('cindercloth') || n.includes('cinder') || (n.includes('cloth') && n.includes('ember'))) return 'cindercloth';
  if (n.includes('membrane') || n.includes('polymer') || (n.includes('myco') && !n.includes('mushroom')) || n.includes('cellular')) return 'myco_membrane';
  if (n.includes('mushroom') || n.includes('fungus') || n.includes('toadstool') || n.includes('spore')) return 'mushroom';

  // Emoji Direct Mapping
  if (e === '🍨' || e === '🍦') return 'gelato';
  if (e === '🍝') return 'spaghetti';
  if (e === '🍕') return 'pizza';
  if (e === '🚗' || e === '🏎️' || e === '🚘') return 'car';
  if (e === '🥊' || e === '🧤') return 'glove';
  if (e === '🥫' || e === '🌶️') return 'hot_sauce';
  if (e === '🧇' || e === '🥞') return 'waffle';
  if (e === '🧅' || e === '🧄') return 'shallot';
  if (e === '⚗️' || e === '🧪') return 'hydrosol';
  if (e === '🍄') return 'mushroom';
  if (e === '⚔️' || e === '🗡️' || e === '🤺') return e === '🗡️' ? 'dagger' : 'sword';
  if (e === '⛏️') return 'pickaxe';
  if (e === '🪓') return 'axe';
  if (e === '🔨' || e === '⚒️') return 'hammer';
  if (e === '🔱') return 'spear';
  if (e === '🏹') return 'bow';
  if (e === '🔫') return 'blaster';
  if (e === '🛡️') return 'shield';
  if (e === '🦺' || e === '🥋') return 'armor';
  if (e === '🪖' || e === '👑') return e === '👑' ? 'crown' : 'helmet';
  if (e === '👢' || e === '👟') return 'boots';
  if (e === '🦾') return 'gauntlet';
  if (e === '🧥' || e === '👘') return 'cloak';
  if (e === '💍') return 'ring';
  if (e === '📿') return 'amulet';
  if (e === '🪄') return 'wand';
  if (e === '🫙') return 'potion';
  if (e === '📜' || e === '📄') return 'scroll';
  if (e === '📖' || e === '📕' || e === '📚') return 'tome';
  if (e === '🔮') return 'orb';
  if (e === '🪶') return 'feather';
  if (e === '🍜' || e === '🍲' || e === '🥣' || e === '🥟') return 'food_bowl';
  if (e === '🍔' || e === '🥪' || e === '🌮' || e === '🌯') return 'burger';
  if (e === '🍰' || e === '🎂' || e === '🧁' || e === '🍪' || e === '🍩') return 'cake';
  if (e === '🥩' || e === '🍗' || e === '🍖') return 'meat';
  if (e === '🍞' || e === '🥯' || e === '🥖' || e === '🥐') return 'bread';
  if (e === '☕' || e === '🍵' || e === '🫖' || e === '🥛' || e === '🍷' || e === '🍺') return 'drink';
  if (e === '🍣' || e === '🍱') return 'sushi';
  if (e === '🧀') return 'cheese';
  if (e === '🍎' || e === '🍓' || e === '🍇' || e === '🍊' || e === '🍋' || e === '🍌') return 'fruit';
  if (e === '⚛️') return 'tech_core';
  if (e === '💻' || e === '🟫' || e === '🟩') return 'chip';
  if (e === '🔋') return 'battery';
  if (e === '🤖' || e === '🛸') return 'robot';
  if (e === '🚀' || e === '🛰️') return 'rocket';
  if (e === '⌚' || e === '⏰') return 'watch';
  if (e === '⚙️') return 'gear';
  if (e === '🧲') return 'magnet';
  if (e === '🔌') return 'wire';
  if (e === '🔦' || e === '🕯️' || e === '🏮') return 'torch';
  if (e === '🧭') return 'compass';
  if (e === '🔭' || e === '🔬') return 'telescope';
  if (e === '🔑' || e === '🗝️') return 'key';
  if (e === '📦' || e === '🧰') return 'chest';
  if (e === '🧱') return 'ingot';
  if (e === '🪨') return 'ore';
  if (e === '🪵') return 'wood';
  if (e === '🌿' || e === '🌱') return 'leaf';
  if (e === '🌸' || e === '🌻' || e === '🌹') return 'flower';
  if (e === '🔥') return 'fire';
  if (e === '🧊' || e === '❄️') return 'ice';
  if (e === '💧' || e === '🌊') return 'water';
  if (e === '⚡') return 'lightning';
  if (e === '⭐' || e === '🌟' || e === '✨') return 'star';
  if (e === '💀') return 'skull';
  if (e === '🧵' || e === '🪢' || e === '🧶' || e === '🪡') return 'cloth';
  if (e === '💎') return 'crystal';
  if (e === '🐟' || e === '🐠') return 'fish';
  if (e === '✂️' || e === '📐' || e === '🖌️' || e === '🗜️') return 'tool_craft';

  // Keyword Matching
  if (n.includes('pickaxe') || n.includes('mining pick') || n.includes('mine')) return 'pickaxe';
  if (n.includes('scythe') || n.includes('sickle') || n.includes('reaper')) return 'scythe';
  if (n.includes('spear') || n.includes('lance') || n.includes('trident') || n.includes('javelin') || n.includes('polearm')) return 'spear';
  if (n.includes('dagger') || n.includes('knife') || n.includes('kunai') || n.includes('stiletto') || n.includes('shiv')) return 'dagger';
  if (n.includes('sword') || n.includes('blade') || n.includes('katana') || n.includes('saber') || n.includes('rapier') || n.includes('claymore') || n.includes('broadsword')) return 'sword';
  if (n.includes('axe') || n.includes('hatchet') || n.includes('cleaver') || n.includes('tomahawk')) return 'axe';
  if (n.includes('hammer') || n.includes('mace') || n.includes('warhammer') || n.includes('mallet') || n.includes('crush') || n.includes('forge')) return 'hammer';
  if (n.includes('crossbow') || n.includes('arbalest')) return 'crossbow';
  if (n.includes('bow') || n.includes('arrow') || n.includes('longbow')) return 'bow';
  if (n.includes('blaster') || n.includes('laser') || n.includes('gun') || n.includes('rifle') || n.includes('pistol') || n.includes('cannon') || n.includes('plasma')) return 'blaster';

  if (n.includes('shield') || n.includes('buckler') || n.includes('aegis') || n.includes('ward')) return 'shield';
  if (n.includes('crown') || n.includes('tiara') || n.includes('diadem')) return 'crown';
  if (n.includes('helmet') || n.includes('helm') || n.includes('mask') || n.includes('visor') || n.includes('hood')) return 'helmet';
  if (n.includes('gauntlet') || n.includes('bracer')) return 'gauntlet';
  if (n.includes('boot') || n.includes('shoe') || n.includes('greave')) return 'boots';
  if (n.includes('cloak') || n.includes('cape') || n.includes('robe') || n.includes('mantle')) return 'cloak';
  if (n.includes('armor') || n.includes('cuirass') || n.includes('plate') || n.includes('chainmail') || c.includes('armor')) return 'armor';
  if (n.includes('ring') || n.includes('band')) return 'ring';
  if (n.includes('amulet') || n.includes('necklace') || n.includes('pendant') || n.includes('talisman')) return 'amulet';

  if (n.includes('wand') || n.includes('scepter') || n.includes('rod')) return 'wand';
  if (n.includes('staff') || n.includes('cane')) return 'staff';
  if (n.includes('scroll') || n.includes('parchment') || n.includes('blueprint') || n.includes('inscribe')) return 'scroll';
  if (n.includes('book') || n.includes('grimoire') || n.includes('tome') || n.includes('journal') || n.includes('codex')) return 'tome';
  if (n.includes('orb') || n.includes('sphere')) return 'orb';
  if (n.includes('cauldron') || n.includes('crucible')) return 'cauldron';
  if (n.includes('feather') || n.includes('quill')) return 'feather';
  if (n.includes('skull') || n.includes('bone') || n.includes('curse')) return 'skull';

  if (n.includes('ramen') || n.includes('soup') || n.includes('stew') || n.includes('broth') || n.includes('bowl')) return 'food_bowl';
  if (n.includes('burger') || n.includes('sandwich') || n.includes('taco') || n.includes('burrito')) return 'burger';
  if (n.includes('cake') || n.includes('pastry') || n.includes('pie') || n.includes('cookie') || n.includes('bake') || n.includes('donut')) return 'cake';
  if (n.includes('steak') || n.includes('meat') || n.includes('roast') || n.includes('chicken') || n.includes('beef') || n.includes('pork') || n.includes('ribs') || n.includes('bbq')) return 'meat';
  if (n.includes('bread') || n.includes('baguette') || n.includes('toast') || n.includes('flour') || n.includes('croissant')) return 'bread';
  if (n.includes('tea') || n.includes('coffee') || n.includes('drink') || n.includes('juice') || n.includes('mug') || n.includes('latte') || n.includes('cocktail') || n.includes('wine') || n.includes('beer')) return 'drink';
  if (n.includes('sushi') || n.includes('sashimi') || n.includes('maki') || n.includes('nigiri')) return 'sushi';
  if (n.includes('cheese') || n.includes('cheddar') || n.includes('mozzarella')) return 'cheese';
  if (n.includes('apple') || n.includes('berry') || n.includes('fruit') || n.includes('orange') || n.includes('lemon') || n.includes('grape') || n.includes('banana') || n.includes('cherry')) return 'fruit';
  if (c.includes('food') || c.includes('culinary') || c.includes('gourmet')) return 'food_bowl';

  if (n.includes('core') || n.includes('reactor') || n.includes('quantum') || n.includes('fusion') || n.includes('engine')) return 'tech_core';
  if (n.includes('chip') || n.includes('cpu') || n.includes('circuit') || n.includes('microchip') || n.includes('processor')) return 'chip';
  if (n.includes('battery') || n.includes('power cell') || n.includes('charge')) return 'battery';
  if (n.includes('robot') || n.includes('mech') || n.includes('android') || n.includes('golem')) return 'robot';
  if (n.includes('rocket') || n.includes('starship') || n.includes('shuttle')) return 'rocket';
  if (n.includes('watch') || n.includes('clock') || n.includes('timer')) return 'watch';
  if (n.includes('gear') || n.includes('cog') || n.includes('machine')) return 'gear';
  if (n.includes('magnet')) return 'magnet';
  if (n.includes('wire') || n.includes('cable') || n.includes('cord')) return 'wire';
  if (n.includes('torch') || n.includes('lantern') || n.includes('lamp') || n.includes('candle')) return 'torch';
  if (n.includes('compass') || n.includes('radar')) return 'compass';
  if (n.includes('telescope') || n.includes('microscope') || n.includes('lens')) return 'telescope';

  if (n.includes('key') || n.includes('lockpick')) return 'key';
  if (n.includes('chest') || n.includes('crate') || n.includes('box')) return 'chest';
  if (n.includes('ingot') || n.includes('bar') || n.includes('alloy') || n.includes('smelt')) return 'ingot';
  if (n.includes('ore') || n.includes('stone') || n.includes('rock') || n.includes('mineral')) return 'ore';
  if (n.includes('wood') || n.includes('log') || n.includes('timber') || n.includes('plank')) return 'wood';
  if (n.includes('cloth') || n.includes('fabric') || n.includes('silk') || n.includes('thread') || n.includes('leather') || n.includes('weave')) return 'cloth';
  if (n.includes('anvil') || n.includes('weld')) return 'anvil';
  if (n.includes('cut') || n.includes('shape') || n.includes('mold') || n.includes('tool')) return 'tool_craft';

  if (n.includes('crystal') || n.includes('gem') || n.includes('diamond') || n.includes('ruby') || n.includes('emerald') || n.includes('sapphire')) return 'crystal';
  if (n.includes('fish') || n.includes('seafood') || n.includes('salmon') || n.includes('tuna')) return 'fish';
  if (n.includes('leaf') || n.includes('herb') || n.includes('plant')) return 'leaf';
  if (n.includes('flower') || n.includes('petal') || n.includes('blossom') || n.includes('rose')) return 'flower';
  if (n.includes('fire') || n.includes('flame') || n.includes('ember') || n.includes('blaze')) return 'fire';
  if (n.includes('ice') || n.includes('frost') || n.includes('cryo') || n.includes('snow')) return 'ice';
  if (n.includes('water') || n.includes('aqua') || n.includes('fluid') || n.includes('rain')) return 'water';
  if (n.includes('lightning') || n.includes('electric') || n.includes('thunder') || n.includes('shock')) return 'lightning';
  if (n.includes('star') || n.includes('starlight') || n.includes('astral') || n.includes('celestial')) return 'star';

  return 'artifact';
}

// ----------------------------------------------------------------------------
// High-Definition 24x24 Pixel Matrix Synthesizer
// ----------------------------------------------------------------------------

export type PixelGrid24 = number[][];

export function createEmptyGrid24(): PixelGrid24 {
  return Array(24)
    .fill(0)
    .map(() => Array(24).fill(0));
}

function setP(g: PixelGrid24, x: number, y: number, val: number) {
  if (x >= 0 && x < 24 && y >= 0 && y < 24) {
    g[y][x] = val;
  }
}

export function addAutomaticOutlines(g: PixelGrid24) {
  const copy = g.map((row) => [...row]);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      if (copy[y][x] === 0) {
        let hasNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < 24 && nx >= 0 && nx < 24) {
              if (copy[ny][nx] > 0 && copy[ny][nx] !== 1) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor) break;
        }
        if (hasNeighbor) {
          g[y][x] = 1; // RPG contour outline
        }
      }
    }
  }
}

export function generateArchetypePixelMatrix(
  archetype: ItemArchetype,
  hash: number,
  itemName: string = '',
  itemCategory: string = ''
): PixelGrid24 {
  return generateArchetypePixelMatrix64(archetype, hash, itemName, itemCategory);
}

export function generateArchetypePixelMatrixLegacy24(
  archetype: ItemArchetype,
  hash: number,
  itemName: string = '',
  itemCategory: string = ''
): PixelGrid24 {
  const g = createEmptyGrid24();
  const rng = new SpritePRNG(hash ^ hashString(itemName + itemCategory));

  const variant = rng.int(0, 5);
  const gemType = rng.int(0, 3);
  const gemColor = gemType === 0 ? 8 : gemType === 1 ? 10 : gemType === 2 ? 11 : 14;

  switch (archetype) {
    // ------------------------------------------------------------------------
    // Gelato, Ice Cream & Frozen Desserts (Lemon Gelato, etc.)
    // ------------------------------------------------------------------------
    case 'gelato': {
      // 1. Crispy Cross-Hatched Waffle Cone
      for (let y = 12; y <= 21; y++) {
        const w = Math.max(0, Math.floor((21 - y) * 0.65));
        for (let x = 11 - w; x <= 11 + w; x++) {
          const isGrid = (x + y) % 2 === 0;
          setP(g, x, y, isGrid ? 10 : 2);
        }
      }
      // 2. Swirled Gelato Cream Scoops
      const cx = 11; const cy = 8;
      for (let dy = -5; dy <= 4; dy++) {
        const rad = Math.round(Math.cos((dy / 5) * (Math.PI / 2)) * 6.5);
        for (let dx = -rad; dx <= rad; dx++) {
          const isHighlight = dx < 0 && dy < 0;
          const isCore = dx * dx + dy * dy <= 9;
          setP(g, cx + dx, cy + dy, isHighlight ? 4 : isCore ? 5 : 3);
        }
      }
      // Flared swirled top peak
      setP(g, 10, 3, 4); setP(g, 11, 2, 5); setP(g, 12, 3, 3);
      // Lemon slice / berry garnish
      setP(g, 13, 2, 10); setP(g, 14, 2, 5); setP(g, 15, 3, 10);
      setP(g, 13, 3, 10); setP(g, 14, 3, 10); setP(g, 15, 4, 10);
      // Fresh mint leaf
      setP(g, 9, 2, 11); setP(g, 8, 3, 11);
      // Cream drip over cone rim
      setP(g, 8, 13, 5); setP(g, 8, 14, 3);
      setP(g, 14, 13, 4); setP(g, 14, 14, 3);
      break;
    }

    // ------------------------------------------------------------------------
    // Spaghetti & Meatballs, Pasta Dishes
    // ------------------------------------------------------------------------
    case 'spaghetti': {
      // 1. Ceramic Pasta Bowl
      const bx = 11;
      for (let y = 13; y <= 20; y++) {
        const w = Math.round(Math.cos(((y - 13) / 7) * (Math.PI / 2)) * 8);
        for (let x = bx - w; x <= bx + w; x++) {
          const isRim = y === 13 || x === bx - w || x === bx + w;
          setP(g, x, y, isRim ? 7 : y === 20 ? 6 : 6);
        }
      }
      // 2. Swirling Nest of Spaghetti Pasta Noodles
      for (let y = 8; y <= 14; y++) {
        const nw = Math.floor((15 - y) * 1.1);
        for (let x = bx - nw; x <= bx + nw; x++) {
          const strand = (x * 3 + y * 2) % 3;
          setP(g, x, y, strand === 0 ? 10 : strand === 1 ? 4 : 3);
        }
      }
      // 3. Rich Red Marinara Tomato Sauce
      setP(g, 10, 9, 8); setP(g, 11, 9, 8); setP(g, 12, 9, 9);
      setP(g, 9, 10, 8); setP(g, 10, 10, 8); setP(g, 13, 10, 8);
      // 4. Savory Roasted Meatballs (3 plump meatballs)
      // Meatball 1 (Left)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          setP(g, 8 + dx, 10 + dy, dx === -1 && dy === -1 ? 7 : (dx === 1 || dy === 1) ? 2 : 6);
        }
      }
      // Meatball 2 (Right)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          setP(g, 14 + dx, 11 + dy, dx === -1 && dy === -1 ? 7 : (dx === 1 || dy === 1) ? 2 : 6);
        }
      }
      // Meatball 3 (Center High)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          setP(g, 11 + dx, 7 + dy, dx === -1 && dy === -1 ? 7 : (dx === 1 || dy === 1) ? 2 : 6);
        }
      }
      // 5. Fresh Green Basil Leaf Garnish
      setP(g, 11, 5, 11); setP(g, 12, 5, 11); setP(g, 13, 6, 11);
      // 6. Steaming Vapor Wisps
      setP(g, 7, 4, 5); setP(g, 8, 3, 5); setP(g, 14, 3, 5); setP(g, 15, 2, 5);
      break;
    }

    // ------------------------------------------------------------------------
    // Gourmet Truffle Pizza & Artisan Slices
    // ------------------------------------------------------------------------
    case 'pizza': {
      // Golden Baked Crust at the top
      for (let x = 4; x <= 18; x++) {
        setP(g, x, 4, 2);
        setP(g, x, 5, 3);
        setP(g, x, 6, 4);
      }
      // Triangular Melted Cheese Pizza Slice
      for (let y = 7; y <= 19; y++) {
        const w = Math.floor((19 - y) * 0.58);
        for (let x = 11 - w; x <= 11 + w; x++) {
          // Cheese base
          setP(g, x, y, (x + y) % 4 === 0 ? 4 : 10);
        }
      }
      // Savory Dark Shaved Truffles / Sautéed Mushrooms
      setP(g, 10, 8, 6); setP(g, 11, 8, 15);
      setP(g, 7, 10, 6); setP(g, 8, 10, 15);
      setP(g, 13, 11, 6); setP(g, 14, 11, 15);
      setP(g, 10, 14, 6); setP(g, 11, 14, 15);
      // Tomato Pomodoro Spots
      setP(g, 12, 9, 8); setP(g, 9, 12, 8); setP(g, 12, 16, 8);
      // Fresh Basil Herb Flakes
      setP(g, 14, 8, 11); setP(g, 8, 8, 11); setP(g, 11, 12, 11); setP(g, 10, 17, 11);
      // Stretchy Gooey Cheese Drip off the tip
      setP(g, 11, 20, 10); setP(g, 11, 21, 5);
      break;
    }

    // ------------------------------------------------------------------------
    // Frank's Red Hot Sauce & Condiment Bottles
    // ------------------------------------------------------------------------
    case 'hot_sauce': {
      // 1. Screw-on Cap (Green/White)
      for (let y = 2; y <= 4; y++) {
        for (let x = 10; x <= 12; x++) {
          setP(g, x, y, x === 10 ? 5 : 11);
        }
      }
      // 2. Clear Glass Neck
      for (let y = 5; y <= 7; y++) {
        setP(g, 10, y, 12); setP(g, 11, y, 8); setP(g, 12, y, 12);
      }
      // 3. Main Glass Bottle Body with Fiery Crimson Sauce
      for (let y = 8; y <= 19; y++) {
        for (let x = 7; x <= 15; x++) {
          const isEdge = x === 7 || x === 15 || y === 19;
          const isHighlight = x === 8;
          if (isEdge) {
            setP(g, x, y, 12);
          } else if (isHighlight) {
            setP(g, x, y, 5);
          } else {
            setP(g, x, y, 8); // Fiery hot red
          }
        }
      }
      // 4. Iconic Center Label Band
      for (let y = 11; y <= 15; y++) {
        for (let x = 8; x <= 14; x++) {
          setP(g, x, y, 5); // White label
        }
      }
      // Fiery Pepper & Flame Emblem on Label
      setP(g, 11, 12, 11); // Green pepper stem
      setP(g, 11, 13, 8); setP(g, 10, 14, 8); setP(g, 11, 14, 10); setP(g, 12, 14, 8);
      // Floating Fiery Splash Droplets
      setP(g, 17, 13, 8); setP(g, 18, 12, 10); setP(g, 5, 14, 8);
      break;
    }

    // ------------------------------------------------------------------------
    // Tesla Roadster, Supercars & Vehicles
    // ------------------------------------------------------------------------
    case 'car': {
      // 1. Aerodynamic Cockpit Glass Canopy
      for (let y = 9; y <= 12; y++) {
        const left = 7 + (12 - y);
        const right = 15 - Math.floor((12 - y) * 0.7);
        for (let x = left; x <= right; x++) {
          setP(g, x, y, y === 9 || x === left ? 12 : 6);
        }
      }
      // 2. Sculpted Supercar Bodywork
      for (let y = 13; y <= 16; y++) {
        for (let x = 2; x <= 21; x++) {
          // Wheel well cutouts
          const inRearWheel = (x >= 4 && x <= 8 && y >= 14);
          const inFrontWheel = (x >= 14 && x <= 18 && y >= 14);
          if (inRearWheel || inFrontWheel) continue;

          // Aero curve shading
          const isShoulder = y === 13;
          const isUnderbody = y === 16;
          setP(g, x, y, isShoulder ? 4 : isUnderbody ? 2 : 3);
        }
      }
      // Sleek hood taper
      setP(g, 19, 13, 4); setP(g, 20, 13, 4); setP(g, 21, 13, 5);
      // Fastback rear spoiler lip
      setP(g, 2, 12, 4); setP(g, 3, 12, 4);
      // 3. Brilliant LED Headlights & Taillights
      setP(g, 21, 14, 14); setP(g, 20, 14, 5); // Crisp cyan/white front LED
      setP(g, 2, 14, 8); setP(g, 3, 14, 9); // Crimson rear LED lightbar
      // 4. Sport Alloy Wheels & Performance Low-Profile Tires
      // Rear Wheel
      for (let dy = -1; dy <= 2; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const isRim = (dx === 0 || dx === 1) && (dy === 0 || dy === 1);
          setP(g, 6 + dx, 16 + dy, isRim ? 7 : 6);
        }
      }
      setP(g, 6, 16, 5); // Rim center cap
      // Front Wheel
      for (let dy = -1; dy <= 2; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const isRim = (dx === 0 || dx === 1) && (dy === 0 || dy === 1);
          setP(g, 16 + dx, 16 + dy, isRim ? 7 : 6);
        }
      }
      setP(g, 16, 16, 5); // Rim center cap
      break;
    }

    // ------------------------------------------------------------------------
    // UFC Glove, Boxing Gloves & Combat Gauntlets
    // ------------------------------------------------------------------------
    case 'glove':
    case 'gauntlet': {
      // 1. Curved Padded Strike Bar (Knuckles)
      for (let y = 4; y <= 10; y++) {
        for (let x = 7; x <= 18; x++) {
          const isKnuckleRidge = y === 4 || x === 7;
          const isShadow = y === 10 || x === 18;
          // Segmented finger division line
          const isFingerSplit = x === 11 || x === 15;
          setP(g, x, y, isFingerSplit ? 2 : isKnuckleRidge ? 4 : isShadow ? 2 : 3);
        }
      }
      // 2. Leather Palm & Thumb Guard Loop
      for (let y = 8; y <= 13; y++) {
        for (let x = 4; x <= 7; x++) {
          setP(g, x, y, x === 4 ? 4 : 3);
        }
      }
      // 3. Reinforced Wrist Wrap Strap
      for (let y = 12; y <= 19; y++) {
        for (let x = 7; x <= 17; x++) {
          const isStrapBorder = y === 12 || y === 19 || x === 7 || x === 17;
          setP(g, x, y, isStrapBorder ? 7 : 6);
        }
      }
      // 4. Official Championship Logo Patch on Wrist Strap
      for (let y = 14; y <= 17; y++) {
        for (let x = 9; x <= 15; x++) {
          const isBorder = y === 14 || y === 17 || x === 9 || x === 15;
          setP(g, x, y, isBorder ? 10 : 5); // Gold and white badge
        }
      }
      // Leather specular sheen
      setP(g, 9, 5, 5); setP(g, 13, 5, 5); setP(g, 16, 5, 5);
      break;
    }

    // ------------------------------------------------------------------------
    // Potions, Alchemy Flasks & Invisibility Draughts
    // ------------------------------------------------------------------------
    case 'potion': {
      // 1. Wooden Cork Stopper
      setP(g, 10, 2, 10); setP(g, 11, 2, 5); setP(g, 12, 2, 10);
      setP(g, 10, 3, 2); setP(g, 11, 3, 10); setP(g, 12, 3, 2);
      // 2. Glass Neck & Lip Collar
      setP(g, 9, 4, 12); setP(g, 10, 4, 5); setP(g, 11, 4, 5); setP(g, 12, 4, 5); setP(g, 13, 4, 12);
      setP(g, 10, 5, 12); setP(g, 12, 5, 12);
      setP(g, 10, 6, 12); setP(g, 12, 6, 12);
      // 3. Spherical Crystalline Flask Body
      const cx = 11;
      for (let y = 7; y <= 19; y++) {
        const rad = Math.round(Math.sin(((y - 7) / 12) * Math.PI) * 7.5);
        for (let x = cx - rad; x <= cx + rad; x++) {
          const isGlass = x === cx - rad || x === cx + rad || y === 19;
          if (isGlass) {
            setP(g, x, y, (x < cx && y < 14) ? 5 : 12);
          } else if (y >= 9) {
            // Ethereal Swirling Liquid Core
            const dist = Math.abs(x - cx) + Math.abs(y - 14);
            const isBubble = (x === 10 && y === 13) || (x === 13 && y === 16);
            const isCoreRune = dist <= 1;
            setP(g, x, y, isCoreRune ? 14 : isBubble ? 5 : x < cx ? 4 : 3);
          }
        }
      }
      // Floating Mystic Particle Wisps
      setP(g, 4, 9, 14); setP(g, 18, 11, 5); setP(g, 16, 7, 14);
      break;
    }

    // ------------------------------------------------------------------------
    // Waffle & Pastries
    // ------------------------------------------------------------------------
    case 'waffle': {
      const cx = 11; const cy = 11; const r = 9;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d2 <= r * r) setP(g, x, y, 3);
        }
      }
      // Waffle grid wells
      for (let y = cy - 7; y <= cy + 7; y += 4) {
        for (let x = cx - 7; x <= cx + 7; x += 4) {
          for (let dy = 0; dy <= 2; dy++) {
            for (let dx = 0; dx <= 2; dx++) {
              if (g[y + dy]?.[x + dx] > 0) setP(g, x + dx, y + dy, 2);
            }
          }
        }
      }
      // Raised ridges highlight
      for (let y = cy - 8; y <= cy + 8; y++) {
        for (let x = cx - 8; x <= cx + 8; x++) {
          if (g[y]?.[x] === 3 && (x % 4 === 0 || y % 4 === 0)) setP(g, x, y, 4);
        }
      }
      // Melting butter pat
      for (let by = 9; by <= 13; by++) {
        for (let bx = 9; bx <= 13; bx++) {
          setP(g, bx, by, by === 9 || bx === 9 ? 5 : 10);
        }
      }
      setP(g, 14, 11, 2); setP(g, 14, 12, 2); setP(g, 15, 12, 2);
      break;
    }

    // ------------------------------------------------------------------------
    // Shallot & Botanical Bulbs
    // ------------------------------------------------------------------------
    case 'shallot': {
      const cx = 11;
      setP(g, cx, 3, 11); setP(g, cx + 1, 3, 11);
      setP(g, cx - 1, 4, 11); setP(g, cx, 4, 11); setP(g, cx + 1, 4, 11);
      setP(g, cx - 1, 5, 11); setP(g, cx, 5, 11); setP(g, cx + 2, 5, 11);
      setP(g, cx, 6, 11); setP(g, cx + 1, 6, 11);
      for (let y = 7; y <= 18; y++) {
        const t = (y - 7) / 11;
        const w = Math.round(Math.sin(t * Math.PI) * 7);
        for (let x = cx - w; x <= cx + w; x++) {
          const isEdge = x === cx - w || x === cx + w;
          const isHighlight = x === cx - w + 1 || x === cx - w + 2;
          setP(g, x, y, isEdge ? 2 : isHighlight ? 4 : 3);
        }
      }
      for (let y = 8; y <= 17; y++) {
        setP(g, cx - 2, y, 4); setP(g, cx + 1, y, 2);
      }
      setP(g, cx - 3, 19, 7); setP(g, cx, 19, 7); setP(g, cx + 3, 19, 7);
      break;
    }

    // ------------------------------------------------------------------------
    // Hydrosol & Distillation
    // ------------------------------------------------------------------------
    case 'hydrosol': {
      setP(g, 10, 3, 12); setP(g, 11, 3, 5); setP(g, 12, 3, 12);
      setP(g, 10, 4, 12); setP(g, 12, 4, 12); setP(g, 10, 5, 12); setP(g, 12, 5, 12);
      setP(g, 13, 4, 12); setP(g, 14, 4, 12); setP(g, 15, 5, 12); setP(g, 16, 6, 12);
      setP(g, 16, 7, 12); setP(g, 17, 8, 12); setP(g, 17, 9, 12); setP(g, 17, 11, 14);
      const cx = 11;
      for (let y = 6; y <= 19; y++) {
        const rad = Math.round(Math.sin(((y - 6) / 13) * Math.PI) * 7);
        for (let x = cx - rad; x <= cx + rad; x++) {
          const isGlass = x === cx - rad || x === cx + rad || y === 19;
          if (isGlass) {
            setP(g, x, y, (x < cx && y < 14) ? 5 : 12);
          } else if (y >= 10) {
            const isBubble = (x === 10 && y === 13) || (x === 13 && y === 15);
            setP(g, x, y, isBubble ? 5 : (x < cx) ? 3 : 2);
          }
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Cindercloth & Woven Textiles
    // ------------------------------------------------------------------------
    case 'cindercloth':
    case 'cloth': {
      for (let y = 4; y <= 18; y++) {
        const wave = Math.round(Math.sin((y / 3)) * 2);
        for (let x = 6 + wave; x <= 16 + wave; x++) {
          const isEdge = x === 6 + wave || x === 16 + wave || y === 4;
          const isWeave = (x + y) % 3 === 0;
          setP(g, x, y, isEdge ? 6 : isWeave ? 4 : 3);
        }
      }
      setP(g, 8, 7, 8); setP(g, 9, 7, 10);
      setP(g, 13, 11, 8); setP(g, 14, 11, 5);
      setP(g, 10, 15, 10); setP(g, 11, 15, 8);
      for (let i = 0; i < 5; i++) {
        setP(g, 7 + i * 2, 19, 10); setP(g, 7 + i * 2, 20, 8);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Myco-Membrane & Biological Cells
    // ------------------------------------------------------------------------
    case 'myco_membrane': {
      const cx = 11; const cy = 11;
      for (let y = 3; y <= 19; y++) {
        const w = y <= 11 ? Math.floor((y - 3) * 0.9) : Math.floor((19 - y) * 0.9);
        for (let x = cx - w; x <= cx + w; x++) {
          const isBoundary = x === cx - w || x === cx + w || y === 3 || y === 19;
          setP(g, x, y, isBoundary ? 11 : (x % 3 === 0 && y % 3 === 0) ? 4 : 3);
        }
      }
      setP(g, cx, cy, 5);
      setP(g, cx - 2, cy - 2, 14); setP(g, cx + 2, cy - 2, 14);
      setP(g, cx - 2, cy + 2, 14); setP(g, cx + 2, cy + 2, 14);
      break;
    }

    // ------------------------------------------------------------------------
    // Mushrooms & Fungi
    // ------------------------------------------------------------------------
    case 'mushroom': {
      const cx = 11;
      for (let y = 12; y <= 19; y++) {
        for (let x = cx - 2; x <= cx + 2; x++) {
          setP(g, x, y, x === cx - 2 ? 5 : x === cx + 2 ? 6 : 7);
        }
      }
      for (let y = 4; y <= 12; y++) {
        const w = Math.round(Math.sin(((y - 4) / 8) * (Math.PI / 2)) * 8);
        for (let x = cx - w; x <= cx + w; x++) {
          setP(g, x, y, x < cx && y < 8 ? 4 : 3);
        }
      }
      setP(g, cx - 4, 8, 5); setP(g, cx + 3, 7, 5); setP(g, cx, 5, 5); setP(g, cx - 1, 9, 5);
      break;
    }

    // ------------------------------------------------------------------------
    // Weapons & Combat
    // ------------------------------------------------------------------------
    case 'sword': {
      const bladeLen = 13;
      for (let i = 0; i < 4; i++) {
        setP(g, 4 + i, 19 - i, 6); setP(g, 3 + i, 19 - i, 7);
      }
      setP(g, 2, 21, gemColor); setP(g, 3, 20, 10);
      for (let d = -3; d <= 3; d++) setP(g, 8 + d, 15 + d, 10);
      setP(g, 8, 15, gemColor);
      for (let i = 0; i < bladeLen; i++) {
        const bx = 9 + i; const by = 14 - i;
        setP(g, bx, by, 3); setP(g, bx - 1, by - 1, 5); setP(g, bx + 1, by + 1, 2);
      }
      setP(g, 9 + bladeLen, 14 - bladeLen, 5);
      break;
    }

    case 'dagger': {
      for (let i = 0; i < 3; i++) setP(g, 6 + i, 17 - i, 6);
      setP(g, 5, 18, 10); setP(g, 4, 19, gemColor);
      setP(g, 9, 14, 10); setP(g, 8, 14, gemColor); setP(g, 7, 13, 10);
      for (let i = 0; i < 8; i++) {
        setP(g, 10 + i, 13 - i, 3); setP(g, 9 + i, 13 - i, 5);
      }
      setP(g, 18, 5, 5);
      break;
    }

    case 'pickaxe': {
      for (let i = 0; i < 14; i++) {
        setP(g, 3 + i, 20 - i, 6); setP(g, 4 + i, 20 - i, 7);
      }
      setP(g, 16, 7, 10); setP(g, 15, 8, 10); setP(g, 16, 8, gemColor);
      setP(g, 17, 5, 4); setP(g, 18, 4, 3); setP(g, 19, 3, 4); setP(g, 20, 2, 5);
      setP(g, 14, 9, 3); setP(g, 13, 10, 4); setP(g, 12, 11, 5);
      break;
    }

    case 'hammer': {
      for (let i = 0; i < 14; i++) {
        setP(g, 3 + i, 20 - i, 6); setP(g, 4 + i, 20 - i, 7);
      }
      for (let y = 3; y <= 9; y++) {
        for (let x = 15; x <= 21; x++) {
          setP(g, x, y, (x === 15 || y === 3) ? 5 : (x > 19 || y > 7) ? 2 : 3);
        }
      }
      setP(g, 18, 6, gemColor);
      break;
    }

    case 'axe': {
      for (let i = 0; i < 14; i++) {
        setP(g, 3 + i, 20 - i, 6); setP(g, 4 + i, 20 - i, 7);
      }
      for (let dy = -5; dy <= 5; dy++) {
        const w = Math.round(Math.cos((dy / 5) * (Math.PI / 2)) * 6);
        for (let dx = 0; dx <= w; dx++) {
          setP(g, 15 + dx, 7 + dy, dx === w ? 5 : dx === w - 1 ? 4 : 3);
        }
      }
      setP(g, 15, 7, gemColor);
      break;
    }

    case 'spear': {
      for (let i = 0; i < 17; i++) {
        setP(g, 2 + i, 21 - i, 6); setP(g, 3 + i, 21 - i, 7);
      }
      for (let d = -3; d <= 3; d++) {
        setP(g, 18 + d, 5 - d, 3); setP(g, 18 + d - 1, 5 - d, 5);
      }
      setP(g, 21, 2, 5); setP(g, 17, 6, gemColor);
      break;
    }

    case 'bow':
    case 'crossbow': {
      const cx = 11; const cy = 11;
      for (let t = -7; t <= 7; t++) {
        const curve = Math.round((t * t) / 10);
        setP(g, cx - curve, cy + t, 7); setP(g, cx - curve - 1, cy + t, 6);
      }
      for (let y = cy - 7; y <= cy + 7; y++) setP(g, cx + 5, y, 12);
      for (let x = cx - 3; x <= cx + 8; x++) setP(g, x, cy, x === cx + 8 ? 5 : 10);
      break;
    }

    case 'blaster': {
      for (let x = 5; x <= 19; x++) {
        for (let y = 7; y <= 11; y++) {
          setP(g, x, y, y === 7 ? 4 : y === 11 ? 2 : 3);
        }
      }
      setP(g, 20, 8, 14); setP(g, 20, 9, 5); setP(g, 20, 10, 14);
      setP(g, 11, 8, 8); setP(g, 12, 8, 5); setP(g, 11, 9, 8); setP(g, 12, 9, 5);
      for (let y = 12; y <= 18; y++) {
        const gx = 7 - Math.floor((y - 12) / 2);
        setP(g, gx, y, 6); setP(g, gx + 1, y, 7);
      }
      break;
    }

    case 'shield': {
      const sx = 11;
      for (let y = 3; y <= 19; y++) {
        const rad = y <= 9 ? 7 : Math.max(1, 7 - Math.floor((y - 9) * 0.8));
        for (let x = sx - rad; x <= sx + rad; x++) {
          const isEdge = x === sx - rad || x === sx + rad || y === 3 || y === 19;
          setP(g, x, y, isEdge ? 10 : (x < sx) ? 4 : 3);
        }
      }
      setP(g, sx, 10, gemColor); setP(g, sx, 9, 5);
      break;
    }

    // ------------------------------------------------------------------------
    // Foods & Gourmet Dishes
    // ------------------------------------------------------------------------
    case 'food_bowl': {
      const bx = 11;
      for (let y = 10; y <= 19; y++) {
        const w = Math.round(Math.cos(((y - 10) / 9) * (Math.PI / 2)) * 8);
        for (let x = bx - w; x <= bx + w; x++) {
          setP(g, x, y, y === 19 || x === bx - w || x === bx + w ? 7 : (y >= 13) ? 3 : 8);
        }
      }
      setP(g, 9, 12, 5); setP(g, 10, 12, 10);
      setP(g, 13, 11, 11); setP(g, 14, 11, 11);
      setP(g, 9, 7, 5); setP(g, 13, 6, 5);
      break;
    }

    case 'burger': {
      // Top Bun with Sesame Seeds
      for (let y = 5; y <= 8; y++) {
        const w = Math.round(Math.sin(((y - 5) / 4) * (Math.PI / 2)) * 7);
        for (let x = 11 - w; x <= 11 + w; x++) setP(g, x, y, 10);
      }
      setP(g, 9, 6, 5); setP(g, 13, 6, 5); setP(g, 11, 7, 5);
      // Lettuce
      for (let x = 4; x <= 18; x++) setP(g, x, 9, x % 2 === 0 ? 11 : 4);
      // Tomato
      for (let x = 5; x <= 17; x++) setP(g, x, 10, 8);
      // Melted Cheese
      for (let x = 4; x <= 18; x++) setP(g, x, 11, 10);
      setP(g, 6, 12, 10); setP(g, 15, 12, 10);
      // Beef Patty
      for (let x = 4; x <= 18; x++) {
        setP(g, x, 13, 6); setP(g, x, 14, 2);
      }
      // Bottom Bun
      for (let x = 5; x <= 17; x++) {
        setP(g, x, 15, 10); setP(g, x, 16, 3);
      }
      break;
    }

    case 'cake': {
      // Layered Cake Slice with Strawberry on Top
      setP(g, 11, 3, 11); setP(g, 11, 4, 8); setP(g, 12, 4, 8);
      for (let y = 6; y <= 18; y++) {
        const w = Math.floor((18 - y) * 0.5) + 4;
        for (let x = 11 - w; x <= 11 + w; x++) {
          const isFrosting = y === 6 || y === 10 || y === 14;
          setP(g, x, y, isFrosting ? 5 : (x < 11) ? 4 : 10);
        }
      }
      break;
    }

    case 'meat': {
      // Juicy T-Bone Steak
      for (let y = 6; y <= 17; y++) {
        const w = Math.round(Math.sin(((y - 6) / 11) * Math.PI) * 7);
        for (let x = 11 - w; x <= 11 + w; x++) {
          const isGrill = (x + y) % 4 === 0;
          setP(g, x, y, isGrill ? 2 : (x < 11) ? 4 : 8);
        }
      }
      // T-Bone
      setP(g, 11, 6, 5); setP(g, 11, 7, 5); setP(g, 11, 8, 5);
      setP(g, 10, 8, 5); setP(g, 12, 8, 5);
      break;
    }

    case 'bread': {
      // Golden Loaf / Baguette
      for (let y = 8; y <= 16; y++) {
        for (let x = 4; x <= 18; x++) {
          const isEnd = (x <= 5 && (y <= 9 || y >= 15)) || (x >= 17 && (y <= 9 || y >= 15));
          if (!isEnd) {
            const isScore = (x - y) % 4 === 0;
            setP(g, x, y, isScore ? 4 : y === 8 ? 5 : y >= 15 ? 2 : 10);
          }
        }
      }
      break;
    }

    case 'drink': {
      // Glass Mug with Beverage & Straw
      setP(g, 14, 2, 8); setP(g, 14, 3, 5); setP(g, 13, 4, 8); setP(g, 13, 5, 5);
      for (let y = 6; y <= 19; y++) {
        for (let x = 7; x <= 15; x++) {
          const isGlass = x === 7 || x === 15 || y === 19;
          setP(g, x, y, isGlass ? 12 : y >= 9 ? 3 : 5);
        }
      }
      // Mug handle
      setP(g, 16, 9, 12); setP(g, 17, 10, 12); setP(g, 17, 13, 12); setP(g, 16, 14, 12);
      break;
    }

    case 'sushi': {
      // Nigiri Salmon Sushi on White Rice Bed
      for (let y = 12; y <= 16; y++) {
        for (let x = 5; x <= 17; x++) setP(g, x, y, (x + y) % 2 === 0 ? 5 : 7);
      }
      for (let y = 7; y <= 11; y++) {
        for (let x = 4; x <= 18; x++) {
          const isEnd = (x === 4 || x === 18) && (y === 7 || y === 11);
          if (!isEnd) {
            const isStripe = (x + y) % 3 === 0;
            setP(g, x, y, isStripe ? 5 : 8);
          }
        }
      }
      // Nori band
      for (let y = 7; y <= 16; y++) {
        setP(g, 10, y, 6); setP(g, 11, y, 15);
      }
      break;
    }

    case 'cheese': {
      // Swiss Cheese Wedge
      for (let y = 7; y <= 18; y++) {
        const w = Math.floor((18 - y) * 0.7) + 3;
        for (let x = 11 - w; x <= 11 + w; x++) {
          setP(g, x, y, y === 7 ? 4 : 10);
        }
      }
      // Holes
      setP(g, 9, 11, 2); setP(g, 10, 11, 2);
      setP(g, 13, 14, 2); setP(g, 14, 14, 2);
      break;
    }

    case 'fruit': {
      // Juicy Apple / Citrus
      setP(g, 11, 3, 6); setP(g, 12, 2, 11); setP(g, 13, 2, 11); // Stem & leaf
      const cx = 11; const cy = 11; const r = 7;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) {
            setP(g, x, y, (x < cx && y < cy) ? 5 : (x > cx) ? 2 : 8);
          }
        }
      }
      break;
    }

    case 'fish': {
      // Detailed Swimming Fish
      for (let y = 8; y <= 16; y++) {
        const w = Math.round(Math.sin(((y - 8) / 8) * Math.PI) * 7);
        for (let x = 11 - w; x <= 11 + w; x++) {
          setP(g, x, y, (x < 11 && y < 12) ? 5 : (x > 11) ? 2 : 3);
        }
      }
      // Eye & Fins
      setP(g, 6, 11, 5); setP(g, 6, 12, 15);
      setP(g, 18, 9, 4); setP(g, 19, 8, 4); setP(g, 18, 15, 4); setP(g, 19, 16, 4); // Tail
      break;
    }

    // ------------------------------------------------------------------------
    // Technology & Sci-Fi
    // ------------------------------------------------------------------------
    case 'tech_core':
    case 'chip':
    case 'battery': {
      const cx = 11; const cy = 11;
      for (let y = 4; y <= 18; y++) {
        for (let x = 4; x <= 18; x++) {
          const isEdge = x === 4 || x === 18 || y === 4 || y === 18;
          setP(g, x, y, isEdge ? 7 : 2);
        }
      }
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (dx * dx + dy * dy <= 16) {
            setP(g, cx + dx, cy + dy, (dx === 0 && dy === 0) ? 5 : 8);
          }
        }
      }
      setP(g, 5, 5, 14); setP(g, 17, 17, 14);
      break;
    }

    case 'robot': {
      // Futuristic Android Head
      for (let y = 6; y <= 17; y++) {
        for (let x = 6; x <= 16; x++) {
          setP(g, x, y, y === 6 || x === 6 ? 7 : 6);
        }
      }
      // Antenna
      setP(g, 11, 3, 14); setP(g, 11, 4, 7); setP(g, 11, 5, 7);
      // Glowing Optical Visor Eyes
      setP(g, 8, 10, 14); setP(g, 9, 10, 5);
      setP(g, 13, 10, 14); setP(g, 14, 10, 5);
      // Speaker grille
      setP(g, 9, 14, 2); setP(g, 11, 14, 2); setP(g, 13, 14, 2);
      break;
    }

    case 'rocket': {
      // Rocket Body
      for (let y = 3; y <= 15; y++) {
        const w = Math.min(4, Math.floor((y - 3) * 0.5) + 1);
        for (let x = 11 - w; x <= 11 + w; x++) {
          setP(g, x, y, x === 11 - w ? 5 : x === 11 + w ? 2 : 7);
        }
      }
      // Porthole window
      setP(g, 11, 8, 14); setP(g, 11, 9, 5);
      // Side fins
      setP(g, 5, 14, 8); setP(g, 6, 14, 8); setP(g, 5, 15, 8);
      setP(g, 16, 14, 8); setP(g, 17, 14, 8); setP(g, 17, 15, 8);
      // Exhaust Flame
      setP(g, 11, 17, 10); setP(g, 10, 18, 8); setP(g, 11, 18, 5); setP(g, 12, 18, 8);
      setP(g, 11, 19, 8); setP(g, 11, 20, 10);
      break;
    }

    case 'gear':
    case 'watch': {
      const gx = 11; const gy = 11; const r = 6;
      for (let y = gy - r; y <= gy + r; y++) {
        for (let x = gx - r; x <= gx + r; x++) {
          const d2 = (x - gx) * (x - gx) + (y - gy) * (y - gy);
          if (d2 <= r * r && d2 >= 4) setP(g, x, y, (x < gx || y < gy) ? 10 : 7);
        }
      }
      const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
      teeth.forEach((ang) => {
        const rad = (ang * Math.PI) / 180;
        setP(g, Math.round(gx + Math.cos(rad) * 8), Math.round(gy + Math.sin(rad) * 8), 10);
      });
      setP(g, gx, gy, gemColor);
      break;
    }

    // ------------------------------------------------------------------------
    // Minerals, Metals & Crystals
    // ------------------------------------------------------------------------
    case 'ingot': {
      for (let y = 13; y <= 18; y++) {
        const inset = Math.floor((18 - y) * 0.6);
        for (let x = 4 + inset; x <= 20 - inset; x++) setP(g, x, y, y === 13 ? 4 : (x < 10) ? 5 : 3);
      }
      for (let y = 7; y <= 12; y++) {
        const inset = Math.floor((12 - y) * 0.6);
        for (let x = 6 + inset; x <= 18 - inset; x++) setP(g, x, y, y === 7 ? 5 : (x < 11) ? 4 : 3);
      }
      break;
    }

    case 'ore':
    case 'crystal': {
      const cx = 11;
      for (let y = 3; y <= 19; y++) {
        const w = y <= 10 ? Math.floor((y - 3) * 0.8) : Math.max(1, Math.floor((19 - y) * 0.7));
        for (let x = cx - w; x <= cx + w; x++) {
          setP(g, x, y, x < cx && y < 11 ? 5 : x < cx ? 4 : (y > 15 ? 2 : 3));
        }
      }
      for (let y = 9; y <= 17; y++) {
        const w = Math.floor((17 - y) * 0.5);
        for (let x = 5 - w; x <= 5 + w; x++) setP(g, x, y, x < 5 ? 5 : 3);
      }
      for (let y = 10; y <= 18; y++) {
        const w = Math.floor((18 - y) * 0.5);
        for (let x = 17 - w; x <= 17 + w; x++) setP(g, x, y, x < 17 ? 4 : 2);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Elements: Fire, Ice, Water, Lightning, Star
    // ------------------------------------------------------------------------
    case 'fire':
    case 'star': {
      const fx = 11; const fy = 11;
      for (let y = 3; y <= 19; y++) {
        const rad = Math.round(Math.sin(((y - 3) / 16) * Math.PI) * 7);
        for (let x = fx - rad; x <= fx + rad; x++) {
          const dist = Math.abs(x - fx) + Math.abs(y - fy);
          setP(g, x, y, dist <= 2 ? 5 : dist <= 4 ? 9 : dist <= 6 ? 8 : 3);
        }
      }
      break;
    }

    case 'water':
    case 'ice': {
      const cx = 11;
      for (let y = 4; y <= 18; y++) {
        const rad = Math.round(Math.sin(((y - 4) / 14) * Math.PI) * 7);
        for (let x = cx - rad; x <= cx + rad; x++) {
          setP(g, x, y, (x < cx && y < 10) ? 5 : (x < cx) ? 4 : 3);
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Relics & Ornate Dynamic Procedural Artifact
    // ------------------------------------------------------------------------
    case 'tool_craft':
    case 'artifact':
    default: {
      // Procedural Ancient Relic Medallion / Celestial Talisman
      const cx = 11; const cy = 11;
      // Ornate outer octagon / crest
      for (let y = 3; y <= 19; y++) {
        const w = y <= 7 ? y - 3 + 4 : y >= 15 ? 19 - y + 4 : 8;
        for (let x = cx - w; x <= cx + w; x++) {
          const isBorder = x === cx - w || x === cx + w || y === 3 || y === 19;
          setP(g, x, y, isBorder ? 10 : (x < cx && y < cy) ? 4 : (x > cx || y > cy) ? 2 : 3);
        }
      }
      // Inner Runic Inscription Ring
      for (let y = 6; y <= 16; y++) {
        for (let x = 6; x <= 16; x++) {
          if (x === 6 || x === 16 || y === 6 || y === 16) setP(g, x, y, 7);
        }
      }
      // Radiant Center Core Gem
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist <= 2) {
            setP(g, cx + dx, cy + dy, dist === 0 ? 5 : gemColor);
          }
        }
      }
      // 4 Corner Power Runes
      setP(g, 5, 5, 14); setP(g, 17, 5, 14);
      setP(g, 5, 17, 14); setP(g, 17, 17, 14);
      break;
    }
  }

  // Add crisp RPG dark outer contour
  addAutomaticOutlines(g);

  return g;
}

// ----------------------------------------------------------------------------
// Master Procedural Sprite Renderer with Auto-Framing & Dynamic Scaling
// ----------------------------------------------------------------------------

import { getCachedSprite } from './background-sprite-painter';

export function drawProceduralSprite(
  canvas: HTMLCanvasElement,
  config: SpriteConfig,
  sizePx: number = 140
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = sizePx * dpr;
  canvas.height = sizePx * dpr;
  ctx.scale(dpr, dpr);

  ctx.imageSmoothingEnabled = false;

  const hash = hashString(
    (config.name || '') + (config.category || '') + (config.emoji || '') + (config.seed || '')
  );
  const rarity = config.rarity || 'Common';
  const palette = RARITY_PALETTES[rarity] || RARITY_PALETTES.Common;
  const primaryColor = config.color || getItemColor(config);
  const archetype = detectArchetype(config.name, config.category, config.emoji);

  // 1. Subtle, Clean Pedestal Radial Glow (No heavy obstructive corner tabs)
  ctx.clearRect(0, 0, sizePx, sizePx);
  const bgGrad = ctx.createRadialGradient(
    sizePx / 2,
    sizePx / 2,
    1,
    sizePx / 2,
    sizePx / 2,
    sizePx * 0.7
  );
  bgGrad.addColorStop(0, '#151d2f');
  bgGrad.addColorStop(0.7, '#0a0e18');
  bgGrad.addColorStop(1, '#03060c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, sizePx, sizePx);

  // 2. Soft Ambient Halo matching the item's theme color
  ctx.save();
  ctx.beginPath();
  ctx.arc(sizePx / 2, sizePx / 2, sizePx * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = `${primaryColor}26`;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = sizePx >= 80 ? 16 : 8;
  ctx.fill();
  ctx.restore();

  // 3. Obtain Matrix (from background cache or procedural synthesizer)
  const cached = getCachedSprite(config.name);
  const pixelMatrix = (cached && cached.matrix) ? cached.matrix : generateArchetypePixelMatrix(archetype, hash, config.name, config.category);
  const matrixSize = pixelMatrix.length || 64;

  // Find exact bounding box of drawn pixels for optimal auto-centering & filling
  let minX = matrixSize;
  let maxX = 0;
  let minY = matrixSize;
  let maxY = 0;
  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (pixelMatrix[y][x] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If blank fallback
  if (minX > maxX) {
    minX = 4; maxX = 19; minY = 4; maxY = 19;
  }

  const spriteW = maxX - minX + 1;
  const spriteH = maxY - minY + 1;
  const maxDim = Math.max(spriteW, spriteH);

  // Auto-scale so the actual pixel art fills ~88% of the canvas with crisp subpixel or integer precision
  const targetArea = sizePx * 0.88;
  const pixelScale = Math.max(0.25, targetArea / maxDim);

  // Compute exact center offset for the bounded sprite
  const renderedW = spriteW * pixelScale;
  const renderedH = spriteH * pixelScale;
  const startX = (sizePx - renderedW) / 2 - minX * pixelScale;
  const startY = (sizePx - renderedH) / 2 - minY * pixelScale;

  // 24-Color High-Definition Material Palette
  const colorMap: Record<number, string> = {
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
  };

  // Render Crisp Pixels without hairline gaps
  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      const val = pixelMatrix[y][x];
      if (val === 0) continue;

      ctx.fillStyle = colorMap[val] || primaryColor;
      const px = Math.floor(startX + x * pixelScale);
      const py = Math.floor(startY + y * pixelScale);
      const pw = Math.max(1, Math.ceil(startX + (x + 1) * pixelScale) - px);
      const ph = Math.max(1, Math.ceil(startY + (y + 1) * pixelScale) - py);
      ctx.fillRect(px, py, pw, ph);
    }
  }

  // 4. Subtle Ambient Scanline
  if (sizePx >= 60) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < sizePx; y += 3) {
      ctx.fillRect(0, y, sizePx, 1);
    }
  }

  // 5. Sparkle Particles for Rare/Epic/Legendary Items
  if (palette.sparkles > 0 && sizePx >= 60) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < palette.sparkles; i++) {
      const angle = (((hash + i * 79) % 360) * Math.PI) / 180;
      const dist = sizePx * 0.35 + ((hash * (i + 1)) % (sizePx * 0.1));
      const sx = sizePx / 2 + Math.cos(angle) * dist;
      const sy = sizePx / 2 + Math.sin(angle) * dist;
      const pSize = i % 2 === 0 ? 2 : 1.2;

      ctx.beginPath();
      ctx.arc(sx, sy, pSize, 0, Math.PI * 2);
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.restore();
  }
}
