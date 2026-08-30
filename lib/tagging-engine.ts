/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Automated Semantic Tagging & Classification Engine
 * Analyzes ingredient names, tool descriptions, and item titles to dynamically
 * suggest accurate categories, primary & secondary emojis, semantic tags, and materials.
 */

import { detectArchetype, ItemArchetype, getItemColor } from './sprite-engine';

export interface ItemAnalysisResult {
  suggestedCategory: string;
  primaryEmoji: string;
  suggestedEmojis: string[];
  suggestedTags: string[];
  detectedArchetype: ItemArchetype;
  themeColor: string;
  material: string;
  raritySuggestion: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  confidence: number;
}

// ----------------------------------------------------------------------------
// Taxonomic Keyword Rules
// ----------------------------------------------------------------------------

interface TagRule {
  keywords: string[];
  category: string;
  primaryEmoji: string;
  emojis: string[];
  tags: string[];
  material: string;
  archetype?: ItemArchetype;
}

const TAXONOMY_RULES: TagRule[] = [
  // Specific Gourmet & Alchemical Materials
  {
    keywords: ['waffle', 'pancake', 'toast', 'batter', 'syrup'],
    category: 'Gourmet',
    primaryEmoji: '🧇',
    emojis: ['🧇', '🥞', '🧈', '🍯', '✨'],
    tags: ['#gourmet', '#pastry', '#golden-crust', '#sweet', '#breakfast'],
    material: 'Golden Batter & Butter',
    archetype: 'waffle',
  },
  {
    keywords: ['shallot', 'onion', 'garlic', 'scallion', 'leek', 'allium'],
    category: 'Gourmet',
    primaryEmoji: '🧅',
    emojis: ['🧅', '🧄', '🌿', '🌱', '✨'],
    tags: ['#botanical', '#allium', '#aromatic', '#pungent', '#essence'],
    material: 'Shallot Layers',
    archetype: 'shallot',
  },
  {
    keywords: ['hydrosol', 'distill', 'distillate', 'essence', 'solvent', 'extract', 'vapor'],
    category: 'Alchemy',
    primaryEmoji: '⚗️',
    emojis: ['⚗️', '🧪', '💧', '✨', '🫙'],
    tags: ['#alchemy', '#distillate', '#volatile', '#essence', '#pure'],
    material: 'Concentrated Hydrosol',
    archetype: 'hydrosol',
  },
  {
    keywords: ['cindercloth', 'cinder', 'ember-cloth', 'pyro-fabric'],
    category: 'Crafting',
    primaryEmoji: '🧵',
    emojis: ['🧵', '🔥', '🦺', '✨', '⚡'],
    tags: ['#textile', '#pyro', '#ember-weave', '#flame-resistant', '#cloth'],
    material: 'Cinder-Woven Silk',
    archetype: 'cindercloth',
  },
  {
    keywords: ['membrane', 'myco-membrane', 'polymer-membrane', 'bio-membrane', 'cellular'],
    category: 'Alchemy',
    primaryEmoji: '🧬',
    emojis: ['🧬', '🦠', '🍄', '✨', '🛡️'],
    tags: ['#bio-polymer', '#membrane', '#mycelium', '#cellular', '#semi-permeable'],
    material: 'Myco-Polymer Lattice',
    archetype: 'myco_membrane',
  },
  {
    keywords: ['mushroom', 'fungus', 'myco', 'spore', 'toadstool'],
    category: 'Alchemy',
    primaryEmoji: '🍄',
    emojis: ['🍄', '🌿', '✨', '🧪', '🌲'],
    tags: ['#mycology', '#fungus', '#spores', '#organic', '#bioluminescent'],
    material: 'Spore Fungus',
    archetype: 'mushroom',
  },
  // Weapons
  {
    keywords: ['sword', 'blade', 'katana', 'saber', 'rapier', 'claymore', 'falchion', 'broadsword'],
    category: 'Weapon',
    primaryEmoji: '⚔️',
    emojis: ['⚔️', '🗡️', '🤺', '✨', '⚡', '🛡️'],
    tags: ['#weapon', '#melee', '#blade', '#sharp', '#combat'],
    material: 'Refined Steel',
    archetype: 'sword',
  },
  {
    keywords: ['dagger', 'knife', 'kunai', 'stiletto', 'shiv', 'dirk', 'scalpel'],
    category: 'Weapon',
    primaryEmoji: '🗡️',
    emojis: ['🗡️', '⚔️', '🩸', '⚡', '🎯'],
    tags: ['#weapon', '#stealth', '#blade', '#piercing', '#swift'],
    material: 'Hardened Steel',
    archetype: 'dagger',
  },
  {
    keywords: ['pickaxe', 'pick', 'mattock'],
    category: 'Crafting',
    primaryEmoji: '⛏️',
    emojis: ['⛏️', '🔨', '🪨', '🧱', '💎'],
    tags: ['#tool', '#mining', '#excavation', '#heavy', '#crafting'],
    material: 'Forged Iron',
    archetype: 'pickaxe',
  },
  {
    keywords: ['axe', 'battleaxe', 'hatchet', 'cleaver', 'tomahawk', 'chopper'],
    category: 'Weapon',
    primaryEmoji: '🪓',
    emojis: ['🪓', '⚔️', '🪵', '🩸', '🛡️'],
    tags: ['#weapon', '#cleave', '#heavy', '#woodcutting', '#combat'],
    material: 'Cast Iron',
    archetype: 'axe',
  },
  {
    keywords: ['hammer', 'warhammer', 'mace', 'mallet', 'maul', 'flail', 'crush', 'sledgehammer'],
    category: 'Weapon',
    primaryEmoji: '🔨',
    emojis: ['🔨', '⚒️', '🧱', '⚡', '🛡️'],
    tags: ['#weapon', '#blunt', '#forge', '#heavy', '#smash'],
    material: 'Solid Steel',
    archetype: 'hammer',
  },
  {
    keywords: ['spear', 'lance', 'trident', 'javelin', 'polearm', 'halberd', 'pike'],
    category: 'Weapon',
    primaryEmoji: '🔱',
    emojis: ['🔱', '⚔️', '🌊', '🎯', '🛡️'],
    tags: ['#weapon', '#reach', '#piercing', '#polearm', '#combat'],
    material: 'Reinforced Steel',
    archetype: 'spear',
  },
  {
    keywords: ['bow', 'longbow', 'recurve', 'arrow', 'quiver', 'archery'],
    category: 'Weapon',
    primaryEmoji: '🏹',
    emojis: ['🏹', '🎯', '🪶', '🌲', '⚡'],
    tags: ['#weapon', '#ranged', '#precision', '#projectile', '#woodcraft'],
    material: 'Yew Wood & Cord',
    archetype: 'bow',
  },
  {
    keywords: ['crossbow', 'arbalest', 'bolt'],
    category: 'Weapon',
    primaryEmoji: '🏹',
    emojis: ['🏹', '⚙️', '🎯', '⚡', '🛡️'],
    tags: ['#weapon', '#ranged', '#mechanical', '#heavy-bolt', '#piercing'],
    material: 'Steel & Hardwood',
    archetype: 'crossbow',
  },
  {
    keywords: ['scythe', 'sickle', 'reaper'],
    category: 'Weapon',
    primaryEmoji: '⚔️',
    emojis: ['⚔️', '💀', '🌾', '🌙', '🩸'],
    tags: ['#weapon', '#curved', '#reaper', '#harvest', '#dark'],
    material: 'Obsidian Steel',
    archetype: 'scythe',
  },
  {
    keywords: ['blaster', 'laser', 'gun', 'pistol', 'rifle', 'cannon', 'plasma', 'raygun', 'phaser'],
    category: 'Tech',
    primaryEmoji: '🔫',
    emojis: ['🔫', '⚡', '⚛️', '🚀', '💥', '🔋'],
    tags: ['#sci-fi', '#energy', '#ranged', '#plasma', '#high-tech'],
    material: 'Poly-Alloy & Emitter',
    archetype: 'blaster',
  },

  // Armor & Gear
  {
    keywords: ['shield', 'buckler', 'aegis', 'ward', 'bulwark', 'barrier'],
    category: 'Armor',
    primaryEmoji: '🛡️',
    emojis: ['🛡️', '⚔️', '🧱', '✨', '🦺'],
    tags: ['#armor', '#defense', '#guard', '#blocking', '#protective'],
    material: 'Plate Alloy',
    archetype: 'shield',
  },
  {
    keywords: ['armor', 'chestplate', 'cuirass', 'plate', 'breastplate', 'chainmail', 'hauberk', 'tunic', 'suit'],
    category: 'Armor',
    primaryEmoji: '🦺',
    emojis: ['🦺', '🛡️', '🥋', '⚙️', '✨'],
    tags: ['#armor', '#wearable', '#defense', '#plated', '#protective'],
    material: 'Tempered Steel',
    archetype: 'armor',
  },
  {
    keywords: ['helmet', 'helm', 'mask', 'visor', 'hood', 'headgear'],
    category: 'Armor',
    primaryEmoji: '🪖',
    emojis: ['🪖', '🛡️', '👑', '🎭', '✨'],
    tags: ['#armor', '#headgear', '#protection', '#visor'],
    material: 'Hardened Metal',
    archetype: 'helmet',
  },
  {
    keywords: ['crown', 'tiara', 'circlet', 'diadem', 'coronet'],
    category: 'Magic',
    primaryEmoji: '👑',
    emojis: ['👑', '💎', '✨', '⭐', '💍'],
    tags: ['#royal', '#jewelry', '#magic', '#enchanted', '#precious'],
    material: 'Polished Gold',
    archetype: 'crown',
  },
  {
    keywords: ['boot', 'shoe', 'greave', 'sabatons', 'treads', 'sneaker'],
    category: 'Armor',
    primaryEmoji: '👢',
    emojis: ['👢', '👟', '🪶', '⚡', '🛡️'],
    tags: ['#armor', '#footwear', '#speed', '#mobility', '#travel'],
    material: 'Treated Leather',
    archetype: 'boots',
  },
  {
    keywords: ['gauntlet', 'glove', 'bracer', 'mitt'],
    category: 'Armor',
    primaryEmoji: '🥊',
    emojis: ['🥊', '🛡️', '⚡', '🦾', '✨'],
    tags: ['#armor', '#handwear', '#strength', '#grip', '#punch'],
    material: 'Reinforced Metal',
    archetype: 'gauntlet',
  },
  {
    keywords: ['ring', 'band', 'signet'],
    category: 'Magic',
    primaryEmoji: '💍',
    emojis: ['💍', '💎', '✨', '⭐', '🔮'],
    tags: ['#jewelry', '#accessory', '#enchanted', '#gemstone', '#magic'],
    material: 'Gold & Diamond',
    archetype: 'ring',
  },
  {
    keywords: ['amulet', 'pendant', 'necklace', 'talisman', 'medallion', 'locket'],
    category: 'Magic',
    primaryEmoji: '📿',
    emojis: ['📿', '💎', '🔮', '✨', '⭐'],
    tags: ['#magic', '#talisman', '#ward', '#arcane', '#channel'],
    material: 'Enchanted Crystal',
    archetype: 'amulet',
  },

  // Magic & Alchemy
  {
    keywords: ['potion', 'elixir', 'vial', 'flask', 'brew', 'tonic', 'phial', 'draught', 'distill', 'infuse'],
    category: 'Alchemy',
    primaryEmoji: '🧪',
    emojis: ['🧪', '🫙', '⚗️', '✨', '💧', '🌿'],
    tags: ['#alchemy', '#consumable', '#liquid', '#magical', '#brew'],
    material: 'Glass & Distillate',
    archetype: 'potion',
  },
  {
    keywords: ['cauldron', 'alembic', 'crucible', 'pot', 'ferment'],
    category: 'Alchemy',
    primaryEmoji: '⚗️',
    emojis: ['⚗️', '🧪', '🔥', '🔮', '✨'],
    tags: ['#alchemy', '#vessel', '#brewing', '#synthesis', '#tool'],
    material: 'Cast Iron Pot',
    archetype: 'cauldron',
  },
  {
    keywords: ['wand', 'scepter', 'rod'],
    category: 'Magic',
    primaryEmoji: '🪄',
    emojis: ['🪄', '⭐', '✨', '🔮', '🌟'],
    tags: ['#magic', '#focus', '#spellcasting', '#arcane', '#wand'],
    material: 'Heartwood & Core',
    archetype: 'wand',
  },
  {
    keywords: ['staff', 'cane', 'pole'],
    category: 'Magic',
    primaryEmoji: '🪄',
    emojis: ['🪄', '🔮', '⭐', '🪵', '✨'],
    tags: ['#magic', '#staff', '#channel', '#ancient', '#wizard'],
    material: 'Elderwood & Orb',
    archetype: 'staff',
  },
  {
    keywords: ['grimoire', 'book', 'tome', 'spellbook', 'codex', 'manual'],
    category: 'Magic',
    primaryEmoji: '📖',
    emojis: ['📖', '📕', '📜', '✨', '🔮'],
    tags: ['#tome', '#knowledge', '#spells', '#arcane', '#study'],
    material: 'Vellum & Leather',
    archetype: 'tome',
  },
  {
    keywords: ['scroll', 'parchment', 'map', 'blueprint', 'inscribe', 'charter'],
    category: 'Magic',
    primaryEmoji: '📜',
    emojis: ['📜', '📄', '🖋️', '✨', '🗺️'],
    tags: ['#scroll', '#runes', '#enchanted', '#blueprint', '#paper'],
    material: 'Ancient Parchment',
    archetype: 'scroll',
  },
  {
    keywords: ['orb', 'sphere', 'crystal ball', 'palantir'],
    category: 'Magic',
    primaryEmoji: '🔮',
    emojis: ['🔮', '✨', '⭐', '👁️', '💎'],
    tags: ['#magic', '#divination', '#scrying', '#orb', '#focus'],
    material: 'Pure Crystal Glass',
    archetype: 'orb',
  },
  {
    keywords: ['feather', 'plume', 'quill', 'wing', 'phoenix'],
    category: 'Material',
    primaryEmoji: '🪶',
    emojis: ['🪶', '🔥', '✨', '🕊️', '🪄'],
    tags: ['#organic', '#flight', '#lightweight', '#phoenix', '#magic'],
    material: 'Mythic Plumage',
    archetype: 'feather',
  },
  {
    keywords: ['skull', 'bone', 'skeleton', 'curse', 'undead', 'necro'],
    category: 'Magic',
    primaryEmoji: '💀',
    emojis: ['💀', '☠️', '🖤', '🕯️', '🔮'],
    tags: ['#dark', '#relic', '#bone', '#necromancy', '#ancient'],
    material: 'Fossilized Bone',
    archetype: 'skull',
  },

  // Tech & Sci-Fi
  {
    keywords: ['reactor', 'core', 'quantum', 'fusion', 'singularity', 'engine', 'matrix'],
    category: 'Tech',
    primaryEmoji: '⚛️',
    emojis: ['⚛️', '🔋', '⚡', '🚀', '💥', '🛸'],
    tags: ['#quantum', '#power-source', '#high-energy', '#reactor', '#sci-fi'],
    material: 'Plasma Containment',
    archetype: 'tech_core',
  },
  {
    keywords: ['chip', 'cpu', 'circuit', 'microchip', 'microprocessor', 'silicon', 'firmware', 'program'],
    category: 'Tech',
    primaryEmoji: '💻',
    emojis: ['💻', '🟫', '🟩', '⚙️', '⚡', '🔋'],
    tags: ['#electronics', '#silicon', '#computing', '#circuit', '#logic'],
    material: 'Silicon Wafer',
    archetype: 'chip',
  },
  {
    keywords: ['battery', 'power cell', 'cell', 'charge', 'accumulator', 'capacitor'],
    category: 'Tech',
    primaryEmoji: '🔋',
    emojis: ['🔋', '⚡', '🔌', '⚛️', '💡'],
    tags: ['#energy-storage', '#electric', '#battery', '#chemical', '#power'],
    material: 'Lithium-Ion Polymer',
    archetype: 'battery',
  },
  {
    keywords: ['robot', 'droid', 'mech', 'cyborg', 'android', 'automaton', 'golem'],
    category: 'Tech',
    primaryEmoji: '🤖',
    emojis: ['🤖', '🦾', '⚙️', '💻', '🚀'],
    tags: ['#robotics', '#automation', '#cybernetic', '#mech', '#ai'],
    material: 'Titanium Framework',
    archetype: 'robot',
  },
  {
    keywords: ['rocket', 'shuttle', 'starship', 'spaceship', 'spacecraft', 'satellite'],
    category: 'Engineering',
    primaryEmoji: '🚀',
    emojis: ['🚀', '🛰️', '🌌', '⭐', '🛸', '🔥'],
    tags: ['#aerospace', '#spacecraft', '#thruster', '#propulsion', '#engineering'],
    material: 'Heat-Resistant Alloy',
    archetype: 'rocket',
  },
  {
    keywords: ['watch', 'clock', 'timer', 'chronometer', 'chronograph', 'hourglass'],
    category: 'Tech',
    primaryEmoji: '⌚',
    emojis: ['⌚', '⏰', '⏳', '⚙️', '✨'],
    tags: ['#timepiece', '#precision', '#gears', '#chronograph', '#watch'],
    material: 'Sapphire & Steel',
    archetype: 'watch',
  },
  {
    keywords: ['gear', 'cog', 'sprocket', 'machine', 'mechanism', 'grind', 'calibrate'],
    category: 'Engineering',
    primaryEmoji: '⚙️',
    emojis: ['⚙️', '🔧', '🔨', '🔩', '🧱'],
    tags: ['#mechanical', '#kinetics', '#gears', '#machinery', '#engineering'],
    material: 'Machined Brass',
    archetype: 'gear',
  },
  {
    keywords: ['magnet', 'magnetize', 'polarity', 'electromagnet'],
    category: 'Tech',
    primaryEmoji: '🧲',
    emojis: ['🧲', '⚡', '🔩', '🧱', '⚛️'],
    tags: ['#magnetic', '#physics', '#ferrous', '#induction', '#tech'],
    material: 'Neodymium Alloy',
    archetype: 'magnet',
  },
  {
    keywords: ['wire', 'cable', 'cord', 'copper wire', 'fiber', 'solder', 'plug'],
    category: 'Component',
    primaryEmoji: '🔌',
    emojis: ['🔌', '⚡', '🧵', '💡', '💻'],
    tags: ['#conductor', '#wiring', '#copper', '#signal', '#connectivity'],
    material: 'Drawn Copper',
    archetype: 'wire',
  },
  {
    keywords: ['torch', 'flashlight', 'lantern', 'lamp', 'brazier'],
    category: 'Crafting',
    primaryEmoji: '🔦',
    emojis: ['🔦', '🔥', '💡', '✨', '🪵'],
    tags: ['#illumination', '#light', '#fire', '#exploration', '#tool'],
    material: 'Wood & Pitch',
    archetype: 'torch',
  },
  {
    keywords: ['compass', 'radar', 'sonar', 'navigator'],
    category: 'Tech',
    primaryEmoji: '🧭',
    emojis: ['🧭', '🗺️', '📍', '⭐', '🧲'],
    tags: ['#navigation', '#direction', '#magnetic', '#exploration', '#tool'],
    material: 'Brass & Needle',
    archetype: 'compass',
  },
  {
    keywords: ['telescope', 'spyglass', 'lens', 'optics', 'microscope'],
    category: 'Tech',
    primaryEmoji: '🔭',
    emojis: ['🔭', '🔬', '🌌', '⭐', '👁️'],
    tags: ['#optics', '#magnification', '#observation', '#glass', '#lens'],
    material: 'Optical Crown Glass',
    archetype: 'telescope',
  },

  // Food & Culinary
  {
    keywords: ['ramen', 'noodle', 'soup', 'stew', 'chowder', 'broth', 'pasta', 'spaghetti', 'bowl'],
    category: 'Food',
    primaryEmoji: '🍜',
    emojis: ['🍜', '🍲', '🥣', '🥢', '🥟', '🍤'],
    tags: ['#culinary', '#savory', '#broth', '#noodles', '#hot-dish'],
    material: 'Wheat & Savory Broth',
    archetype: 'food_bowl',
  },
  {
    keywords: ['pizza', 'flatbread', 'calzone'],
    category: 'Food',
    primaryEmoji: '🍕',
    emojis: ['🍕', '🧀', '🍅', '🍞', '🔥'],
    tags: ['#culinary', '#baked', '#cheese', '#crust', '#italian'],
    material: 'Baked Dough & Cheese',
    archetype: 'pizza',
  },
  {
    keywords: ['burger', 'sandwich', 'cheeseburger', 'taco', 'burrito', 'wrap'],
    category: 'Food',
    primaryEmoji: '🍔',
    emojis: ['🍔', '🥪', '🌮', '🥩', '🧀'],
    tags: ['#culinary', '#hearty', '#meat', '#buns', '#handheld'],
    material: 'Seared Meat & Buns',
    archetype: 'burger',
  },
  {
    keywords: ['cake', 'pastry', 'pie', 'cookie', 'biscuit', 'dessert', 'cupcake', 'donut', 'torte'],
    category: 'Food',
    primaryEmoji: '🍰',
    emojis: ['🍰', '🎂', '🧁', '🍪', '🍩', '🍓'],
    tags: ['#culinary', '#sweet', '#confection', '#baked', '#dessert'],
    material: 'Sugared Pastry',
    archetype: 'cake',
  },
  {
    keywords: ['steak', 'meat', 'beef', 'pork', 'poultry', 'chicken', 'roast', 'bbq', 'ribs', 'bacon', 'ham'],
    category: 'Food',
    primaryEmoji: '🥩',
    emojis: ['🥩', '🍗', '🍖', '🥓', '🔥'],
    tags: ['#culinary', '#protein', '#roasted', '#savory', '#grill'],
    material: 'Cured Meat',
    archetype: 'meat',
  },
  {
    keywords: ['bread', 'baguette', 'loaf', 'croissant', 'toast', 'dough', 'flour'],
    category: 'Food',
    primaryEmoji: '🍞',
    emojis: ['🍞', '🥖', '🥯', '🌾', '🧈'],
    tags: ['#culinary', '#baked', '#staple', '#grain', '#carbs'],
    material: 'Milled Grain Dough',
    archetype: 'bread',
  },
  {
    keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'tea', 'matcha', 'chai', 'mug', 'cup', 'drink', 'beverage', 'juice', 'milk'],
    category: 'Food',
    primaryEmoji: '☕',
    emojis: ['☕', '🍵', '🫖', '🥛', '🧃', '🥤'],
    tags: ['#beverage', '#steeped', '#caffeine', '#warm', '#drink'],
    material: 'Brewed Infusion',
    archetype: 'drink',
  },
  {
    keywords: ['sushi', 'sashimi', 'roll', 'maki', 'nigiri'],
    category: 'Food',
    primaryEmoji: '🍣',
    emojis: ['🍣', '🍱', '🍚', '🐟', '🥢'],
    tags: ['#culinary', '#fresh', '#seafood', '#rice', '#japanese'],
    material: 'Rice & Fresh Fish',
    archetype: 'sushi',
  },
  {
    keywords: ['cheese', 'cheddar', 'parmesan', 'gouda', 'mozzarella'],
    category: 'Food',
    primaryEmoji: '🧀',
    emojis: ['🧀', '🥛', '🍕', '🥖', '🐭'],
    tags: ['#culinary', '#dairy', '#aged', '#savory', '#rich'],
    material: 'Cultured Dairy',
    archetype: 'cheese',
  },
  {
    keywords: ['fruit', 'apple', 'berry', 'orange', 'banana', 'grape', 'lemon', 'melon'],
    category: 'Food',
    primaryEmoji: '🍎',
    emojis: ['🍎', '🍓', '🍇', '🍊', '🍋', '🌿'],
    tags: ['#organic', '#fresh', '#sweet', '#fruit', '#natural'],
    material: 'Fresh Harvest',
    archetype: 'fruit',
  },

  // Raw Materials & Minerals
  {
    keywords: ['ingot', 'steel', 'gold', 'silver', 'copper', 'iron', 'titanium', 'bronze', 'platinum', 'bar', 'bullion', 'alloy', 'metal'],
    category: 'Material',
    primaryEmoji: '🧱',
    emojis: ['🧱', '🪙', '✨', '🔨', '🔥'],
    tags: ['#metallurgy', '#refined', '#ingot', '#smelted', '#dense'],
    material: 'Refined Metal',
    archetype: 'ingot',
  },
  {
    keywords: ['ore', 'stone', 'rock', 'mineral', 'coal', 'obsidian', 'boulder', 'gravel'],
    category: 'Raw Material',
    primaryEmoji: '🪨',
    emojis: ['🪨', '⛏️', '🧱', '🌋', '💎'],
    tags: ['#geology', '#raw-ore', '#unprocessed', '#earth', '#smeltable'],
    material: 'Mineral Ore',
    archetype: 'ore',
  },
  {
    keywords: ['crystal', 'gem', 'diamond', 'ruby', 'emerald', 'sapphire', 'quartz', 'amethyst', 'topaz', 'shard', 'jewel'],
    category: 'Material',
    primaryEmoji: '💎',
    emojis: ['💎', '✨', '🔮', '⭐', '💍'],
    tags: ['#gemstone', '#crystalline', '#precious', '#refraction', '#mineral'],
    material: 'Faceted Gemstone',
    archetype: 'crystal',
  },
  {
    keywords: ['wood', 'log', 'timber', 'lumber', 'plank', 'bark', 'branch'],
    category: 'Raw Material',
    primaryEmoji: '🪵',
    emojis: ['🪵', '🌲', '🪓', '🌿', '🔥'],
    tags: ['#wood', '#timber', '#organic', '#carving', '#combustible'],
    material: 'Solid Hardwood',
    archetype: 'wood',
  },
  {
    keywords: ['cloth', 'fabric', 'cotton', 'silk', 'wool', 'textile', 'leather', 'hide', 'fur'],
    category: 'Material',
    primaryEmoji: '🧵',
    emojis: ['🧵', '🪡', '🧶', '🦺', '✨'],
    tags: ['#textile', '#flexible', '#woven', '#leathercraft', '#tailoring'],
    material: 'Spun Fiber / Leather',
    archetype: 'cloth',
  },
  {
    keywords: ['thread', 'yarn', 'needle', 'spool', 'sew', 'stitch'],
    category: 'Component',
    primaryEmoji: '🧵',
    emojis: ['🧵', '🪡', '🧶', '✂️', '🦺'],
    tags: ['#sewing', '#tailoring', '#filament', '#thread', '#craft'],
    material: 'Twisted Thread',
    archetype: 'cloth',
  },
  {
    keywords: ['anvil', 'smelt', 'forge', 'weld', 'blacksmith'],
    category: 'Crafting',
    primaryEmoji: '⚒️',
    emojis: ['⚒️', '🔨', '🔥', '🧱', '🛡️'],
    tags: ['#blacksmithing', '#forge', '#metallurgy', '#heavy-tool', '#industrial'],
    material: 'Cast Steel Anvil',
    archetype: 'anvil',
  },
  {
    keywords: ['key', 'keycard', 'lockpick', 'cipher'],
    category: 'Component',
    primaryEmoji: '🔑',
    emojis: ['🔑', '🗝️', '🚪', '✨', '🔐'],
    tags: ['#access', '#security', '#locksmith', '#key', '#unlock'],
    material: 'Brass / Electronic Token',
    archetype: 'key',
  },
  {
    keywords: ['chest', 'crate', 'box', 'vault', 'coffer'],
    category: 'Crafting',
    primaryEmoji: '📦',
    emojis: ['📦', '🧰', '🪵', '🔒', '💎'],
    tags: ['#storage', '#container', '#vault', '#inventory', '#woodcraft'],
    material: 'Reinforced Wood & Iron',
    archetype: 'chest',
  },

  // Nature & Elemental
  {
    keywords: ['leaf', 'herb', 'plant', 'botanical', 'flora', 'moss', 'vine', 'sprout'],
    category: 'Material',
    primaryEmoji: '🌿',
    emojis: ['🌿', '🌱', '🍃', '🍀', '🌸'],
    tags: ['#botanical', '#herbal', '#nature', '#organic', '#ingredient'],
    material: 'Living Flora',
    archetype: 'leaf',
  },
  {
    keywords: ['flower', 'bloom', 'blossom', 'rose', 'lotus', 'petal', 'sunflower', 'tulip'],
    category: 'Material',
    primaryEmoji: '🌸',
    emojis: ['🌸', '🌹', '🌻', '🌺', '🌿', '✨'],
    tags: ['#flower', '#fragrant', '#botany', '#nectar', '#delicate'],
    material: 'Floral Blossom',
    archetype: 'flower',
  },
  {
    keywords: ['fire', 'flame', 'ember', 'inferno', 'magma', 'lava', 'blaze', 'pyro', 'ignite', 'scorch'],
    category: 'Element',
    primaryEmoji: '🔥',
    emojis: ['🔥', '🌋', '💥', '⚡', '✨'],
    tags: ['#elemental', '#fire', '#thermal', '#combustion', '#heat'],
    material: 'Pure Plasma / Fire',
    archetype: 'fire',
  },
  {
    keywords: ['ice', 'frost', 'cryo', 'snow', 'glacier', 'freeze', 'chill', 'blizzard', 'permafrost'],
    category: 'Element',
    primaryEmoji: '❄️',
    emojis: ['❄️', '🧊', '💎', '💧', '✨'],
    tags: ['#elemental', '#cryogenic', '#ice', '#freezing', '#sub-zero'],
    material: 'Glacial Ice Crystal',
    archetype: 'ice',
  },
  {
    keywords: ['water', 'ocean', 'aqua', 'hydro', 'sea', 'liquid', 'fluid', 'rain', 'tide', 'wave'],
    category: 'Element',
    primaryEmoji: '💧',
    emojis: ['💧', '🌊', '💦', '🧪', '🐟'],
    tags: ['#elemental', '#fluid', '#aquatic', '#solvent', '#hydrate'],
    material: 'Purified Water',
    archetype: 'water',
  },
  {
    keywords: ['lightning', 'thunder', 'electric', 'shock', 'volt', 'spark', 'electro', 'amp'],
    category: 'Element',
    primaryEmoji: '⚡',
    emojis: ['⚡', '💡', '🔋', '💥', '⚛️'],
    tags: ['#elemental', '#electrical', '#high-voltage', '#spark', '#energy'],
    material: 'Electrified Arc Plasma',
    archetype: 'lightning',
  },
  {
    keywords: ['star', 'starlight', 'astral', 'celestial', 'comet', 'meteor', 'cosmic', 'nebula', 'solar', 'lunar'],
    category: 'Element',
    primaryEmoji: '⭐',
    emojis: ['⭐', '🌟', '✨', '🌌', '🌠', '💫'],
    tags: ['#celestial', '#cosmic', '#astral', '#radiant', '#stellar'],
    material: 'Starlight Essence',
    archetype: 'star',
  },
  {
    keywords: ['mushroom', 'fungus', 'toadstool', 'spore'],
    category: 'Material',
    primaryEmoji: '🍄',
    emojis: ['🍄', '🌿', '🌲', '🧪', '✨'],
    tags: ['#fungal', '#spores', '#alchemy', '#nature', '#ingredient'],
    material: 'Mycelium Cap',
    archetype: 'mushroom',
  },
  {
    keywords: ['fish', 'salmon', 'trout', 'tuna', 'seafood', 'marine'],
    category: 'Food',
    primaryEmoji: '🐟',
    emojis: ['🐟', '🍣', '🌊', '🎣', '🍤'],
    tags: ['#seafood', '#aquatic', '#protein', '#fresh-catch', '#culinary'],
    material: 'Fresh Marine Scale',
    archetype: 'fish',
  },
];

