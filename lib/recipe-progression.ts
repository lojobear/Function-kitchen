/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Recipe & Progression Engine
 *
 * Implements Requirement 3:
 * - Eliminates unrealistic jumps from raw goods to finished products.
 * - Introduces authentic multi-step intermediate transformations.
 * - Example:
 *     coffee beans
 *     -> roasted coffee beans
 *     -> ground coffee
 *     -> brewed espresso
 *     -> macchiato
 * - Each genuinely new intermediate item is treated as a discoverable item
 *   with its own canonical identity and asynchronous 64x64 sprite generation.
 */

import { ItemRarity } from './canonical-item';

export interface ProgressionStep {
  toolName: string;
  toolEmoji: string;
  inputs: string[];
  outputName: string;
  outputEmoji: string;
  category: string;
  rarity: ItemRarity;
  description: string;
  ingredientHistory: string[];
  processHistory: string[];
}

export interface ProgressionRecipe {
  goal: string;
  steps: ProgressionStep[];
}

// ----------------------------------------------------------------------------
// Authentic Multi-Step Progression Catalog
// ----------------------------------------------------------------------------

export const PROGRESSION_CHAINS: Record<string, ProgressionStep[]> = {
  // Coffee & Beverage Progression (11 Authentic Steps)
  macchiato: [
    {
      toolName: 'sift',
      toolEmoji: '🥣',
      inputs: ['coffee beans'],
      outputName: 'Sorted Green Arabica Beans',
      outputEmoji: '🫘',
      category: 'Food',
      rarity: 'Common',
      description: 'Hand-sorted high-altitude Arabica green coffee beans free of defects.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift'],
    },
    {
      toolName: 'roast',
      toolEmoji: '🍗',
      inputs: ['Sorted Green Arabica Beans'],
      outputName: 'First-Crack Medium Roast Beans',
      outputEmoji: '🫘',
      category: 'Food',
      rarity: 'Common',
      description: 'Beans roasted through first-crack developing toasted nutty notes.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift', 'roast'],
    },
    {
      toolName: 'roast',
      toolEmoji: '🔥',
      inputs: ['First-Crack Medium Roast Beans'],
      outputName: 'Dark Vienna Roast Beans',
      outputEmoji: '🫘',
      category: 'Food',
      rarity: 'Common',
      description: 'Deep mahogany roast beans glossy with aromatic essential oils.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift', 'roast'],
    },
    {
      toolName: 'grind',
      toolEmoji: '⚙️',
      inputs: ['Dark Vienna Roast Beans'],
      outputName: 'Coarse Ground Coffee Meal',
      outputEmoji: '🫙',
      category: 'Food',
      rarity: 'Common',
      description: 'Initial cracked beans broken down into uniform coarse granules.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift', 'roast', 'grind'],
    },
    {
      toolName: 'grind',
      toolEmoji: '⚙️',
      inputs: ['Coarse Ground Coffee Meal'],
      outputName: 'Micron Burr-Ground Espresso Powder',
      outputEmoji: '🫙',
      category: 'Food',
      rarity: 'Rare',
      description: 'Precision burr-ground velvety coffee flour optimized for 9-bar pressure.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift', 'roast', 'grind'],
    },
    {
      toolName: 'press',
      toolEmoji: '🎯',
      inputs: ['Micron Burr-Ground Espresso Powder'],
      outputName: 'Compressed Portafilter Puck',
      outputEmoji: '🟤',
      category: 'Food',
      rarity: 'Common',
      description: 'A 30-pound leveled tamped puck creating an impermeable bed for extraction.',
      ingredientHistory: ['coffee beans'],
      processHistory: ['sift', 'roast', 'grind', 'press'],
    },
    {
      toolName: 'brew',
      toolEmoji: '🫖',
      inputs: ['Compressed Portafilter Puck', 'water'],
      outputName: 'Pressurized Ristretto Extraction',
      outputEmoji: '☕',
      category: 'Food',
      rarity: 'Rare',
      description: 'Intense first-pull ristretto extraction dense with caramel body.',
      ingredientHistory: ['coffee beans', 'water'],
      processHistory: ['sift', 'roast', 'grind', 'press', 'brew'],
    },
    {
      toolName: 'brew',
      toolEmoji: '☕',
      inputs: ['Pressurized Ristretto Extraction'],
      outputName: 'Crema-Crowned Double Espresso Shot',
      outputEmoji: '☕',
      category: 'Food',
      rarity: 'Rare',
      description: 'A full double shot finished with a tiger-striped hazelnut crema crown.',
      ingredientHistory: ['coffee beans', 'water'],
      processHistory: ['sift', 'roast', 'grind', 'press', 'brew'],
    },
    {
      toolName: 'steam',
      toolEmoji: '🥟',
      inputs: ['milk'],
      outputName: 'Steamed Milk Foam',
      outputEmoji: '🥛',
      category: 'Food',
      rarity: 'Common',
      description: 'Velvety micro-aerated warm milk microfoam with delicate texture.',
      ingredientHistory: ['milk'],
      processHistory: ['steam'],
    },
    {
      toolName: 'assemble',
      toolEmoji: '🧩',
      inputs: ['Crema-Crowned Double Espresso Shot', 'Steamed Milk Foam'],
      outputName: 'Layered Macchiato Base',
      outputEmoji: '☕',
      category: 'Food',
      rarity: 'Rare',
      description: 'An artisan layered espresso stained by a dense cloud of velvety microfoam.',
      ingredientHistory: ['coffee beans', 'milk', 'water'],
      processHistory: ['sift', 'roast', 'grind', 'press', 'brew', 'steam', 'assemble'],
    },
    {
      toolName: 'garnish',
      toolEmoji: '🌿',
      inputs: ['Layered Macchiato Base', 'exotic spices'],
      outputName: 'Macchiato',
      outputEmoji: '☕',
      category: 'Food',
      rarity: 'Epic',
      description: 'A masterfully poured artisan macchiato dusted with cocoa and vanilla spice aromatics.',
      ingredientHistory: ['coffee beans', 'milk', 'water', 'exotic spices'],
      processHistory: ['sift', 'roast', 'grind', 'press', 'brew', 'steam', 'assemble', 'garnish'],
    },
  ],

  // Sword / Weapon Progression (11 Authentic Steps)
  'laser sword': [
    {
      toolName: 'extract',
      toolEmoji: '⛏️',
      inputs: ['iron ore', 'coal'],
      outputName: 'Raw Ferrous Ore Charge',
      outputEmoji: '🪨',
      category: 'Material',
      rarity: 'Common',
      description: 'Refined iron ore blended with coking coal flux for smelting.',
      ingredientHistory: ['iron ore', 'coal'],
      processHistory: ['extract'],
    },
    {
      toolName: 'smelt',
      toolEmoji: '🔥',
      inputs: ['Raw Ferrous Ore Charge'],
      outputName: 'Refined High-Carbon Steel Billet',
      outputEmoji: '🧱',
      category: 'Material',
      rarity: 'Common',
      description: 'A dense billet of smelted high-carbon steel purged of voids and impurities.',
      ingredientHistory: ['iron ore', 'coal'],
      processHistory: ['extract', 'smelt'],
    },
    {
      toolName: 'forge',
      toolEmoji: '🔨',
      inputs: ['Refined High-Carbon Steel Billet'],
      outputName: 'Folded Damascus Core Blank',
      outputEmoji: '🗡️',
      category: 'Weapon',
      rarity: 'Rare',
      description: 'Hammer-folded billet with concentric grain lines ready to channel energy.',
      ingredientHistory: ['iron ore', 'coal'],
      processHistory: ['extract', 'smelt', 'forge'],
    },
    {
      toolName: 'temper',
      toolEmoji: '❄️',
      inputs: ['Folded Damascus Core Blank'],
      outputName: 'Cryo-Tempered Blade Spine',
      outputEmoji: '🗡️',
      category: 'Weapon',
      rarity: 'Rare',
      description: 'A thermally shock-hardened structural spine capable of surviving plasma back-pressure.',
      ingredientHistory: ['iron ore', 'coal'],
      processHistory: ['extract', 'smelt', 'forge', 'temper'],
    },
    {
      toolName: 'laser_cut',
      toolEmoji: '⚡',
      inputs: ['silicon', 'copper wire'],
      outputName: 'Micro-Channeled Emitter Chassis',
      outputEmoji: '⚡',
      category: 'Tech',
      rarity: 'Rare',
      description: 'A precision-etched micro-lens array tuned to collimate plasma rays.',
      ingredientHistory: ['silicon', 'copper wire'],
      processHistory: ['laser_cut'],
    },
    {
      toolName: 'wire',
      toolEmoji: '🧶',
      inputs: ['Micro-Channeled Emitter Chassis', 'copper wire'],
      outputName: 'Superconducting Magnetic Conduits',
      outputEmoji: '🔋',
      category: 'Tech',
      rarity: 'Rare',
      description: 'Toroidal superconducting coil loops designed to stabilize plasma arches.',
      ingredientHistory: ['silicon', 'copper wire'],
      processHistory: ['laser_cut', 'wire'],
    },
    {
      toolName: 'carve',
      toolEmoji: '🪵',
      inputs: ['wood log'],
      outputName: 'Hand-Carved Hardwood Grip',
      outputEmoji: '🪵',
      category: 'Crafting',
      rarity: 'Common',
      description: 'An ergonomic hardwood hilt cored to nest internal capacitors.',
      ingredientHistory: ['wood log'],
      processHistory: ['carve'],
    },
    {
      toolName: 'stitch',
      toolEmoji: '🪡',
      inputs: ['Hand-Carved Hardwood Grip', 'leather strip'],
      outputName: 'Reinforced Leather Hilt Wrap',
      outputEmoji: '🪵',
      category: 'Crafting',
      rarity: 'Common',
      description: 'Cross-stitched leather bindings providing non-slip insulated purchase.',
      ingredientHistory: ['wood log', 'leather strip'],
      processHistory: ['carve', 'stitch'],
    },
    {
      toolName: 'extract',
      toolEmoji: '💎',
      inputs: ['crystal gem', 'starlight'],
      outputName: 'Resonant Kyber Focusing Crystal',
      outputEmoji: '💎',
      category: 'Magic',
      rarity: 'Epic',
      description: 'A harmonic harmonic crystal facet that focuses pure coherent plasma discharge.',
      ingredientHistory: ['crystal gem', 'starlight'],
      processHistory: ['extract'],
    },
    {
      toolName: 'assemble',
      toolEmoji: '🧩',
      inputs: ['Cryo-Tempered Blade Spine', 'Reinforced Leather Hilt Wrap', 'Superconducting Magnetic Conduits', 'plasma core'],
      outputName: 'Plasma Containment Core Assembly',
      outputEmoji: '⚔️',
      category: 'Weapon',
      rarity: 'Epic',
      description: 'The assembled chassis of the saber housing core matrix and emitter circuits.',
      ingredientHistory: ['iron ore', 'coal', 'plasma core', 'wood log', 'leather strip', 'silicon', 'copper wire'],
      processHistory: ['smelt', 'forge', 'laser_cut', 'wire', 'carve', 'stitch', 'assemble'],
    },
    {
      toolName: 'calibrate',
      toolEmoji: '🎯',
      inputs: ['Plasma Containment Core Assembly', 'Resonant Kyber Focusing Crystal'],
      outputName: 'Laser Sword',
      outputEmoji: '⚔️',
      category: 'Weapon',
      rarity: 'Legendary',
      description: 'A legendary humming energy blade producing a concentrated beam of focused plasma.',
      ingredientHistory: ['iron ore', 'coal', 'plasma core', 'crystal gem', 'starlight'],
      processHistory: ['smelt', 'forge', 'temper', 'laser_cut', 'wire', 'assemble', 'calibrate'],
    },
  ],

  // Alchemy Potion Progression
  'potion of invisibility': [
    {
      toolName: 'crush',
      toolEmoji: '🔨',
      inputs: ['mana crystal', 'quartz'],
      outputName: 'Purified Arcane Powder',
      outputEmoji: '💎',
      category: 'Magic',
      rarity: 'Common',
      description: 'Fine luminescent powder ground from resonant crystal facets.',
      ingredientHistory: ['mana crystal', 'quartz'],
      processHistory: ['crush'],
    },
    {
      toolName: 'distill',
      toolEmoji: '🫙',
      inputs: ['Purified Arcane Powder', 'water'],
      outputName: 'Concentrated Mana Distillate',
      outputEmoji: '🧪',
      category: 'Alchemy',
      rarity: 'Rare',
      description: 'A shimmering liquid solvent humming with concentrated arcane charge.',
      ingredientHistory: ['mana crystal', 'quartz', 'water'],
      processHistory: ['crush', 'distill'],
    },
    {
      toolName: 'extract',
      toolEmoji: '🧪',
      inputs: ['phoenix feather', 'starlight'],
      outputName: 'Radiant Spectral Essence',
      outputEmoji: '✨',
      category: 'Magic',
      rarity: 'Epic',
      description: 'A weightless iridescent essence that bends ambient illumination.',
      ingredientHistory: ['phoenix feather', 'starlight'],
      processHistory: ['extract'],
    },
    {
      toolName: 'brew',
      toolEmoji: '🫖',
      inputs: ['Concentrated Mana Distillate', 'Radiant Spectral Essence', 'herb leaf'],
      outputName: 'Ethereal Alchemy Compound',
      outputEmoji: '🫖',
      category: 'Alchemy',
      rarity: 'Rare',
      description: 'An uncapped shimmering reagent that actively refracts all surrounding light rays.',
      ingredientHistory: ['mana crystal', 'phoenix feather', 'starlight', 'herb leaf'],
      processHistory: ['crush', 'distill', 'extract', 'brew'],
    },
    {
      toolName: 'infuse',
      toolEmoji: '🍵',
      inputs: ['Ethereal Alchemy Compound', 'glass flask'],
      outputName: 'Potion of Invisibility',
      outputEmoji: '🧪',
      category: 'Alchemy',
      rarity: 'Rare',
      description: 'An ethereal translucent elixir that renders the imbiber completely imperceptible.',
      ingredientHistory: ['mana crystal', 'starlight', 'herb leaf', 'glass flask'],
      processHistory: ['crush', 'distill', 'extract', 'brew', 'infuse'],
    },
  ],

  // Cybernetic Tech Progression
  'cybernetic watch': [
    {
      toolName: 'laser_cut',
      toolEmoji: '⚡',
      inputs: ['silicon', 'copper wire'],
      outputName: 'High-Density Circuit Substrate',
      outputEmoji: '🟫',
      category: 'Tech',
      rarity: 'Common',
      description: 'A laser-etched silicon wafer laced with conductive copper tracing.',
      ingredientHistory: ['silicon', 'copper wire'],
      processHistory: ['laser_cut'],
    },
    {
      toolName: 'program',
      toolEmoji: '💻',
      inputs: ['microchip', 'circuit board'],
      outputName: 'Synaptic Micro-Controller Firmware',
      outputEmoji: '💻',
      category: 'Tech',
      rarity: 'Rare',
      description: 'A programmed BIOS chip executing real-time biometric and chronometric logic.',
      ingredientHistory: ['microchip', 'circuit board'],
      processHistory: ['program'],
    },
    {
      toolName: 'wire',
      toolEmoji: '🧶',
      inputs: ['High-Density Circuit Substrate', 'battery', 'fiber cable'],
      outputName: 'Powered Neural Power Unit',
      outputEmoji: '🔋',
      category: 'Tech',
      rarity: 'Rare',
      description: 'A compact rechargeable power cell with micro-harness circuitry.',
      ingredientHistory: ['silicon', 'copper wire', 'battery', 'fiber cable'],
      processHistory: ['laser_cut', 'wire'],
    },
    {
      toolName: 'forge',
      toolEmoji: '🔨',
      inputs: ['steel ingot', 'rubber'],
      outputName: 'Precision Chassis Housing',
      outputEmoji: '⚙️',
      category: 'Tech',
      rarity: 'Common',
      description: 'A water-resistant brushed steel watch case with shock-absorbing rubber gaskets.',
      ingredientHistory: ['steel ingot', 'rubber'],
      processHistory: ['forge'],
    },
    {
      toolName: 'assemble',
      toolEmoji: '🧩',
      inputs: ['Synaptic Micro-Controller Firmware', 'Powered Neural Power Unit', 'Precision Chassis Housing', 'optical lens'],
      outputName: 'Calibrated Prototype Matrix',
      outputEmoji: '🛰️',
      category: 'Tech',
      rarity: 'Rare',
      description: 'An integrated watch mechanism awaiting final chronometer synchronization.',
      ingredientHistory: ['silicon', 'microchip', 'battery', 'steel ingot', 'optical lens'],
      processHistory: ['program', 'wire', 'forge', 'assemble'],
    },
    {
      toolName: 'calibrate',
      toolEmoji: '🎯',
      inputs: ['Calibrated Prototype Matrix'],
      outputName: 'Cybernetic Watch',
      outputEmoji: '⌚',
      category: 'Tech',
      rarity: 'Rare',
      description: 'A sleek wrist-mounted wearable computer monitoring temporal coordinates.',
      ingredientHistory: ['silicon', 'microchip', 'battery', 'steel ingot'],
      processHistory: ['laser_cut', 'program', 'wire', 'assemble', 'calibrate'],
    },
  ],

  // Culinary Ramen Progression
  'tonkotsu ramen': [
    {
      toolName: 'knead',
      toolEmoji: '🍞',
      inputs: ['flour', 'water', 'eggs'],
      outputName: 'Artisan Wheat Noodle Dough',
      outputEmoji: '🍞',
      category: 'Food',
      rarity: 'Common',
      description: 'Elastic yellow wheat noodle dough infused with kansui alkaline mineral salts.',
      ingredientHistory: ['flour', 'water', 'eggs'],
      processHistory: ['knead'],
    },
    {
      toolName: 'cut',
      toolEmoji: '✂️',
      inputs: ['Artisan Wheat Noodle Dough'],
      outputName: 'Fresh Cut Ramen Noodles',
      outputEmoji: '🍜',
      category: 'Food',
      rarity: 'Common',
      description: 'Springy, thin hand-cut noodles dusted lightly in starch.',
      ingredientHistory: ['flour', 'water', 'eggs'],
      processHistory: ['knead', 'cut'],
    },
    {
      toolName: 'simmer',
      toolEmoji: '🍲',
      inputs: ['rich broth', 'exotic spices', 'tomatoes'],
      outputName: 'Concentrated Tonkotsu Broth',
      outputEmoji: '🍲',
      category: 'Food',
      rarity: 'Rare',
      description: 'A cloudy, deeply savory reduction broth extracted over gentle simmer.',
      ingredientHistory: ['rich broth', 'exotic spices', 'tomatoes'],
      processHistory: ['simmer'],
    },
    {
      toolName: 'shred',
      toolEmoji: '🧀',
      inputs: ['cheese', 'herb leaf'],
      outputName: 'Aromatic Herbal Garnish',
      outputEmoji: '🌿',
      category: 'Food',
      rarity: 'Common',
      description: 'Crisp green scallion curls, seasoned bamboo shoots, and fragrant herbs.',
      ingredientHistory: ['herb leaf'],
      processHistory: ['shred'],
    },
    {
      toolName: 'boil',
      toolEmoji: '🫧',
      inputs: ['Fresh Cut Ramen Noodles', 'Concentrated Tonkotsu Broth'],
      outputName: 'Simmering Noodle Base',
      outputEmoji: '🍜',
      category: 'Food',
      rarity: 'Common',
      description: 'Freshly cooked springy noodles submerged in velvety steaming soup broth.',
      ingredientHistory: ['flour', 'eggs', 'rich broth'],
      processHistory: ['knead', 'cut', 'simmer', 'boil'],
    },
    {
      toolName: 'garnish',
      toolEmoji: '🌿',
      inputs: ['Simmering Noodle Base', 'Aromatic Herbal Garnish'],
      outputName: 'Tonkotsu Ramen',
      outputEmoji: '🍜',
      category: 'Food',
      rarity: 'Common',
      description: 'A masterfully balanced steaming bowl of artisanal ramen noodles in rich pork bone broth.',
      ingredientHistory: ['flour', 'eggs', 'rich broth', 'herb leaf'],
      processHistory: ['knead', 'cut', 'simmer', 'boil', 'garnish'],
    },
  ],
};

