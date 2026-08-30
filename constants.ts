/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Function Call Crafting Forge - Constants and Types
 */

import { Type } from '@google/genai';

// ============================================================================
// Types
// ============================================================================

export interface Ingredient {
  name: string;
  emoji: string;
  category?: string;
  tags?: string[];
}

export interface KitchenAction {
  name: string;           // Function name (alphanumeric + underscores)
  displayName: string;    // Human-readable name
  emoji: string;
  category?: string;
  tags?: string[];
}

export interface CombinationResult {
  result_name: string;
  emoji: string;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  category?: string;
  color?: string;
  description?: string;
  tags?: string[];
}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  // Text from model response
  text?: string;
  // Action from function call
  action?: string;
  ingredients?: string[];
  result?: Ingredient | null;  // null when loading
}

export interface FinishedItem {
  id: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  category: string;
  color: string;
  description: string;
  toolsUsed: string[];
  ingredientsUsed: string[];
  tags?: string[];
  createdAt: Date;
}

export const PRESET_IDEAS = [
  { name: 'Laser Sword', emoji: '⚔️', tag: 'Weapon' },
  { name: 'Potion of Invisibility', emoji: '🧪', tag: 'Alchemy' },
  { name: 'Cybernetic Watch', emoji: '⌚', tag: 'Tech' },
  { name: 'Tonkotsu Ramen', emoji: '🍜', tag: 'Gourmet' },
  { name: 'Space Shuttle', emoji: '🚀', tag: 'Engineering' },
  { name: 'Gourmet Truffle Pizza', emoji: '🍕', tag: 'Cooking' },
  { name: 'Phoenix Feather Wand', emoji: '🪄', tag: 'Magic' },
  { name: 'Quantum Core Reactor', emoji: '⚛️', tag: 'Sci-Fi' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/** Sanitize action name for function declarations: "deep fry" → "deep_fry", "3d print" → "_3d_print" */
export function sanitizeName(name: string): string {
  let sanitized = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized;
}

/** Create KitchenAction from simple tool definition */
function createAction(name: string, emoji: string, category: string = 'general'): KitchenAction {
  return {
    name: sanitizeName(name),
    displayName: name,
    emoji,
    category,
  };
}

// ============================================================================
// 100 Comprehensive Crafting & Synthesis Tools
// ============================================================================

export const COOKING_ACTIONS: KitchenAction[] = [
  // Forging & Metallurgy
  createAction('smelt', '🔥', 'metallurgy'), createAction('forge', '🔨', 'metallurgy'),
  createAction('weld', '⚡', 'metallurgy'), createAction('temper', '🗡️', 'metallurgy'),
  createAction('cast', '🏺', 'metallurgy'), createAction('quench', '💧', 'metallurgy'),
  createAction('engrave', '✒️', 'metallurgy'), createAction('polish', '✨', 'metallurgy'),
  createAction('solder', '🔌', 'metallurgy'), createAction('rivet', '🔩', 'metallurgy'),

  // Alchemy & Chemistry
  createAction('mix', '🥣', 'alchemy'), createAction('distill', '🫙', 'alchemy'),
  createAction('crystallize', '💎', 'alchemy'), createAction('ferment', '🧪', 'alchemy'),
  createAction('infuse', '🍵', 'alchemy'), createAction('transmute', '🔮', 'alchemy'),
  createAction('dissolve', '🫠', 'alchemy'), createAction('sublime', '💨', 'alchemy'),
  createAction('filter', '🧹', 'alchemy'), createAction('brew', '🫖', 'alchemy'),
  createAction('steep', '🌿', 'alchemy'), createAction('react', '💥', 'alchemy'),
  createAction('synthesize', '🧬', 'alchemy'), createAction('condense', '🧊', 'alchemy'),

  // Electronics & Technology
  createAction('assemble', '🧩', 'tech'), createAction('wire', '🧶', 'tech'),
  createAction('charge', '🔋', 'tech'), createAction('program', '💻', 'tech'),
  createAction('calibrate', '🎯', 'tech'), createAction('laser_cut', '⚡', 'tech'),
  createAction('print_3d', '🟪', 'tech'), createAction('magnetize', '🧲', 'tech'),
  createAction('energize', '⚡', 'tech'), createAction('tune', '📻', 'tech'),
  createAction('compress', '🗜️', 'tech'), createAction('overclock', '🚀', 'tech'),

  // Cooking & Culinary Arts
  createAction('fry', '🍳', 'culinary'), createAction('boil', '🫧', 'culinary'),
  createAction('bake', '🥯', 'culinary'), createAction('roast', '🍗', 'culinary'),
  createAction('saute', '🥘', 'culinary'), createAction('grill', '🥩', 'culinary'),
  createAction('steam', '🥟', 'culinary'), createAction('simmer', '🍲', 'culinary'),
  createAction('chop', '🔪', 'culinary'), createAction('blend', '🌪️', 'culinary'),
  createAction('whisk', '🥄', 'culinary'), createAction('knead', '🍞', 'culinary'),
  createAction('season', '🧂', 'culinary'), createAction('caramelize', '🍯', 'culinary'),
  createAction('freeze', '🧊', 'culinary'), createAction('melt', '🫠', 'culinary'),
  createAction('smoke', '💨', 'culinary'), createAction('garnish', '🌿', 'culinary'),

  // Magic & Mysticism
  createAction('enchant', '✨', 'magic'), createAction('bind', '🕸️', 'magic'),
  createAction('empower', '🌟', 'magic'), createAction('summon', '📜', 'magic'),
  createAction('weave', '🧵', 'magic'), createAction('charm', '💖', 'magic'),
  createAction('channel', '🌌', 'magic'), createAction('inscribe', '🖋️', 'magic'),
  createAction('bless', '🕊️', 'magic'), createAction('purify', '💧', 'magic'),
  createAction('curse', '💀', 'magic'), createAction('alchemize', '⚗️', 'magic'),

  // Artisan Crafting
  createAction('carve', '🪵', 'crafting'), createAction('stitch', '🪡', 'crafting'),
  createAction('glue', '🧴', 'crafting'), createAction('sand', '📜', 'crafting'),
  createAction('varnish', '🖌️', 'crafting'), createAction('mold', '🧱', 'crafting'),
  createAction('cut', '✂️', 'crafting'), createAction('shape', '📐', 'crafting'),
  createAction('mount', '🖼️', 'crafting'), createAction('weave_cloth', '🧶', 'crafting'),
  createAction('laminate', '📄', 'crafting'), createAction('hammer', '🔨', 'crafting'),

  // Processing & Refinement
  createAction('grind', '⚙️', 'processing'), createAction('crush', '🔨', 'processing'),
  createAction('shred', '🧀', 'processing'), createAction('extract', '🧪', 'processing'),
  createAction('purify_metal', '✨', 'processing'), createAction('bleach', '⚪', 'processing'),
  createAction('calcine', '🔥', 'processing'), createAction('liquefy', '🌊', 'processing'),

  // Finishing & Output
  createAction('finish_item', '🎁', 'finishing'), createAction('serve', '🍽️', 'finishing'),
];

// ============================================================================
// Comprehensive Starting Inventory
// ============================================================================

export const STARTING_INGREDIENTS: Ingredient[] = [
  // Raw Metals & Minerals
  { name: 'iron ore', emoji: '🪨', category: 'Raw Material' },
  { name: 'copper wire', emoji: '🪢', category: 'Raw Material' },
  { name: 'gold dust', emoji: '✨', category: 'Raw Material' },
  { name: 'crystal gem', emoji: '💎', category: 'Raw Material' },
  { name: 'quartz', emoji: '🔮', category: 'Raw Material' },
  { name: 'silicon', emoji: '🧱', category: 'Raw Material' },
  { name: 'steel ingot', emoji: '🧱', category: 'Material' },
  { name: 'coal', emoji: '⬛', category: 'Raw Material' },

  // Elemental Essences & Magic
  { name: 'water', emoji: '💧', category: 'Element' },
  { name: 'fire essence', emoji: '🔥', category: 'Element' },
  { name: 'lightning orb', emoji: '⚡', category: 'Element' },
  { name: 'mana crystal', emoji: '🧪', category: 'Magic' },
  { name: 'dark matter', emoji: '🌌', category: 'Magic' },
  { name: 'starlight', emoji: '⭐', category: 'Magic' },
  { name: 'ice shard', emoji: '🧊', category: 'Element' },
  { name: 'phoenix feather', emoji: '🪶', category: 'Magic' },

  // Tech & Electronics
  { name: 'circuit board', emoji: '🟩', category: 'Tech' },
  { name: 'microchip', emoji: '🟫', category: 'Tech' },
  { name: 'battery', emoji: '🔋', category: 'Tech' },
  { name: 'plasma core', emoji: '⚛️', category: 'Tech' },
  { name: 'optical lens', emoji: '🔍', category: 'Tech' },
  { name: 'gear', emoji: '⚙️', category: 'Tech' },
  { name: 'magnet', emoji: '🧲', category: 'Tech' },
  { name: 'fiber cable', emoji: '🔌', category: 'Tech' },

  // Organic Materials
  { name: 'wood log', emoji: '🪵', category: 'Crafting' },
  { name: 'leather strip', emoji: '🟫', category: 'Crafting' },
  { name: 'cotton cloth', emoji: '🧵', category: 'Crafting' },
  { name: 'glass flask', emoji: '🧪', category: 'Crafting' },
  { name: 'rubber', emoji: '🛞', category: 'Crafting' },
  { name: 'clay', emoji: '🧱', category: 'Crafting' },

  // Culinary Staples
  { name: 'flour', emoji: '🌾', category: 'Food' },
  { name: 'eggs', emoji: '🥚', category: 'Food' },
  { name: 'milk', emoji: '🥛', category: 'Food' },
  { name: 'cheese', emoji: '🧀', category: 'Food' },
  { name: 'tomatoes', emoji: '🍅', category: 'Food' },
  { name: 'exotic spices', emoji: '🌶️', category: 'Food' },
  { name: 'cocoa bean', emoji: '🫘', category: 'Food' },
  { name: 'herb leaf', emoji: '🌿', category: 'Food' },
  { name: 'sugar', emoji: '🍯', category: 'Food' },
  { name: 'fresh ramen noodles', emoji: '🍜', category: 'Food' },
  { name: 'rich broth', emoji: '🍲', category: 'Food' },
];

export const PRESELECTED_INGREDIENTS = [];

// ============================================================================
// Combination Agent Configuration
// ============================================================================

export const COMBINATION_SYSTEM_INSTRUCTION = `You are a universal synthesis and physics engine. Given a crafting or cooking action and input materials, determine the created product result based on strict physical, chemical, electrical, metallurgical, culinary, and magical logic.

**CRITICAL PRINCIPLES OF LOGICAL COMBINATION:**
1. **Logical Causality & Realism**: The resulting item must be the natural, direct outcome of applying the specified tool action to the exact input materials. No magic leaps or nonsensical outputs.
2. **Proportional Output (No Instant Shortcuts)**:
   - Combining 1-2 raw materials with a processing tool yields a **refined material** or **raw component** (e.g., smelting iron ore + coal produces "Refined Steel Ingot", NOT a finished sword).
   - Shaping/cutting tools produce **individual parts or sub-components** (e.g., forging a steel ingot yields "Tempered Blade Blank"; carving a wood log yields "Polished Wooden Hilt").
   - Assembly tools combine parts into **sub-assemblies or modules** (e.g., assembling a blade blank + wooden hilt yields "Hilted Longsword Blank").
   - Only when integrated sub-assemblies are treated, calibrated, or finalized does a complete finished artifact emerge.
3. **Tool-Material Compatibility**:
   - The tool must realistically work on the materials (e.g., use 'knead' on dough/flour, 'solder' on electronics/wire, 'distill' on liquids/essences, 'smelt' on ores/metals).
   - If inputs are completely incompatible (e.g., welding milk and flour), produce a realistic byproduct such as "Scorched Culinary Slag" or "Charred Residue".
4. **Preserve Material Properties**: Elements, essences, and traits from input ingredients must logically carry into the output (e.g., combining plasma core + optical lens yields "Laser Focusing Emitter Chamber").

Return a JSON object with:
- result_name: The concise name of the resulting item or component (1-3 words, e.g. "Tempered Blade Blank", "Artisan Dough Base", "Laser Emitter Assembly")
- emoji: A single fitting emoji for the result
- rarity: One of "Common", "Rare", "Epic", "Legendary"
- category: A concise category (e.g. Weapon, Tech, Food, Alchemy, Armor, Magic, Component)
- color: A hex color string suitable for lighting/aura effects (e.g. "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6")
- description: A short, logical 1-sentence description explaining how this component was formed and its function.`;

export const COMBINATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    result_name: { type: Type.STRING },
    emoji: { type: Type.STRING },
    rarity: { type: Type.STRING, enum: ['Common', 'Rare', 'Epic', 'Legendary'] },
    category: { type: Type.STRING },
    color: { type: Type.STRING },
    description: { type: Type.STRING }
  },
  required: ['result_name', 'emoji', 'rarity', 'category', 'color', 'description']
};