// ----------------------------------------------------------------------------
// Tool / Action Specific Rule Table
// ----------------------------------------------------------------------------
const TOOL_ACTION_RULES: Array<{
  keywords: string[];
  category: string;
  primaryEmoji: string;
  emojis: string[];
  tags: string[];
  archetype: ItemArchetype;
}> = [
  {
    keywords: ['smelt', 'melt', 'calcine', 'liquefy_metal'],
    category: 'metallurgy',
    primaryEmoji: '🔥',
    emojis: ['🔥', '🧱', '⚒️', '🌋', '⚡'],
    tags: ['#metallurgy', '#high-temp', '#refining', '#smelting'],
    archetype: 'anvil',
  },
  {
    keywords: ['forge', 'temper', 'quench', 'hammer', 'blacksmith'],
    category: 'metallurgy',
    primaryEmoji: '🔨',
    emojis: ['🔨', '⚒️', '🔥', '🛡️', '⚔️'],
    tags: ['#blacksmith', '#forging', '#hardening', '#shaping'],
    archetype: 'hammer',
  },
  {
    keywords: ['weld', 'solder', 'fuse', 'braze'],
    category: 'tech',
    primaryEmoji: '⚡',
    emojis: ['⚡', '🔥', '🔌', '⚙️', '🟫'],
    tags: ['#welding', '#bonding', '#high-temp', '#assembly'],
    archetype: 'wire',
  },
  {
    keywords: ['laser_cut', 'laser', 'cut', 'plasma_cut'],
    category: 'tech',
    primaryEmoji: '⚡',
    emojis: ['⚡', '📐', '✂️', '💻', '⚛️'],
    tags: ['#precision', '#laser-machining', '#clean-edge', '#subtractive'],
    archetype: 'blaster',
  },
  {
    keywords: ['program', 'code', 'compile', 'debug', 'flash_firmware'],
    category: 'tech',
    primaryEmoji: '💻',
    emojis: ['💻', '🟫', '⚙️', '🧠', '🔋'],
    tags: ['#firmware', '#logic', '#computing', '#algorithms'],
    archetype: 'chip',
  },
  {
    keywords: ['wire', 'connect', 'solder_circuit', 'route_cable'],
    category: 'tech',
    primaryEmoji: '🔌',
    emojis: ['🔌', '⚡', '💻', '🔋', '🧲'],
    tags: ['#electrical', '#harness', '#conductive', '#bus'],
    archetype: 'wire',
  },
  {
    keywords: ['calibrate', 'tune', 'align', 'synchronize'],
    category: 'tech',
    primaryEmoji: '⚙️',
    emojis: ['⚙️', '🧭', '🔬', '⌚', '✨'],
    tags: ['#calibration', '#precision', '#tolerance', '#tuning'],
    archetype: 'gear',
  },
  {
    keywords: ['distill', 'extract', 'purify', 'brew', 'alchemize'],
    category: 'alchemy',
    primaryEmoji: '🧪',
    emojis: ['🧪', '⚗️', '🫙', '💧', '✨'],
    tags: ['#alchemy', '#purification', '#extraction', '#potions'],
    archetype: 'potion',
  },
  {
    keywords: ['enchant', 'bless', 'empower', 'inscribe_rune', 'channel'],
    category: 'magic',
    primaryEmoji: '⭐',
    emojis: ['⭐', '✨', '🪄', '🔮', '📖'],
    tags: ['#enchantment', '#runes', '#arcane-infusion', '#magic'],
    archetype: 'wand',
  },
  {
    keywords: ['knead', 'bake', 'roast', 'fry', 'simmer', 'saute', 'garnish', 'shred', 'caramelize'],
    category: 'culinary',
    primaryEmoji: '🍳',
    emojis: ['🍳', '🍲', '🍰', '🍞', '🥩', '🧂'],
    tags: ['#culinary', '#gastronomy', '#flavor', '#prep'],
    archetype: 'food_bowl',
  },
  {
    keywords: ['carve', 'sand', 'plane', 'chisel'],
    category: 'crafting',
    primaryEmoji: '🪵',
    emojis: ['🪵', '🪓', '🪚', '📐', '✂️'],
    tags: ['#woodworking', '#sculpting', '#carpentry', '#handcraft'],
    archetype: 'wood',
  },
  {
    keywords: ['sew', 'stitch', 'weave', 'tailor', 'knit'],
    category: 'crafting',
    primaryEmoji: '🧵',
    emojis: ['🧵', '🪡', '✂️', '🦺', '🧶'],
    tags: ['#tailoring', '#textiles', '#garment', '#embroidery'],
    archetype: 'cloth',
  },
];