/**
 * Find or generate a logical multi-step progression sequence for any requested target
 */
export function getProgressionSequence(targetGoal: string): ProgressionStep[] {
  const cleanGoal = targetGoal.toLowerCase().trim();

  // Check direct preset matches
  for (const [key, chain] of Object.entries(PROGRESSION_CHAINS)) {
    if (cleanGoal.includes(key) || key.includes(cleanGoal)) {
      return chain;
    }
  }

  // Coffee / Espresso / Latte / Cappuccino variants
  if (cleanGoal.includes('coffee') || cleanGoal.includes('espresso') || cleanGoal.includes('latte') || cleanGoal.includes('cappuccino') || cleanGoal.includes('mocha')) {
    return PROGRESSION_CHAINS.macchiato.map((step, idx, arr) => {
      if (idx === arr.length - 1) {
        return {
          ...step,
          outputName: targetGoal,
          description: `An artisan ${targetGoal} prepared from freshly roasted and ground beans.`,
        };
      }
      return step;
    });
  }

  // Pizza / Bread / Baking variants (Authentic 7-step formulation)
  if (cleanGoal.includes('pizza') || cleanGoal.includes('bread') || cleanGoal.includes('pastry') || cleanGoal.includes('cake')) {
    return [
      {
        toolName: 'sift',
        toolEmoji: '🥣',
        inputs: ['flour'],
        outputName: 'Fine Caputo Tipo 00 Flour',
        outputEmoji: '🌾',
        category: 'Food',
        rarity: 'Common',
        description: 'Superfine Italian wheat flour sifted to optimize gluten network elasticity.',
        ingredientHistory: ['flour'],
        processHistory: ['sift'],
      },
      {
        toolName: 'whisk',
        toolEmoji: '🥣',
        inputs: ['Fine Caputo Tipo 00 Flour', 'water'],
        outputName: 'Hydrated Starter Slurry',
        outputEmoji: '🥛',
        category: 'Food',
        rarity: 'Common',
        description: 'Active bubbly preferment suspension teeming with wild sourdough yeast.',
        ingredientHistory: ['flour', 'water'],
        processHistory: ['sift', 'whisk'],
      },
      {
        toolName: 'knead',
        toolEmoji: '🍞',
        inputs: ['Hydrated Starter Slurry', 'flour'],
        outputName: 'Artisan Raw Dough',
        outputEmoji: '🍞',
        category: 'Food',
        rarity: 'Common',
        description: 'Pliable, hydrated dough rested for optimal gluten development.',
        ingredientHistory: ['flour', 'water'],
        processHistory: ['sift', 'whisk', 'knead'],
      },
      {
        toolName: 'ferment',
        toolEmoji: '🧪',
        inputs: ['Artisan Raw Dough'],
        outputName: 'Slow-Fermented Neapolitan Dough',
        outputEmoji: '🍞',
        category: 'Food',
        rarity: 'Rare',
        description: 'Slow 48-hour cold-fermented dough with airy micro-bubbles and complex artisan yeast flavor.',
        ingredientHistory: ['flour', 'water'],
        processHistory: ['knead', 'ferment'],
      },
      {
        toolName: 'shape',
        toolEmoji: '🖐️',
        inputs: ['Slow-Fermented Neapolitan Dough'],
        outputName: 'Hand-Stretched Cornicione Base',
        outputEmoji: '🫓',
        category: 'Food',
        rarity: 'Rare',
        description: 'Hand-stretched dough disc preserving an airy puffed outer cornicione rim.',
        ingredientHistory: ['flour', 'water'],
        processHistory: ['knead', 'ferment', 'shape'],
      },
      {
        toolName: 'crush',
        toolEmoji: '🥫',
        inputs: ['tomatoes'],
        outputName: 'San Marzano Crushed Pulp',
        outputEmoji: '🥫',
        category: 'Food',
        rarity: 'Common',
        description: 'Hand-crushed volcanic sweet San Marzano tomatoes seasoned lightly with sea salt.',
        ingredientHistory: ['tomatoes'],
        processHistory: ['crush'],
      },
      {
        toolName: 'simmer',
        toolEmoji: '🍲',
        inputs: ['San Marzano Crushed Pulp', 'exotic spices'],
        outputName: 'Zesty Reduction Marinara',
        outputEmoji: '🥫',
        category: 'Food',
        rarity: 'Common',
        description: 'A slowly simmered crushed tomato sauce seasoned with savory herbs.',
        ingredientHistory: ['tomatoes', 'exotic spices'],
        processHistory: ['crush', 'simmer'],
      },
      {
        toolName: 'shred',
        toolEmoji: '🧀',
        inputs: ['cheese', 'herb leaf'],
        outputName: 'Grated Artisan Cheese Blend',
        outputEmoji: '🧀',
        category: 'Food',
        rarity: 'Common',
        description: 'Finely grated aged mozzarella and provolone blend ready for high-heat melting.',
        ingredientHistory: ['cheese', 'herb leaf'],
        processHistory: ['shred'],
      },
      {
        toolName: 'assemble',
        toolEmoji: '🧩',
        inputs: ['Hand-Stretched Cornicione Base', 'Zesty Reduction Marinara', 'Grated Artisan Cheese Blend'],
        outputName: 'Hearth-Ready Assembled Pizza',
        outputEmoji: '🍕',
        category: 'Food',
        rarity: 'Rare',
        description: 'Hand-stretched dough sauced and generously layered with cheese on a dusting of semolina.',
        ingredientHistory: ['flour', 'water', 'tomatoes', 'cheese'],
        processHistory: ['knead', 'ferment', 'shape', 'simmer', 'shred', 'assemble'],
      },
      {
        toolName: 'bake',
        toolEmoji: '🥯',
        inputs: ['Hearth-Ready Assembled Pizza'],
        outputName: 'Stone-Fired Crust Base',
        outputEmoji: '🍕',
        category: 'Food',
        rarity: 'Epic',
        description: 'A blistered leopard-spotted crust fresh from the 850-degree stone hearth.',
        ingredientHistory: ['flour', 'water', 'tomatoes', 'cheese'],
        processHistory: ['knead', 'ferment', 'simmer', 'assemble', 'bake'],
      },
      {
        toolName: 'garnish',
        toolEmoji: '🌿',
        inputs: ['Stone-Fired Crust Base', 'herb leaf'],
        outputName: targetGoal,
        outputEmoji: '🍕',
        category: 'Food',
        rarity: 'Legendary',
        description: `Gourmet stone-baked ${targetGoal} garnished with fresh basil, aromatic olive oil, and melted cheeses.`,
        ingredientHistory: ['flour', 'water', 'tomatoes', 'cheese', 'herb leaf'],
        processHistory: ['knead', 'ferment', 'simmer', 'assemble', 'bake', 'garnish'],
      },
    ];
  }

  // Comprehensive Multi-Stage Formulation: (11-step authentic progression strictly meeting the 10-15 stage standard)
  return [
    {
      toolName: 'extract',
      toolEmoji: '🧪',
      inputs: ['Raw Material'],
      outputName: `Refined ${targetGoal} Substrate`,
      outputEmoji: '🧱',
      category: 'Component',
      rarity: 'Common',
      description: `Purified elemental baseline material isolated specifically for formulating ${targetGoal}.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract'],
    },
    {
      toolName: 'sift',
      toolEmoji: '🥣',
      inputs: [`Refined ${targetGoal} Substrate`],
      outputName: `Granular ${targetGoal} Precursor`,
      outputEmoji: '🪨',
      category: 'Component',
      rarity: 'Common',
      description: `Micro-filtered particulate precursor calibrated for high-density thermodynamic bonding.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'sift'],
    },
    {
      toolName: 'smelt',
      toolEmoji: '🔥',
      inputs: [`Granular ${targetGoal} Precursor`],
      outputName: `Purified ${targetGoal} Billet`,
      outputEmoji: '🧱',
      category: 'Material',
      rarity: 'Common',
      description: `High-density metallurgical billet smelted free of slag and voids for ${targetGoal}.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'sift', 'smelt'],
    },
    {
      toolName: 'forge',
      toolEmoji: '🔨',
      inputs: [`Purified ${targetGoal} Billet`],
      outputName: `Forged ${targetGoal} Core Stock`,
      outputEmoji: '⚙️',
      category: 'Material',
      rarity: 'Rare',
      description: `Forged high-strength core matrix engineered to withstand extreme mechanical loads.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'forge'],
    },
    {
      toolName: 'laser_cut',
      toolEmoji: '⚡',
      inputs: [`Forged ${targetGoal} Core Stock`],
      outputName: `Machined ${targetGoal} Structural Member`,
      outputEmoji: '⚙️',
      category: 'Component',
      rarity: 'Rare',
      description: `Precision-machined primary structural chassis components with micron-level tolerances.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'forge', 'laser_cut'],
    },
    {
      toolName: 'wire',
      toolEmoji: '🧶',
      inputs: [`Machined ${targetGoal} Structural Member`],
      outputName: `Interconnected ${targetGoal} Conduits`,
      outputEmoji: '🔋',
      category: 'Tech',
      rarity: 'Rare',
      description: `Superconducting channels and high-bandwidth routing matrices laced through the chassis.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'laser_cut', 'wire'],
    },
    {
      toolName: 'solder',
      toolEmoji: '🪛',
      inputs: [`Interconnected ${targetGoal} Conduits`],
      outputName: `Integrated ${targetGoal} Circuit Board`,
      outputEmoji: '💻',
      category: 'Tech',
      rarity: 'Rare',
      description: `Surface-mounted logic gates and bus controllers managing sub-system coordination.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'wire', 'solder'],
    },
    {
      toolName: 'assemble',
      toolEmoji: '🧩',
      inputs: [`Integrated ${targetGoal} Circuit Board`],
      outputName: `Integrated ${targetGoal} Framework`,
      outputEmoji: '🧩',
      category: 'Crafting',
      rarity: 'Epic',
      description: `The unified structural framework housing all mechanical, energetic, and logic subsystems.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'laser_cut', 'wire', 'solder', 'assemble'],
    },
    {
      toolName: 'temper',
      toolEmoji: '🗡️',
      inputs: [`Integrated ${targetGoal} Framework`],
      outputName: `Hardened ${targetGoal} Assembly`,
      outputEmoji: '🛡️',
      category: 'Crafting',
      rarity: 'Epic',
      description: `Thermal-stabilized assembly heat-treated to eliminate internal stresses and micro-fractures.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'laser_cut', 'wire', 'assemble', 'temper'],
    },
    {
      toolName: 'calibrate',
      toolEmoji: '🎯',
      inputs: [`Hardened ${targetGoal} Assembly`],
      outputName: `Harmonized ${targetGoal} Core`,
      outputEmoji: '🛰️',
      category: 'Masterwork',
      rarity: 'Epic',
      description: `Fine-tuned dynamic components calibrated for optimal resonance and functional balance.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'laser_cut', 'wire', 'assemble', 'temper', 'calibrate'],
    },
    {
      toolName: 'polish',
      toolEmoji: '✨',
      inputs: [`Harmonized ${targetGoal} Core`],
      outputName: targetGoal,
      outputEmoji: '✨',
      category: 'Masterwork',
      rarity: 'Legendary',
      description: `The impeccably finished, fully synthesized masterpiece: ${targetGoal}.`,
      ingredientHistory: ['Raw Material'],
      processHistory: ['extract', 'smelt', 'laser_cut', 'wire', 'assemble', 'temper', 'calibrate', 'polish'],
    },
  ];
}

/**
 * Match an executed action and set of input ingredients against known logical progression steps
 */
export function matchProgressionStep(
  actionName: string,
  inputNames: string[]
): ProgressionStep | null {
  const normAction = (actionName || '').trim().toLowerCase();
  const normInputs = inputNames.map((n) => (n || '').trim().toLowerCase()).sort();

  for (const chain of Object.values(PROGRESSION_CHAINS)) {
    for (const step of chain) {
      if (step.toolName.toLowerCase() === normAction) {
        const stepInputs = step.inputs.map((n) => n.trim().toLowerCase()).sort();
        if (
          stepInputs.length === normInputs.length &&
          stepInputs.every((v, i) => normInputs[i].includes(v) || v.includes(normInputs[i]))
        ) {
          return step;
        }
      }
    }
  }

  return null;
}