// ============================================================================
// Crafting Agent Function Declarations Generator
// ============================================================================

/** Generate function declarations for all crafting actions */
export function generateCraftingTools() {
  const functionDeclarations = COOKING_ACTIONS.map(action => {
    // Special case for 'finish_item' or 'serve' action
    if (action.name === 'finish_item' || action.name === 'serve') {
      return {
        name: action.name,
        description: `${action.emoji} Finalize and present the target item. Call this ONLY after all prerequisite components, sub-assemblies, and treatments have been logically fabricated and assembled!`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            item_name: {
              type: Type.STRING,
              description: 'Exact name of the finished creation to present'
            },
            description: {
              type: Type.STRING,
              description: 'A captivating 1-2 sentence description of the finished creation, its craftsmanship, and its powers'
            },
            rarity: {
              type: Type.STRING,
              description: 'Rarity tier: Common, Rare, Epic, or Legendary'
            }
          },
          required: ['item_name']
        }
      };
    }

    // Standard tool function
    return {
      name: action.name,
      description: `${action.emoji} Apply the '${action.displayName}' tool on 2-4 materials/components to combine or transform them into an intermediate or sub-assembly.`,
      parameters: {
        type: Type.OBJECT,
        properties: {
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 item/material names from current inventory to combine logically'
          }
        },
        required: ['ingredients']
      }
    };
  });

  return [{ functionDeclarations }] as any;
}