// ----------------------------------------------------------------------------
// Main Tagging & Analysis API
// ----------------------------------------------------------------------------

export function analyzeItem(
  name: string,
  options?: {
    category?: string;
    currentEmoji?: string;
    type?: 'ingredient' | 'tool' | 'finished_item';
  }
): ItemAnalysisResult {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanCategory = (options?.category || '').trim().toLowerCase();
  const cleanEmoji = (options?.currentEmoji || '').trim();
  const isTool = options?.type === 'tool';

  // 1. Tool-Specific Matching
  if (isTool) {
    for (const rule of TOOL_ACTION_RULES) {
      if (rule.keywords.some((kw) => cleanName.includes(kw))) {
        return {
          suggestedCategory: rule.category,
          primaryEmoji: cleanEmoji && cleanEmoji !== '⚡' ? cleanEmoji : rule.primaryEmoji,
          suggestedEmojis: Array.from(new Set([rule.primaryEmoji, ...rule.emojis])),
          suggestedTags: rule.tags,
          detectedArchetype: rule.archetype,
          themeColor: getItemColor({ name: cleanName, category: rule.category }),
          material: 'Specialized Tooling',
          raritySuggestion: 'Rare',
          confidence: 95,
        };
      }
    }
  }

  // 2. Taxonomy Rule Matching for Items & Ingredients
  for (const rule of TAXONOMY_RULES) {
    const matchedKeyword = rule.keywords.find((kw) => cleanName.includes(kw));
    if (matchedKeyword) {
      // Determine Rarity Modifier
      let raritySuggestion: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
      if (
        cleanName.includes('celestial') ||
        cleanName.includes('astral') ||
        cleanName.includes('phoenix') ||
        cleanName.includes('legendary') ||
        cleanName.includes('godly') ||
        cleanName.includes('singularity') ||
        cleanName.includes('quantum core')
      ) {
        raritySuggestion = 'Legendary';
      } else if (
        cleanName.includes('dragon') ||
        cleanName.includes('plasma') ||
        cleanName.includes('enchanted') ||
        cleanName.includes('master') ||
        cleanName.includes('dark matter') ||
        cleanName.includes('truffle') ||
        cleanName.includes('adamantine') ||
        cleanName.includes('epic')
      ) {
        raritySuggestion = 'Epic';
      } else if (
        cleanName.includes('refined') ||
        cleanName.includes('tempered') ||
        cleanName.includes('cybernetic') ||
        cleanName.includes('crystal') ||
        cleanName.includes('rare') ||
        cleanName.includes('infused') ||
        cleanName.includes('steel')
      ) {
        raritySuggestion = 'Rare';
      }

      const archetype = rule.archetype || detectArchetype(cleanName, rule.category, rule.primaryEmoji);

      return {
        suggestedCategory: rule.category,
        primaryEmoji: cleanEmoji && cleanEmoji !== '✨' && cleanEmoji !== '⚡' ? cleanEmoji : rule.primaryEmoji,
        suggestedEmojis: Array.from(new Set([rule.primaryEmoji, ...rule.emojis])),
        suggestedTags: [
          ...rule.tags,
          `#${raritySuggestion.toLowerCase()}`,
          `#${archetype}`,
        ],
        detectedArchetype: archetype,
        themeColor: getItemColor({ name: cleanName, category: rule.category, rarity: raritySuggestion }),
        material: rule.material,
        raritySuggestion,
        confidence: 90,
      };
    }
  }

  // 3. Fallback Heuristic Analysis
  const fallbackArchetype = detectArchetype(cleanName, cleanCategory, cleanEmoji);
  let fallbackCat = 'Custom';
  if (cleanCategory) fallbackCat = cleanCategory;
  else if (cleanName.includes('ore') || cleanName.includes('dust') || cleanName.includes('rock')) fallbackCat = 'Raw Material';
  else if (cleanName.includes('alloy') || cleanName.includes('ingot') || cleanName.includes('composite')) fallbackCat = 'Material';
  else if (cleanName.includes('core') || cleanName.includes('circuit') || cleanName.includes('mod')) fallbackCat = 'Tech';
  else if (cleanName.includes('soup') || cleanName.includes('pie') || cleanName.includes('broth')) fallbackCat = 'Food';
  else if (cleanName.includes('rune') || cleanName.includes('spell') || cleanName.includes('essence')) fallbackCat = 'Magic';

  const genericEmojis = ['✨', '📦', '🧩', '💎', '⚡', '🔥', '⚙️', '🧪'];
  const genericTags = [
    `#${fallbackCat.toLowerCase().replace(/\s+/g, '-')}`,
    `#${fallbackArchetype}`,
    '#custom-synthesis',
    '#crafted',
  ];

  return {
    suggestedCategory: fallbackCat,
    primaryEmoji: cleanEmoji || genericEmojis[0],
    suggestedEmojis: genericEmojis,
    suggestedTags: genericTags,
    detectedArchetype: fallbackArchetype,
    themeColor: getItemColor({ name: cleanName, category: fallbackCat }),
    material: 'Composite Substance',
    raritySuggestion: 'Common',
    confidence: 60,
  };
}
