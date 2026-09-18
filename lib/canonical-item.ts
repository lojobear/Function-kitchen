/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Canonical Item Identity & Visual Description Resolver
 *
 * Implements:
 * - Deterministic Canonical Item ID calculation from:
 *   [name, description, ingredient history, process history, rarity/type]
 * - Rich 8-point visual description synthesis required for Pollinations pixel-art generation.
 */

export type ItemRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface ItemResolutionInput {
  name: string;
  description?: string;
  ingredientHistory?: string[];
  processHistory?: string[];
  rarity?: ItemRarity | string;
  category?: string;
  emoji?: string;
}

export interface ResolvedItemIdentity {
  canonicalId: string;
  name: string;
  displayName: string;
  description: string;
  ingredientHistory: string[];
  processHistory: string[];
  rarity: ItemRarity;
  category: string;
  emoji: string;
  visualDescription: string;
}

/**
 * 64-bit deterministic hash combining two modified FNV-1a passes
 */
export function computeDeterministicHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x5a17e3f9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x01000193);
    h1 = (h1 << 5) | (h1 >>> 27);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

/**
 * Compute the canonical item ID deterministically from:
 * - item name
 * - item description
 * - ingredient history
 * - process history
 * - rarity/type
 */
export function computeCanonicalItemId(item: ItemResolutionInput): string {
  const normName = (item.name || '').trim().toLowerCase();
  const normDesc = (item.description || '').trim().toLowerCase();
  const normIngredients = (item.ingredientHistory || [])
    .map((i) => i.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('+');
  const normProcesses = (item.processHistory || [])
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join('->');
  const normRarity = (item.rarity || 'Common').trim().toLowerCase();
  const normCategory = (item.category || 'general').trim().toLowerCase();

  const signature = `name:${normName}|desc:${normDesc}|ing:${normIngredients}|proc:${normProcesses}|rarity:${normRarity}|cat:${normCategory}`;
  const hash = computeDeterministicHash(signature);
  const slug = normName.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'item';
  return `cid_${slug}_${hash.slice(0, 10)}`;
}

/**
 * Procedural synthesis of rich 8-point visual description:
 * 1. exact object type
 * 2. material
 * 3. shape
 * 4. key distinguishing features
 * 5. surface wear/texture
 * 6. relevant ingredients
 * 7. process-derived visual changes
 * 8. rarity cues if applicable
 */
export function generateDetailedVisualDescription(item: ItemResolutionInput): string {
  const nameLower = (item.name || '').trim().toLowerCase();
  const ingredients = (item.ingredientHistory || []).map((i) => i.toLowerCase().trim());
  const processes = (item.processHistory || []).map((p) => p.toLowerCase().trim());
  const rarity = (item.rarity || 'Common') as ItemRarity;
  const category = (item.category || '').toLowerCase();

  // Known item presets for high thematic fidelity
  if (nameLower.includes('roasted coffee beans') || nameLower === 'roasted coffee beans') {
    return 'exact object type: cluster of whole roasted coffee beans; material: deep glossy caramelized arabica bean surface with faint aromatic sheen; shape: rounded oval beans with characteristic curved center crevice; key distinguishing features: split ventral furrow with tiny roasted specks; surface wear/texture: dry, subtly oily roasted parchment skin; relevant ingredients: whole raw coffee beans; process-derived visual changes: rich espresso-brown coloration with delicate micro-fractures from high-heat roasting; rarity cues: balanced even artisanal roast';
  }

  if (nameLower.includes('ground coffee') || nameLower === 'ground coffee') {
    return 'exact object type: small mound of freshly ground espresso coffee; material: fine granular organic coffee grinds; shape: conical tapered heap of dark granular powder; key distinguishing features: visible textured particle flecks with deep chocolate tones; surface wear/texture: coarse yet uniform espresso-grade particle consistency; relevant ingredients: dark roasted coffee beans; process-derived visual changes: pulverized particle structure with aromatic oil sheen; rarity cues: perfectly uniform burr-grinder precision';
  }

  if (nameLower.includes('brewed espresso') || nameLower === 'brewed espresso') {
    return 'exact object type: glass demitasse shot glass of pulled espresso; material: thick clear tempered glass filled with dark liquid; shape: small tapered cylindrical espresso cup with tiny handle; key distinguishing features: two distinct layers with deep obsidian coffee base topped by thick hazelnut crema; surface wear/texture: smooth reflective glass exterior with velvety microfoam surface; relevant ingredients: pressurized water and finely ground dark coffee; process-derived visual changes: rich emulsified tiger-striped crema bubbles and rising heat steam; rarity cues: immaculate golden-amber crema crown';
  }

  if (nameLower.includes('macchiato') || nameLower === 'macchiato') {
    return 'exact object type: ceramic macchiato cup with layered espresso and milk foam; material: matte ceramic earthenware filled with hot brew; shape: compact wide-rimmed demitasse cup; key distinguishing features: creamy milk microfoam stained by a centered dark amber espresso droplet; surface wear/texture: velvety smooth milk froth with micro-bubbles and glazed pottery finish; relevant ingredients: brewed espresso and steamed whole milk; process-derived visual changes: dense layered contrast between dark espresso foundation and dollop of white foam; rarity cues: artisan barista presentation';
  }

  // Determine Object Type & Shape
  let objectType = 'crafted inventory artifact';
  let material = 'tempered artisan material';
  let shape = 'compact balanced silhouette';
  let keyFeatures = 'clear distinct outline with readable focal point';
  let surfaceTexture = 'clean handcrafted finish';
  let processDerived = 'subtle signs of refinement and functional craftsmanship';

  if (nameLower.includes('espresso shot') || nameLower.includes('espresso extraction') || nameLower.includes('demitasse')) {
    objectType = 'demitasse glass filled with dark espresso';
    material = 'thick clear glass with hot concentrated espresso';
    shape = 'small cylindrical espresso cup with handle and golden crema layer';
    keyFeatures = 'deep dark coffee body crowned with dense golden-hazelnut crema foam';
    surfaceTexture = 'glossy crema surface with glass reflections';
    processDerived = 'high-pressure hydraulic extraction with aromatic crema emulsification';
  } else if (nameLower.includes('pitcher') || nameLower.includes('steamed milk') || nameLower.includes('microfoam')) {
    objectType = 'stainless steel barista frothing pitcher';
    material = 'brushed 304 food-grade stainless steel with velvety steamed milk';
    shape = 'tapered metal pitcher with sharp pouring spout and sturdy handle';
    keyFeatures = 'silky white micro-aerated milk foam visible at rim';
    surfaceTexture = 'brushed satin metal with condensation droplets';
    processDerived = 'steam-wand aerated microfoam with fine uniform micro-bubbles';
  } else if (nameLower.includes('coffee bean') || nameLower.includes('roasted bean') || (nameLower.includes('bean') && !nameLower.includes('jelly'))) {
    objectType = 'whole roasted coffee beans cluster';
    material = 'dark roast artisan arabica coffee beans';
    shape = 'cluster of glossy oval beans each with characteristic center crease';
    keyFeatures = 'dark chocolate brown surface with aromatic roasting oils';
    surfaceTexture = 'smooth glossy sheen with delicate surface cracks';
    processDerived = 'slow drum-roasted to second crack with caramelization of essential oils';
  } else if (nameLower.includes('ground coffee') || nameLower.includes('flour') || nameLower.includes('powder') || nameLower.includes('puck')) {
    objectType = 'finely ground particulate powder';
    material = 'milled organic particles with consistent particle size';
    shape = 'tapered mound or compressed puck on work surface';
    keyFeatures = 'uniform micro-texture without clumps';
    surfaceTexture = 'velvety matte particulate surface';
    processDerived = 'burr-ground to calibrated micron sizing';
  } else if (nameLower.includes('dough') || nameLower.includes('slurry') || nameLower.includes('batter')) {
    objectType = 'hydrated raw artisan dough ball';
    material = 'pliable elastic flour and water dough';
    shape = 'supple rounded dough mass dusted with semolina flour';
    keyFeatures = 'smooth elastic surface tension with delicate expansion folds';
    surfaceTexture = 'soft dusted matte surface with supple tactile elasticity';
    processDerived = 'hand-kneaded to full gluten windowpane development';
  } else if (nameLower.includes('crust') || nameLower.includes('pizza base')) {
    objectType = 'stone-hearth fired crust base';
    material = 'leopard-spotted baked fermented grain crust';
    shape = 'circular disc with raised blistered outer cornicione rim';
    keyFeatures = 'charred micro-blisters and golden caramelization';
    surfaceTexture = 'crispy crackled cornicione with airy tender interior crumb';
    processDerived = 'baked on high-heat refractory stone with rapid oven spring';
  } else if (nameLower.includes('sauce') || nameLower.includes('marinara') || nameLower.includes('reduction')) {
    objectType = 'culinary reduction sauce in shallow ramekin';
    material = 'simmered rich tomato reduction with olive oil and herbs';
    shape = 'shallow white porcelain bowl filled with deep crimson sauce';
    keyFeatures = 'glossy red sheen speckled with green oregano and basil flecks';
    surfaceTexture = 'rich, velvety slow-cooked reduction sheen';
    processDerived = 'low-heat reduced and concentrated with aromatic garlic and herbs';
  } else if (nameLower.includes('grated') || nameLower.includes('shredded') || (nameLower.includes('cheese') && nameLower.includes('blend'))) {
    objectType = 'mound of freshly grated artisan cheese shreds';
    material = 'aged whole milk mozzarella and provolone shreds';
    shape = 'loose airy pyramid of distinct curled ribbons and shreds';
    keyFeatures = 'pale ivory and golden yellow ribbons dusted lightly to separate';
    surfaceTexture = 'soft creamy shreds with slight moisture sheen';
    processDerived = 'coarsely grated for uniform melt coverage';
  } else if (nameLower.includes('billet') || nameLower.includes('blade blank') || nameLower.includes('spine')) {
    objectType = 'metallurgical alloy billet blank';
    material = 'dense forged high-carbon steel alloy with temper bluing';
    shape = 'chamfered solid bar blank with straight spine and tang';
    keyFeatures = 'visible grain boundary crystal lines and maker hammer marks';
    surfaceTexture = 'brushed gunmetal with heat temper oxidation gradients';
    processDerived = 'hydraulic press forged and quenched in calibrated mineral oil';
  } else if (nameLower.includes('chassis') || nameLower.includes('framework') || nameLower.includes('housing')) {
    objectType = 'machined structural chassis framework';
    material = 'aerospace-grade anodized aluminum alloy';
    shape = 'skeletal geometric enclosure with structural cross-bracing';
    keyFeatures = 'drilled mounting points, wire routing bays, and beveled facets';
    surfaceTexture = 'matte bead-blasted anodized finish with laser-etched markings';
    processDerived = '5-axis CNC milled from a solid billet with high-precision tolerances';
  } else if (nameLower.includes('circuit') || nameLower.includes('pcb') || nameLower.includes('wafer')) {
    objectType = 'high-density etched circuit board';
    material = 'FR-4 substrate with gold-plated pads and copper traces';
    shape = 'rectangular electronics card with edge connectors';
    keyFeatures = 'intricate geometric circuit traces with soldered micro-controllers and green solder mask';
    surfaceTexture = 'semi-gloss solder mask with raised metallic trace topography';
    processDerived = 'photolithography etched and surface-mount soldered with lead-free alloy';
  } else if (nameLower.includes('sword') || nameLower.includes('blade') || nameLower.includes('saber')) {
    objectType = 'one-handed edged weapon';
    material = nameLower.includes('laser') ? 'energized plasma blade core with steel hilt' : 'folded forged Damascus steel and wrapped grip';
    shape = 'straight tapered blade with crossguard and pommel';
    keyFeatures = nameLower.includes('laser') ? 'glowing cyan plasma emitter with focusing crystal housing' : 'sharp central fuller with razor bevels';
    surfaceTexture = nameLower.includes('laser') ? 'pulsing energetic glow with metallic emitter housing' : 'mirror-polished steel with hammered fuller';
    processDerived = 'quenched and sharpened edge with calibrated energy conduction';
  } else if (nameLower.includes('potion') || nameLower.includes('elixir') || nameLower.includes('brew')) {
    objectType = 'alchemical glass phial';
    material = 'translucent blown crystal glass with cork stopper';
    shape = 'bulbous potion flask with narrow flared neck';
    keyFeatures = 'swirling luminescent liquid with tiny suspended glowing motes';
    surfaceTexture = 'smooth glass with internal magical refraction';
    processDerived = 'distilled purity with heat condensation rings on upper neck';
  } else if (nameLower.includes('watch') || nameLower.includes('device') || nameLower.includes('gadget')) {
    objectType = 'compact mechanical chronometer device';
    material = 'brushed gunmetal chassis with sapphire glass lens and copper traces';
    shape = 'octagonal wearable timepiece housing with tactile bezel';
    keyFeatures = 'holographic dial with glowing micro-indicators and visible gears';
    surfaceTexture = 'machined metallic bezel with micro-screws and fine knurling';
    processDerived = 'laser-etched circuits and micro-soldered terminals';
  } else if (nameLower.includes('ramen') || nameLower.includes('soup') || nameLower.includes('broth')) {
    objectType = 'deep artisan ceramic noodle bowl';
    material = 'glazed earthenware pottery filled with hot savory soup';
    shape = 'wide conical ceramic bowl with flat sturdy foot';
    keyFeatures = 'tangled wavy noodles swimming in golden glistening broth with sliced toppings';
    surfaceTexture = 'glossy ceramic with shimmering oily broth droplets';
    processDerived = 'simmered concentrated broth and hand-pulled boiled noodles';
  } else if (nameLower.includes('ingot') || nameLower.includes('billet') || nameLower.includes('bar')) {
    objectType = 'rectangular metallurgical metal ingot';
    material = 'dense cast refined metal alloy';
    shape = 'trapezoidal solid metal bar with beveled corners';
    keyFeatures = 'stamped smithing maker mark and cooling crystal grain pattern';
    surfaceTexture = 'brushed metallic sheen with slight hammer strikes';
    processDerived = 'smelted high-temperature purity with uniform grain boundary';
  } else if (nameLower.includes('bread') || nameLower.includes('dough') || nameLower.includes('pastry')) {
    objectType = 'artisan baked bread loaf';
    material = 'golden baked crusty grain dough';
    shape = 'plump oval batard with scored expansion ear';
    keyFeatures = 'rustic flour-dusted crust with dark caramel blister bubbles';
    surfaceTexture = 'crispy crackled exterior with tender airy crumb visible in slash';
    processDerived = 'fermented sourdough rise and hearth-baked crust blister';
  } else if (category === 'culinary' || category === 'food') {
    objectType = 'prepared culinary creation';
    material = 'savory organic food ingredients';
    shape = 'delicately plated gourmet portion';
    keyFeatures = 'vibrant contrasting food textures with fresh garnish';
    surfaceTexture = 'glossy glazed surface with aromatic appeal';
    processDerived = 'slowly simmered or roasted to appetizing perfection';
  } else if (category === 'alchemy' || category === 'magic') {
    objectType = 'mystical arcane relic';
    material = 'charged arcane catalyst and enchanted essence';
    shape = 'focused geometric focal artifact';
    keyFeatures = 'radiant core pulsating with elemental energy runes';
    surfaceTexture = 'crystalline facets with swirling inner light';
    processDerived = 'transmuted by ritual alchemy into an empowered state';
  } else if (category === 'tech' || category === 'engineering') {
    objectType = 'engineered technological module';
    material = 'silicon substrate, gold-plated contacts, and alloy casing';
    shape = 'modular rectangular electronics component';
    keyFeatures = 'integrated circuitry paths with luminous status LED';
    surfaceTexture = 'precision matte PCB with metallic solder pins';
    processDerived = 'laser-routed circuit architecture and high-precision firmware';
  }

  // Relevant ingredients clause
  const ingredientsDesc = ingredients.length > 0
    ? `derived from ${ingredients.slice(0, 3).join(', ')}`
    : 'derived from pure refined culinary and elemental components';

  // Process-derived modifications
  if (processes.length > 0) {
    processDerived = `${processDerived}; transformed through ${processes.join(' then ')}`;
  }

  // Rarity visual cues
  let rarityCue = 'clean solid craftsmanship with honest RPG inventory clarity';
  if (rarity === 'Rare') {
    rarityCue = 'rare artisan quality with subtle polished luster, vivid saturation, and sharp contrast';
  } else if (rarity === 'Epic') {
    rarityCue = 'epic masterwork with radiant magical aura, gilded accents, and intricate detailing';
  } else if (rarity === 'Legendary') {
    rarityCue = 'mythic legendary artifact with transcendent inner luminescence, opulent filigree, and shimmering specular highlights';
  }

  return `exact object type: ${objectType}; material: ${material}; shape: ${shape}; key distinguishing features: ${keyFeatures}; surface wear/texture: ${surfaceTexture}; relevant ingredients: ${ingredientsDesc}; process-derived visual changes: ${processDerived}; rarity cues: ${rarityCue}`;
}

/**
 * Fully resolve an item identity into a canonical entity with calculated ID
 * and rich visual description.
 */
export function resolveItemIdentity(input: ItemResolutionInput): ResolvedItemIdentity {
  const canonicalId = computeCanonicalItemId(input);
  const displayName = input.name.trim();
  const name = displayName.toLowerCase();
  const description = input.description?.trim() || `${displayName} discovered through craftsmanship.`;
  const ingredientHistory = (input.ingredientHistory || []).map((i) => i.trim());
  const processHistory = (input.processHistory || []).map((p) => p.trim());
  const rarity = (input.rarity || 'Common') as ItemRarity;
  const category = input.category || 'General';
  const emoji = input.emoji || '✨';
  const visualDescription = generateDetailedVisualDescription({
    ...input,
    name: displayName,
    description,
    ingredientHistory,
    processHistory,
    rarity,
    category,
    emoji,
  });

  return {
    canonicalId,
    name,
    displayName,
    description,
    ingredientHistory,
    processHistory,
    rarity,
    category,
    emoji,
    visualDescription,
  };
}