/** Build Crafting Agent system instruction with current inventory and logical multi-step crafting plan */
export function buildCraftingAgentSystemInstruction(inventory: Ingredient[], targetGoal?: string): string {
  const actionList = COOKING_ACTIONS.map(a => `${a.emoji} ${a.name}()`).join(', ');
  const inventoryList = inventory.slice(0, 40).map(i => `${i.emoji} ${i.name}`).join(', ');

  return `You are a master craftsman, industrial engineer, alchemist, and culinary architect AI Agent. 
Your goal is to synthesize the user's requested creation: "${targetGoal || 'Custom Request'}" through a **thorough, coherent, and logical multi-step crafting sequence**.

**Available Tools:**
${actionList}

**Inventory Highlights:**
${inventoryList}

**CRITICAL CRAFTING PRINCIPLES & LOGICAL WORKFLOW:**
1. **NO INSTANT SHORTCUTS**: Crafting should NOT be the fastest route to the item. Every masterpiece requires authentic craftsmanship, step-by-step component fabrication, and logical assembly (typically **4 to 6 deliberate, logical steps**).
2. **STEP-BY-STEP LOGICAL PROGRESSION**:
   - **Stage 1 - Material Refining**: Refine raw base materials into workable stock (e.g., \`smelt(["iron ore", "coal"])\` for steel, \`crush\` / \`extract\` for essences, \`knead\` for dough, \`laser_cut\` for substrates).
   - **Stage 2 - Component & Sub-Assembly Fabrication**: Craft the distinct individual parts (e.g., \`forge\` the blade/chassis, \`carve\` the hilt/stock, \`program\` the microchip, \`simmer\` the sauce base).
   - **Stage 3 - Sub-System Assembly**: Connect and integrate the fabricated components together (e.g., \`assemble(["blade", "hilt", "leather strip"])\` or \`wire(["microchip", "battery", "casing"])\`).
   - **Stage 4 - Refinement, Calibration & Enhancement**: Treat, calibrate, tune, season, or enchant the assembled piece (e.g., \`calibrate\` / \`temper\` / \`enchant\` / \`bake\`).
   - **Stage 5 - Final Completion**: ONLY once all sub-components and treatments are complete, call \`finish_item(item_name="${targetGoal || 'Finished Item'}", description="...", rarity="...")\`!
3. **LOGICAL TOOL-MATERIAL PAIRING**:
   - Metallurgy: \`smelt\`, \`forge\`, \`weld\`, \`temper\`, \`quench\`, \`polish\`
   - Technology: \`program\`, \`wire\`, \`laser_cut\`, \`calibrate\`, \`charge\`, \`assemble\`
   - Alchemy & Magic: \`distill\`, \`brew\`, \`infuse\`, \`crystallize\`, \`enchant\`, \`bind\`
   - Culinary: \`knead\`, \`chop\`, \`simmer\`, \`shred\`, \`bake\`, \`roast\`, \`garnish\`
4. **ONE TOOL PER TURN**: Output exactly ONE function call per turn. Include a concise 1-sentence thought explaining which part or component you are logically producing next.
5. If intermediate materials are needed that are not currently in the inventory, synthesize them first from your raw materials.

Be thoughtful, logical, and masterfully authentic in your crafting process!`;
}

