/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 64x64 High-Definition Procedural Pixel Art Sprite Engine
 * Renders crisp 64x64 pixel art matrices with a rich limited palette,
 * dedicated tool archetypes, and authentic item representations.
 */

import { ItemArchetype, SpritePRNG, hashString } from './sprite-engine';

export type PixelMatrix64 = number[][];

/**
 * Creates an empty 64x64 grid initialized to 0 (transparent)
 */
export function createEmptyGrid64(): PixelMatrix64 {
  const grid: PixelMatrix64 = new Array(64);
  for (let y = 0; y < 64; y++) {
    grid[y] = new Array(64).fill(0);
  }
  return grid;
}

/**
 * Set pixel with bounds check (0 <= x < 64, 0 <= y < 64)
 */
export function setP64(g: PixelMatrix64, x: number, y: number, val: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix >= 0 && ix < 64 && iy >= 0 && iy < 64) {
    g[iy][ix] = val;
  }
}

/**
 * Horizontal line fill
 */
export function fillHLine64(g: PixelMatrix64, x0: number, x1: number, y: number, val: number) {
  const start = Math.max(0, Math.min(x0, x1));
  const end = Math.min(63, Math.max(x0, x1));
  const iy = Math.floor(y);
  if (iy < 0 || iy >= 64) return;
  for (let x = start; x <= end; x++) {
    g[iy][x] = val;
  }
}

/**
 * Filled rectangle
 */
export function fillRect64(g: PixelMatrix64, x: number, y: number, w: number, h: number, val: number) {
  for (let dy = 0; dy < h; dy++) {
    fillHLine64(g, x, x + w - 1, y + dy, val);
  }
}

/**
 * Filled circle
 */
export function fillCircle64(g: PixelMatrix64, cx: number, cy: number, r: number, val: number) {
  const ir = Math.ceil(r);
  for (let dy = -ir; dy <= ir; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= 64) continue;
    const dxMax = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    fillHLine64(g, cx - dxMax, cx + dxMax, y, val);
  }
}

/**
 * Circle ring outline
 */
export function drawCircleRing64(g: PixelMatrix64, cx: number, cy: number, r: number, val: number, thickness: number = 1) {
  const rIn = Math.max(0, r - thickness);
  const rOut = r;
  const ir = Math.ceil(rOut);
  for (let dy = -ir; dy <= ir; dy++) {
    for (let dx = -ir; dx <= ir; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= rOut * rOut && d2 >= rIn * rIn) {
        setP64(g, cx + dx, cy + dy, val);
      }
    }
  }
}

/**
 * Bresenham Line
 */
export function drawLine64(g: PixelMatrix64, x0: number, y0: number, x1: number, y1: number, val: number) {
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;
  while (true) {
    setP64(g, cx, cy, val);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

/**
 * Add crisp 1-pixel dark contour outlines (value 1) around all drawn pixels
 */
export function addAutomaticOutlines64(g: PixelMatrix64) {
  const copy = g.map(row => [...row]);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (copy[y][x] === 0) {
        let hasNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < 64 && nx >= 0 && nx < 64) {
              if (copy[ny][nx] > 0 && copy[ny][nx] !== 1) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor) break;
        }
        if (hasNeighbor) {
          g[y][x] = 1;
        }
      }
    }
  }
}

function getSemanticAccent64(itemName: string, itemCategory: string, hash: number): number {
  const identity = `${itemName} ${itemCategory}`.toLowerCase();
  if (/fire|flame|ember|magma|solar|hot/.test(identity)) return 10;
  if (/ice|frost|water|ocean|aqua|cryo/.test(identity)) return 14;
  if (/nature|leaf|herb|moss|wood|plant|bio/.test(identity)) return 12;
  if (/magic|arcane|mana|void|shadow|enchanted/.test(identity)) return 13;
  if (/electric|lightning|energy|plasma|power|cyber|quantum/.test(identity)) return 18;
  if (/royal|gold|sun|legend|divine/.test(identity)) return 11;
  if (/blood|ruby|crimson|red/.test(identity)) return 9;
  if (/coffee|espresso|cocoa|wood|leather|earth/.test(identity)) return 23;
  return [9, 10, 11, 12, 13, 14, 18, 19, 22, 23][hash % 10];
}

/**
 * Adds name-seeded material marks without distorting the handcrafted
 * archetype. Two swords remain readable as swords, but no longer share every
 * highlight, inlay, spark, rune, or surface band.
 */
function applyArtisanDetailPass64(
  g: PixelMatrix64,
  rng: SpritePRNG,
  hash: number,
  itemName: string,
  itemCategory: string,
  archetype: ItemArchetype
) {
  let minX = 63;
  let minY = 63;
  let maxX = 0;
  let maxY = 0;
  let occupied = 0;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (g[y][x] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      occupied += 1;
    }
  }
  if (occupied === 0) return;

  const accent = getSemanticAccent64(itemName, itemCategory, hash);
  const detailTarget = archetype.startsWith('tool_') ? 22 : 16;
  let details = 0;

  // A restrained diagonal material inlay creates a coherent surface pattern
  // instead of random noise. Its spacing and phase come from the full name.
  const bandGap = 6 + (hash % 4);
  const bandPhase = (hash >>> 5) % bandGap;
  let bandPixels = 0;
  for (let y = minY + 2; y <= maxY - 2 && bandPixels < 42; y++) {
    for (let x = minX + 2; x <= maxX - 2 && bandPixels < 42; x++) {
      const isInterior = g[y][x] > 1
        && g[y][x - 1] > 0
        && g[y][x + 1] > 0
        && g[y - 1][x] > 0
        && g[y + 1][x] > 0;
      if (!isInterior) continue;
      if ((x + y + bandPhase) % bandGap !== 0) continue;
      if (((x * 3 + y + hash) & 3) !== 0) continue;
      g[y][x] = accent;
      bandPixels += 1;
    }
  }

  for (let attempt = 0; attempt < detailTarget * 14 && details < detailTarget; attempt++) {
    const x = rng.int(Math.max(1, minX + 1), Math.min(62, maxX - 1));
    const y = rng.int(Math.max(1, minY + 1), Math.min(62, maxY - 1));
    const isInterior = g[y][x] > 1
      && g[y][x - 1] > 0
      && g[y][x + 1] > 0
      && g[y - 1][x] > 0
      && g[y + 1][x] > 0;
    if (!isInterior) continue;

    g[y][x] = details % 5 === 0 ? 5 : accent;
    if (details % 4 === 0 && x + 1 < maxX && g[y][x + 1] > 1) {
      g[y][x + 1] = accent;
    }
    details += 1;
  }

  // Small process particles make action tiles feel active and are positioned
  // from the full process name, rather than copied from a shared badge.
  if (archetype.startsWith('tool_')) {
    const particleCount = 3 + (hash % 4);
    for (let i = 0; i < particleCount; i++) {
      const side = rng.bool() ? -1 : 1;
      const x = side < 0
        ? Math.max(3, minX - rng.int(3, 8))
        : Math.min(60, maxX + rng.int(3, 8));
      const y = Math.max(3, Math.min(60, minY + rng.int(0, Math.max(2, maxY - minY))));
      setP64(g, x, y, accent);
      if (i === 0) setP64(g, x + (side < 0 ? -1 : 1), y - 1, 5);
    }
  }
}

/**
 * Generate high-definition 64x64 pixel art matrix for any archetype
 */
export function generateArchetypePixelMatrix64(
  archetype: ItemArchetype,
  hash: number,
  itemName: string = '',
  itemCategory: string = ''
): PixelMatrix64 {
  const g = createEmptyGrid64();
  const rng = new SpritePRNG(hash ^ hashString(itemName + itemCategory));
  const n = itemName.toLowerCase().trim();

  switch (archetype) {
    // ========================================================================
    // CRAFTING TOOLS & PROCESSES (Accurate, Dedicated 64x64 Sprites)
    // ========================================================================

    case 'tool_smelt': {
      // Refractory Crucible pouring incandescent molten metal into an Ingot Mold
      // 1. Tongs & Crucible
      fillCircle64(g, 24, 20, 11, 6); // Dark graphite crucible outer
      fillCircle64(g, 24, 18, 9, 7); // Inner bevel
      fillCircle64(g, 24, 18, 7, 10); // Molten magma core
      fillCircle64(g, 24, 18, 4, 18); // Bright incandescent yellow center
      fillCircle64(g, 23, 17, 2, 5); // Pure white core heat

      // Tongs holding the crucible
      drawLine64(g, 8, 14, 18, 18, 7);
      drawLine64(g, 7, 13, 17, 17, 8);
      drawLine64(g, 8, 26, 18, 22, 7);

      // 2. Pouring stream of molten metal
      for (let y = 24; y <= 45; y++) {
        const streamX = 26 + Math.floor(Math.sin((y - 24) * 0.15) * 2);
        const w = y > 38 ? 3 : 2;
        fillHLine64(g, streamX - w, streamX + w, y, 10); // Orange flame
        fillHLine64(g, streamX - 1, streamX + 1, y, 18); // Electric yellow
        setP64(g, streamX, y, 5); // White hot center
      }

      // 3. Ingot Mold receiving the pour
      fillRect64(g, 18, 46, 28, 10, 6); // Cast iron mold exterior
      fillRect64(g, 21, 48, 22, 6, 10); // Molten pool in mold
      fillRect64(g, 24, 49, 16, 4, 18); // Glowing hot metal
      fillHLine64(g, 26, 38, 50, 5); // White heat reflection

      // 4. Flying smelting spark particles
      const sparks = [[32, 22], [35, 27], [22, 33], [37, 36], [16, 42], [44, 44], [48, 48]];
      for (const [sx, sy] of sparks) {
        setP64(g, sx, sy, 18);
        setP64(g, sx + 1, sy, 5);
      }
      break;
    }

    case 'tool_forge': {
      // Blacksmith's Heavy Anvil on Oak Stump with glowing struck metal billet & hammer
      // 1. Oak wooden stump base
      fillRect64(g, 16, 44, 32, 14, 15); // Rich wood brown
      for (let y = 44; y <= 57; y++) {
        setP64(g, 22, y, 23); // Wood bark grooves
        setP64(g, 36, y, 23);
      }

      // 2. Heavy Steel Anvil
      fillRect64(g, 18, 32, 28, 12, 6); // Waist & base of anvil
      fillRect64(g, 12, 26, 40, 8, 7); // Anvil top face & horn
      // Horn extending left
      for (let x = 6; x <= 12; x++) {
        const h = Math.floor((x - 5) * 0.8);
        fillHLine64(g, x, x, 30 - h, 8);
      }
      // Top polished face
      fillHLine64(g, 14, 50, 26, 8);

      // 3. Orange-hot metal blank on anvil face
      fillRect64(g, 24, 23, 14, 4, 10);
      fillRect64(g, 26, 24, 10, 2, 18);
      fillHLine64(g, 28, 33, 24, 5);

      // 4. Cross-peen hammer angled down in mid-strike
      drawLine64(g, 34, 19, 54, 8, 15); // Wooden handle
      drawLine64(g, 35, 20, 55, 9, 15);
      fillRect64(g, 31, 15, 8, 6, 7); // Steel hammer head
      fillHLine64(g, 31, 38, 15, 8); // Polished edge

      // 5. Impact Sparks flying everywhere
      const sparks = [[22, 18], [28, 14], [40, 16], [42, 21], [18, 22], [46, 25]];
      for (const [sx, sy] of sparks) {
        setP64(g, sx, sy, 18);
        setP64(g, sx, sy - 1, 5);
      }
      break;
    }

    case 'tool_weld': {
      // Arc Welding Torch firing electric plasma arc onto metal plates
      // 1. Two steel workpieces being joined
      fillRect64(g, 8, 40, 22, 14, 6);
      fillRect64(g, 34, 40, 22, 14, 6);
      fillHLine64(g, 8, 29, 40, 8);
      fillHLine64(g, 34, 55, 40, 8);

      // 2. Weld seam bead in the middle
      for (let y = 40; y <= 53; y += 2) {
        fillCircle64(g, 31, y, 2.5, 14); // Electric cyan weld puddle
        fillCircle64(g, 31, y, 1.5, 18); // Hot amber rim
        setP64(g, 31, y, 5);
      }

      // 3. Welding torch nozzle coming from top right
      drawLine64(g, 36, 32, 54, 14, 7); // Torch neck
      drawLine64(g, 37, 33, 55, 15, 6);
      fillRect64(g, 33, 30, 6, 6, 11); // Brass nozzle tip

      // 4. Brilliant electric arc flare (cyan + white corona)
      fillCircle64(g, 31, 37, 6, 14);
      fillCircle64(g, 31, 37, 4, 18);
      fillCircle64(g, 31, 37, 2, 5);

      // 5. Welding spark shower
      const sparks = [[24, 30], [20, 36], [26, 44], [38, 34], [42, 38], [44, 46], [30, 26]];
      for (const [sx, sy] of sparks) {
        setP64(g, sx, sy, 14);
        setP64(g, sx, sy + 1, 5);
      }
      break;
    }

    case 'tool_knead': {
      // Wooden pastry board with floured dough ball & rolling pin
      // 1. Wooden prep board
      fillRect64(g, 10, 26, 44, 28, 15);
      fillRect64(g, 12, 28, 40, 24, 11);
      // Flour dusting on board
      for (let x = 14; x <= 50; x += 3) {
        for (let y = 30; y <= 50; y += 4) {
          setP64(g, x, y, 16);
        }
      }

      // 2. Soft, pliable dough ball with palm indentation
      fillCircle64(g, 30, 40, 11, 16); // Floured dough cream
      fillCircle64(g, 32, 41, 9, 11); // Golden dough midtone
      fillCircle64(g, 30, 38, 5, 16); // Palm press indentation
      setP64(g, 28, 36, 4);

      // 3. Wooden rolling pin placed across top
      drawLine64(g, 18, 18, 48, 24, 15); // Main roller cylinder
      drawLine64(g, 18, 19, 48, 25, 11);
      drawLine64(g, 18, 20, 48, 26, 15);
      // Handles
      drawLine64(g, 12, 17, 17, 18, 6);
      drawLine64(g, 49, 24, 54, 25, 6);
      break;
    }

    case 'tool_bake': {
      // Stone hearth oven with glowing embers and golden baked goods inside
      // 1. Stone brick oven arch
      fillRect64(g, 12, 14, 40, 40, 7); // Stone facade
      fillCircle64(g, 32, 30, 16, 6); // Arched oven cavity
      fillRect64(g, 16, 30, 32, 18, 6);

      // 2. Hearth embers and fire under oven floor
      fillRect64(g, 18, 42, 28, 6, 9); // Red firebox
      fillHLine64(g, 20, 44, 44, 10);
      fillHLine64(g, 24, 40, 43, 18);

      // 3. Golden baking bread loaf on baking stone inside
      fillCircle64(g, 32, 35, 8, 23); // Baked crust
      fillCircle64(g, 32, 34, 6, 11); // Golden crust
      fillHLine64(g, 29, 35, 33, 16); // Flour scored slash

      // 4. Brick texture lines
      drawLine64(g, 14, 22, 20, 22, 6);
      drawLine64(g, 44, 22, 50, 22, 6);
      drawLine64(g, 14, 38, 18, 38, 6);
      drawLine64(g, 46, 38, 50, 38, 6);
      break;
    }

    case 'tool_roast': {
      // Sizzling Roasting Pan with Herb Glazed Roast & Caramelized Aromatics
      // 1. Cast iron roasting pan
      fillRect64(g, 12, 32, 40, 18, 6);
      fillHLine64(g, 10, 53, 32, 7); // Rim

      // 2. Roasted browned joint
      fillCircle64(g, 32, 36, 12, 23); // Charred outer
      fillCircle64(g, 32, 35, 10, 15); // Rich meat glaze
      fillCircle64(g, 30, 33, 6, 10); // Amber caramelized top
      fillHLine64(g, 26, 36, 33, 11);

      // 3. Herb sprigs & garlic cloves
      fillCircle64(g, 22, 42, 2, 12); // Green rosemary
      fillCircle64(g, 42, 42, 2, 12);
      fillCircle64(g, 26, 44, 2, 16); // Garlic clove
      fillCircle64(g, 38, 44, 2, 16);

      // 4. Waving steam wisps
      drawLine64(g, 26, 26, 28, 18, 14);
      drawLine64(g, 34, 25, 32, 16, 5);
      drawLine64(g, 40, 26, 42, 19, 14);
      break;
    }

    case 'tool_fry': {
      // Skillet with sizzling golden cutlet & bubbles
      // 1. Skillet pan
      fillCircle64(g, 28, 34, 16, 6);
      fillCircle64(g, 28, 34, 14, 7);
      fillCircle64(g, 28, 34, 12, 10); // Hot shimmering oil
      // Pan handle
      drawLine64(g, 42, 42, 56, 52, 6);
      drawLine64(g, 43, 41, 57, 51, 7);

      // 2. Golden crisp cutlet
      fillCircle64(g, 28, 34, 8, 11);
      fillCircle64(g, 27, 33, 6, 18);
      setP64(g, 26, 32, 5);

      // 3. Sizzling bubbles
      const bubbles = [[22, 28], [34, 28], [20, 38], [36, 38], [28, 24], [30, 44]];
      for (const [bx, by] of bubbles) {
        setP64(g, bx, by, 5);
      }
      break;
    }

    case 'tool_distill': {
      // Alembic retort condenser coil & drip vial
      // 1. Boiling flask
      fillCircle64(g, 20, 38, 11, 14); // Glass
      fillCircle64(g, 20, 40, 9, 13); // Bubbling arcane liquid
      fillCircle64(g, 19, 39, 4, 14);

      // 2. Condenser coil tube
      drawLine64(g, 20, 27, 24, 18, 14);
      drawLine64(g, 24, 18, 42, 22, 11); // Copper condenser coil
      drawLine64(g, 42, 22, 44, 32, 11);

      // 3. Receiving vial below
      fillRect64(g, 40, 40, 8, 14, 14);
      fillRect64(g, 41, 44, 6, 8, 12); // Purified distillate
      // Dripping crystal drop
      setP64(g, 44, 35, 5);
      setP64(g, 44, 37, 14);
      break;
    }

    case 'tool_program': {
      // Cyberpunk CRT Terminal with glowing code & central processor die
      // 1. Terminal monitor bezel
      fillRect64(g, 12, 12, 40, 32, 6);
      fillRect64(g, 15, 15, 34, 26, 20); // Dark screen

      // 2. Glowing green/cyan code syntax lines
      for (let y = 18; y <= 36; y += 3) {
        const len = 12 + ((hash * y) % 16);
        fillHLine64(g, 18, 18 + len, y, 12);
        setP64(g, 18, y, 14); // Cyan command prompt
      }
      // Blinking cursor
      fillRect64(g, 38, 36, 3, 2, 18);

      // 3. Microchip socket below
      fillRect64(g, 24, 46, 16, 12, 6);
      fillRect64(g, 27, 48, 10, 8, 11); // Gold silicon die
      setP64(g, 31, 51, 5); // Core specular
      // Pin connectors
      for (let x = 25; x <= 38; x += 2) {
        setP64(g, x, 45, 8);
        setP64(g, x, 58, 8);
      }
      break;
    }

    case 'tool_laser_cut': {
      // Industrial CNC Laser cutting head piercing metal plate
      // 1. Metal plate being cut
      fillRect64(g, 10, 44, 44, 12, 7);
      fillHLine64(g, 10, 53, 44, 8);

      // 2. Laser head nozzle above
      fillRect64(g, 26, 12, 12, 14, 6);
      fillRect64(g, 29, 26, 6, 8, 7); // Brass focus nozzle

      // 3. High-energy laser beam
      drawLine64(g, 32, 34, 32, 44, 9); // Red beam
      drawLine64(g, 31, 34, 31, 44, 18); // Yellow energy
      drawLine64(g, 32, 34, 32, 44, 5); // White hot core

      // 4. Molten kerf cut & spark explosion
      fillCircle64(g, 32, 44, 5, 18);
      fillCircle64(g, 32, 44, 2, 5);
      const sparks = [[24, 38], [22, 46], [40, 39], [42, 48], [32, 52]];
      for (const [sx, sy] of sparks) {
        setP64(g, sx, sy, 10);
        setP64(g, sx, sy - 1, 5);
      }
      break;
    }

    case 'tool_assemble': {
      // Articulated robotic arm precision-mounting a micro-assembly
      // 1. Multi-axis robotic arm segments
      drawLine64(g, 14, 14, 28, 28, 7);
      drawLine64(g, 15, 14, 29, 28, 8);
      fillCircle64(g, 28, 28, 4, 6); // Joint servo
      drawLine64(g, 28, 28, 38, 40, 7);
      fillCircle64(g, 38, 40, 3, 6); // Wrist joint

      // 2. Precision mechanical gripper
      drawLine64(g, 38, 40, 34, 46, 8); // Left claw
      drawLine64(g, 38, 40, 42, 46, 8); // Right claw

      // 3. Module being inserted into frame
      fillRect64(g, 34, 45, 8, 8, 14); // Cyan module
      fillRect64(g, 36, 47, 4, 4, 18); // Gold core
      // Chassis socket beneath
      fillRect64(g, 26, 52, 24, 8, 6);
      fillRect64(g, 32, 52, 12, 3, 20); // Receiver slot
      break;
    }

    case 'tool_calibrate': {
      // Precision Dial Test Gauge with indicator needle & optical reticle
      // 1. Dial Gauge outer casing
      fillCircle64(g, 32, 30, 18, 6);
      fillCircle64(g, 32, 30, 16, 8);
      fillCircle64(g, 32, 30, 14, 20); // Dark dial face

      // 2. Calibrated tick marks around dial
      drawCircleRing64(g, 32, 30, 12, 7, 1);
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const tx = 32 + Math.cos(rad) * 11;
        const ty = 30 + Math.sin(rad) * 11;
        setP64(g, tx, ty, 14);
      }

      // 3. High-precision pointer needle
      drawLine64(g, 32, 30, 40, 22, 9); // Red indicator needle
      fillCircle64(g, 32, 30, 3, 8); // Center hub pin
      setP64(g, 32, 30, 5);

      // 4. Calibration probe stem at bottom
      fillRect64(g, 30, 48, 4, 12, 7);
      fillCircle64(g, 32, 60, 2, 8); // Ruby/carbide contact ball
      break;
    }

    case 'tool_enchant': {
      // Floating Arcane Grimoire surrounded by glowing runic circles
      // 1. Hovering spellbook
      fillRect64(g, 20, 26, 24, 16, 15); // Leather binding
      fillRect64(g, 22, 24, 20, 16, 16); // Open parchment pages
      drawLine64(g, 32, 24, 32, 40, 15); // Spine center
      // Page text runes
      drawLine64(g, 24, 28, 30, 28, 13);
      drawLine64(g, 24, 32, 29, 32, 13);
      drawLine64(g, 34, 28, 40, 28, 13);
      drawLine64(g, 34, 32, 39, 32, 13);

      // 2. Orbiting concentric magic runic ring
      drawCircleRing64(g, 32, 32, 24, 13, 1);
      drawCircleRing64(g, 32, 32, 18, 14, 1);

      // 3. Mystic floating stardust motes
      const motes = [[14, 18], [50, 18], [12, 44], [52, 44], [32, 10], [32, 54]];
      for (const [mx, my] of motes) {
        setP64(g, mx, my, 18);
        setP64(g, mx, my - 1, 5);
      }
      break;
    }

    case 'tool_carve': {
      // Woodworking chisel shaping an artisanal hardwood piece
      // 1. Hardwood block being sculpted
      fillRect64(g, 14, 30, 36, 24, 15);
      for (let y = 30; y <= 53; y += 4) {
        fillHLine64(g, 16, 48, y, 23); // Wood grain lines
      }

      // 2. Chisel tool shaving wood
      drawLine64(g, 24, 12, 34, 32, 11); // Wooden chisel handle
      drawLine64(g, 25, 13, 35, 33, 15);
      fillRect64(g, 33, 30, 6, 6, 8); // Polished beveled steel blade

      // 3. Curled wood shavings peeling off
      drawCircleRing64(g, 42, 28, 4, 11, 1);
      drawCircleRing64(g, 46, 34, 3, 11, 1);
      break;
    }

    case 'tool_stitch': {
      // Tailor's steel needle threading fabric seam
      // 1. Layered fabric swatches
      fillRect64(g, 10, 30, 44, 24, 12); // Forest green fabric
      fillRect64(g, 10, 30, 24, 24, 13); // Indigo cloth

      // 2. Dotted seam stitches
      for (let y = 32; y <= 52; y += 4) {
        drawLine64(g, 22, y, 24, y + 2, 16);
      }

      // 3. Steel embroidery needle
      drawLine64(g, 20, 22, 38, 38, 8); // Needle shank
      drawLine64(g, 21, 22, 39, 38, 5);
      setP64(g, 20, 22, 1); // Eye of needle

      // 4. Thread trail coming from needle eye
      drawLine64(g, 16, 14, 20, 22, 10);
      drawLine64(g, 26, 12, 16, 14, 10);
      break;
    }

    case 'tool_grind': {
      // Granite Pestle and Mortar with crushed herbs & powder
      // 1. Granite mortar bowl
      fillCircle64(g, 32, 40, 18, 6);
      fillCircle64(g, 32, 38, 16, 7);
      fillCircle64(g, 32, 36, 13, 20); // Interior hollow

      // 2. Crushed vibrant herbal powder in mortar
      fillCircle64(g, 32, 40, 9, 12);
      fillCircle64(g, 31, 41, 6, 18);

      // 3. Heavy stone pestle grinding
      drawLine64(g, 24, 18, 34, 38, 7);
      drawLine64(g, 25, 18, 35, 38, 8);
      fillCircle64(g, 34, 38, 5, 6); // Grinding head

      // 4. Airborne fine powder particles
      const dust = [[26, 30], [38, 28], [24, 34], [40, 34]];
      for (const [dx, dy] of dust) {
        setP64(g, dx, dy, 18);
      }
      break;
    }

    case 'tool_finish': {
      // Ornate silver banquet cloche platter with golden ribbon & sparkles
      // 1. Silver serving platter tray
      fillRect64(g, 10, 48, 44, 6, 7);
      fillHLine64(g, 8, 55, 48, 8); // Platter rim

      // 2. Domed polished cloche cover
      fillCircle64(g, 32, 48, 18, 7);
      fillRect64(g, 14, 48, 36, 2, 7);
      // Specular highlight across dome
      fillCircle64(g, 28, 42, 6, 5);

      // 3. Handle ring on top of cloche
      drawCircleRing64(g, 32, 28, 4, 11, 2); // Golden ring handle

      // 4. Celebration sparkles
      const sparkles = [[14, 24], [50, 24], [22, 18], [42, 18], [32, 14]];
      for (const [sx, sy] of sparkles) {
        setP64(g, sx, sy, 11);
        setP64(g, sx, sy - 1, 5);
      }
      break;
    }

    // ========================================================================
    // BESPOKE ITEM ARCHETYPES (High Fidelity 64x64 Detail)
    // ========================================================================

    case 'car': {
      // Sleek aerodynamic sports car / Tesla Roadster
      // 1. Aerodynamic roofline & windshield
      // Glass cabin
      for (let y = 20; y <= 31; y++) {
        const wLeft = 24 - Math.floor((31 - y) * 0.8);
        const wRight = 38 + Math.floor((31 - y) * 0.4);
        fillHLine64(g, wLeft, wRight, y, 20); // Dark tinted canopy
        setP64(g, wLeft + 2, y, 14); // Cyan glass reflection
      }

      // 2. Sculpted Supercar Body
      // Nose down to rear decklid
      for (let y = 30; y <= 43; y++) {
        fillHLine64(g, 10, 56, y, 3); // Primary paint body
        fillHLine64(g, 12, 54, y, 4); // Specular highlight shoulder
      }
      // Low nose splitter
      fillRect64(g, 50, 41, 7, 3, 6); // Front carbon splitter
      // Rear aerodynamic spoiler
      fillRect64(g, 8, 28, 6, 4, 6);
      drawLine64(g, 8, 32, 11, 34, 6);

      // 3. Aggressive LED Headlights & Taillights
      fillRect64(g, 53, 35, 3, 3, 5); // Crisp LED white headlight
      setP64(g, 56, 36, 14);
      fillRect64(g, 8, 34, 4, 2, 9); // Red neon taillight bar

      // 4. Alloy 5-Spoke Wheels with Rubber Tires & Red Calipers
      // Rear Wheel at (19, 43), Front Wheel at (46, 43)
      for (const cx of [19, 46]) {
        fillCircle64(g, cx, 43, 7, 1); // Rubber tire outer
        fillCircle64(g, cx, 43, 5, 8); // Alloy silver rim
        fillCircle64(g, cx, 43, 3, 9); // Red brake caliper
        fillCircle64(g, cx, 43, 1, 5); // Center hub cap
      }

      // 5. Ground shadow
      fillRect64(g, 12, 49, 44, 3, 17);
      break;
    }

    case 'spaghetti': {
      // Ceramic rimmed pasta bowl with twisted pasta, rich tomato sauce, meatballs & basil
      // 1. Ceramic pasta bowl
      fillCircle64(g, 32, 38, 22, 7); // Bowl outer
      fillCircle64(g, 32, 37, 20, 8); // Polished porcelain
      fillCircle64(g, 32, 36, 17, 20); // Inner bowl hollow

      // 2. Golden Spaghetti pasta swirl loops
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        const dist = 6 + (angle % 9);
        const px = 32 + Math.cos(rad) * dist;
        const py = 35 + Math.sin(rad) * (dist * 0.7);
        fillCircle64(g, px, py, 2.5, 16); // Cream pasta
        setP64(g, px, py, 11); // Amber pasta shadow
      }

      // 3. Rich Red Marinara / Pomodoro Sauce
      fillCircle64(g, 32, 35, 10, 21); // Tomato red
      fillCircle64(g, 33, 34, 7, 9); // Crimson highlights

      // 4. Three Seared Savory Meatballs
      const meatballs = [[26, 32], [38, 33], [32, 40]];
      for (const [mx, my] of meatballs) {
        fillCircle64(g, mx, my, 4.5, 23); // Roasted dark brown
        fillCircle64(g, mx, my - 1, 3.5, 15); // Savory meat
        setP64(g, mx - 1, my - 1, 4); // Specular highlight
      }

      // 5. Fresh Green Basil Leaf garnish
      fillCircle64(g, 32, 30, 3, 12);
      setP64(g, 32, 30, 22);
      setP64(g, 33, 29, 5); // Basil highlight

      // 6. Steam wisps rising
      drawLine64(g, 26, 22, 28, 14, 5);
      drawLine64(g, 34, 20, 32, 12, 14);
      drawLine64(g, 40, 22, 42, 15, 5);
      break;
    }

    case 'pizza': {
      // Triangular Gourmet Pizza Slice with bubbly mozzarella, toasted crust, pepperoni & truffles
      // 1. Crust arch on top-left
      for (let y = 14; y <= 24; y++) {
        const x = 16 + Math.floor((24 - y) * 0.6);
        fillCircle64(g, x, y, 5, 23); // Crispy charred crust
        fillCircle64(g, x + 1, y, 4, 11); // Golden crust
      }

      // 2. Triangular Slice Body pointing to (48, 48)
      for (let y = 18; y <= 48; y++) {
        const progress = (y - 18) / 30;
        const xLeft = 20 + Math.floor(progress * 26);
        const xRight = 24 + Math.floor(progress * 24);
        fillHLine64(g, xLeft - 6, xRight + 6, y, 21); // Tomato sauce bed
        fillHLine64(g, xLeft - 4, xRight + 4, y, 16); // Melted Mozzarella
      }

      // 3. Pepperoni slices with dark edges
      const pepperonis = [[26, 26], [34, 32], [42, 40]];
      for (const [px, py] of pepperonis) {
        fillCircle64(g, px, py, 4, 21); // Sauce rim
        fillCircle64(g, px, py, 3, 9); // Pepperoni red
        setP64(g, px, py, 23); // Spice fleck
      }

      // 4. Black truffle shavings & herb flakes
      setP64(g, 24, 34, 1); setP64(g, 25, 34, 6);
      setP64(g, 36, 26, 1); setP64(g, 37, 26, 6);
      setP64(g, 38, 44, 12); // Oregano herb

      // 5. Gooey cheese pull string at the tip
      drawLine64(g, 48, 48, 54, 54, 16);
      setP64(g, 53, 53, 11);
      break;
    }

    case 'hot_sauce': {
      // Classic glass condiment bottle with label, fiery red sauce & splash drop
      // 1. Screw Cap
      fillRect64(g, 28, 8, 8, 6, 8);
      fillHLine64(g, 28, 35, 8, 5);

      // 2. Narrow Glass Neck
      fillRect64(g, 29, 14, 6, 10, 14); // Glass
      fillRect64(g, 30, 16, 4, 8, 9); // Sauce in neck

      // 3. Cylindrical Bottle Body
      fillRect64(g, 20, 24, 24, 32, 14); // Glass walls
      fillRect64(g, 22, 25, 20, 30, 9); // Crimson hot sauce
      fillRect64(g, 23, 27, 18, 26, 21); // Rich cayenne red

      // Glass specular reflection highlight down left edge
      drawLine64(g, 22, 26, 22, 52, 5);

      // 4. White Brand Label with Red Flame Crest
      fillRect64(g, 24, 32, 16, 16, 16); // Label paper
      fillCircle64(g, 32, 39, 4, 9); // Flame crest
      setP64(g, 32, 38, 10);
      setP64(g, 32, 37, 18);

      // 5. Falling spicy hot sauce droplet
      fillCircle64(g, 48, 46, 2.5, 9);
      setP64(g, 48, 45, 5);
      break;
    }

    case 'gelato': {
      // Cross-hatched waffle cone with swirling scoops of gelato, lemon wedge & mint
      // 1. Crisp Waffle Cone
      for (let y = 32; y <= 58; y++) {
        const w = Math.max(0, Math.floor((58 - y) * 0.55));
        fillHLine64(g, 32 - w, 32 + w, y, 11); // Golden waffle
        for (let x = 32 - w; x <= 32 + w; x++) {
          if ((x + y) % 3 === 0) setP64(g, x, y, 23); // Cross-hatch brown
        }
      }

      // 2. Three Swirled Gelato Scoops
      // Bottom left scoop (Cream/Pistachio)
      fillCircle64(g, 25, 27, 8, 16);
      fillCircle64(g, 24, 26, 6, 4);
      // Bottom right scoop (Berry/Citrus)
      fillCircle64(g, 39, 27, 8, 10);
      fillCircle64(g, 38, 26, 6, 18);
      // Top crown scoop (Lemon Gelato)
      fillCircle64(g, 32, 18, 9, 18); // Lemon yellow
      fillCircle64(g, 31, 16, 7, 5); // Cream white peak

      // 3. Translucent Lemon Slice garnish on rim
      drawCircleRing64(g, 42, 14, 5, 11, 1); // Lemon rind
      fillCircle64(g, 42, 14, 4, 18); // Yellow pulp
      setP64(g, 42, 14, 5);

      // 4. Fresh Green Mint Sprig
      fillCircle64(g, 22, 16, 3, 12);
      setP64(g, 22, 15, 22);
      break;
    }

    case 'glove': {
      // Official UFC Fight Glove: segmented padded knuckle strike bar, thumb loop & wrist wrap
      // 1. Padded Knuckle Strike Bar (Curved Impact Zone)
      fillRect64(g, 18, 14, 28, 18, 3); // High-density foam leather
      fillRect64(g, 20, 16, 24, 14, 4); // Specular highlight
      // Segmented finger channels across knuckles
      for (const fx of [24, 30, 36]) {
        drawLine64(g, fx, 14, fx, 26, 1);
      }
      // Open finger loop cutouts at top
      for (const fx of [21, 27, 33, 39]) {
        fillCircle64(g, fx, 14, 2, 6);
      }

      // 2. Ergonomic Thumb Guard on left
      fillCircle64(g, 16, 26, 5, 3);
      fillCircle64(g, 16, 26, 3, 4);

      // 3. Wide Hook-and-Loop Wrist Wrap
      fillRect64(g, 18, 34, 28, 18, 6); // Heavy black wrist collar
      fillRect64(g, 22, 38, 20, 10, 8); // Contrast logo patch
      fillCircle64(g, 32, 43, 3, 11); // Gold championship logo emblem
      setP64(g, 32, 43, 5);

      // 4. Reinforced Seam Stitching
      fillHLine64(g, 20, 44, 33, 8);
      fillHLine64(g, 20, 44, 50, 8);
      break;
    }

    case 'potion': {
      // Ornate Alchemical Potion Flask with wooden stopper & swirling luminous liquid
      // 1. Wooden Cork Stopper
      fillRect64(g, 28, 10, 8, 8, 15);
      fillHLine64(g, 28, 35, 10, 11);

      // 2. Flask Neck & Rim
      fillRect64(g, 27, 18, 10, 8, 14); // Glass neck
      drawCircleRing64(g, 32, 18, 6, 8, 1); // Glass lip

      // 3. Spherical Flask Body
      fillCircle64(g, 32, 40, 18, 14); // Glass shell
      fillCircle64(g, 32, 40, 16, 20); // Dark hollow
      // Swirling Luminous Liquid (70% full)
      fillCircle64(g, 32, 43, 14, 3); // Potion color
      fillCircle64(g, 32, 42, 10, 4); // Specular sheen
      fillCircle64(g, 32, 41, 6, 18); // Magic core

      // Glass specular reflection arc on upper left
      drawCircleRing64(g, 28, 36, 10, 5, 2);

      // 4. Rising effervescent magic bubbles
      const bubbles = [[28, 46], [36, 44], [32, 36], [30, 30]];
      for (const [bx, by] of bubbles) {
        setP64(g, bx, by, 5);
      }
      break;
    }

    case 'sword': {
      // Diagonal Heroic Blade with detailed crossguard, gem & wrapped hilt
      // Blade running from (48, 14) down to (28, 34)
      for (let i = 0; i <= 24; i++) {
        const bx = 48 - i;
        const by = 14 + i;
        fillCircle64(g, bx, by, 2.5, 8); // Polished steel
        setP64(g, bx, by, 5); // Fuller core reflection
        setP64(g, bx + 1, by - 1, 4); // Energy glow
      }

      // Detailed Crossguard at (24, 38)
      drawLine64(g, 18, 32, 30, 44, 11); // Golden crossguard
      drawLine64(g, 19, 31, 31, 43, 18);
      fillCircle64(g, 24, 38, 3, 9); // Embedded ruby gem
      setP64(g, 24, 38, 5);

      // Leather-wrapped Grip & Pommel
      drawLine64(g, 22, 40, 14, 48, 15);
      drawLine64(g, 23, 41, 15, 49, 23);
      fillCircle64(g, 12, 50, 3, 11); // Golden pommel ring
      break;
    }

    case 'dagger': {
      // Tactical / Alchemical curved dagger
      for (let i = 0; i <= 16; i++) {
        const bx = 42 - i;
        const by = 18 + i;
        fillCircle64(g, bx, by, 2, 8);
        setP64(g, bx, by, 5);
      }
      drawLine64(g, 22, 38, 28, 32, 11); // Guard
      drawLine64(g, 22, 38, 16, 44, 15); // Handle
      fillCircle64(g, 15, 45, 2, 11);
      break;
    }

    case 'axe': {
      // Double-bitted forged battleaxe
      drawLine64(g, 18, 52, 44, 14, 15); // Long wooden shaft
      drawLine64(g, 19, 53, 45, 15, 23);
      // Curved steel axe head
      fillCircle64(g, 38, 18, 10, 7);
      fillCircle64(g, 46, 26, 10, 7);
      fillCircle64(g, 42, 22, 6, 8); // Polished edge
      break;
    }

    case 'pickaxe': {
      // Steel mining pickaxe
      drawLine64(g, 16, 52, 44, 20, 15); // Wooden handle
      // Arched pick head
      drawCircleRing64(g, 42, 22, 14, 7, 3);
      setP64(g, 42, 8, 8);
      setP64(g, 56, 22, 8);
      break;
    }

    case 'hammer': {
      // Heavy warhammer / sledgehammer
      drawLine64(g, 16, 50, 42, 18, 15);
      fillRect64(g, 34, 14, 16, 12, 7);
      fillRect64(g, 36, 16, 12, 8, 8);
      fillHLine64(g, 34, 49, 14, 5);
      break;
    }

    case 'shield': {
      // Knight's heraldic kite shield with steel boss & rivets
      fillCircle64(g, 32, 28, 18, 7); // Upper curve
      for (let y = 28; y <= 54; y++) {
        const w = Math.max(0, Math.floor((54 - y) * 0.7));
        fillHLine64(g, 32 - w, 32 + w, y, 7);
        fillHLine64(g, 32 - Math.max(0, w - 2), 32 + Math.max(0, w - 2), y, 3); // Paint field
      }
      // Golden central boss & cross
      fillCircle64(g, 32, 32, 5, 11);
      setP64(g, 32, 32, 5);
      fillHLine64(g, 22, 42, 32, 11);
      drawLine64(g, 32, 20, 32, 44, 11);
      break;
    }

    case 'armor': {
      // Engraved steel breastplate cuiras
      fillRect64(g, 20, 18, 24, 30, 7); // Torso plate
      fillCircle64(g, 32, 22, 8, 20); // Neck cut
      fillCircle64(g, 24, 28, 6, 8); // Left chest curve
      fillCircle64(g, 40, 28, 6, 8); // Right chest curve
      // Abdominal plates
      for (let y = 36; y <= 46; y += 4) {
        fillHLine64(g, 24, 40, y, 6);
        fillHLine64(g, 26, 38, y + 1, 8);
      }
      break;
    }

    case 'helmet': {
      // Full visor knight's helm with plume
      fillCircle64(g, 32, 32, 16, 7);
      fillRect64(g, 22, 32, 20, 16, 7);
      // Eye slit visor
      fillRect64(g, 24, 30, 16, 4, 1);
      fillHLine64(g, 26, 38, 31, 14); // Cyan visor glow
      // Crimson plume on top
      fillCircle64(g, 32, 16, 6, 9);
      fillCircle64(g, 36, 14, 5, 10);
      break;
    }

    case 'ring': {
      // Golden signet ring with faceted gemstone
      drawCircleRing64(g, 32, 36, 14, 11, 4); // Gold band
      drawCircleRing64(g, 32, 36, 12, 18, 1); // Specular
      // Gem setting at top
      fillCircle64(g, 32, 20, 6, 9); // Ruby / Gem
      fillCircle64(g, 31, 19, 4, 10);
      setP64(g, 30, 18, 5); // Diamond sparkle
      break;
    }

    case 'amulet': {
      // Golden necklace chain with glowing talisman
      drawCircleRing64(g, 32, 24, 14, 11, 2); // Chain
      fillCircle64(g, 32, 38, 10, 11); // Golden medallion setting
      fillCircle64(g, 32, 38, 7, 14); // Cyan arcane core
      setP64(g, 31, 37, 5);
      break;
    }

    case 'crown': {
      // Imperial golden crown with velvet lining & gems
      fillRect64(g, 18, 36, 28, 10, 11); // Crown base band
      fillRect64(g, 20, 32, 24, 6, 9); // Red velvet cap
      // Crown spires
      const spires = [18, 25, 32, 39, 46];
      for (const sx of spires) {
        drawLine64(g, sx, 36, sx, sx === 32 ? 20 : 24, 11);
        fillCircle64(g, sx, sx === 32 ? 20 : 24, 2, 5); // Gem tip
      }
      break;
    }

    case 'wand':
    case 'staff': {
      // Arcane staff / wand with spiraled wood & floating mana crystal
      drawLine64(g, 20, 52, 40, 24, 15);
      drawLine64(g, 21, 53, 41, 25, 23);
      // Floating mana orb / crystal at top
      fillCircle64(g, 44, 18, 7, 13);
      fillCircle64(g, 43, 17, 5, 14);
      setP64(g, 42, 16, 5);
      break;
    }

    case 'tome': {
      // Ornate leather spellbook with gold filigree
      fillRect64(g, 18, 16, 28, 36, 15); // Cover
      fillRect64(g, 42, 18, 4, 32, 16); // Pages
      fillCircle64(g, 30, 34, 6, 11); // Golden talisman crest
      setP64(g, 30, 34, 13); // Rune
      break;
    }

    case 'scroll': {
      // Rolled parchment with wax seal
      fillRect64(g, 20, 16, 24, 32, 16); // Parchment
      fillCircle64(g, 20, 32, 3, 11); // Roll end
      fillCircle64(g, 44, 32, 3, 11);
      fillCircle64(g, 32, 34, 4, 9); // Red wax seal
      setP64(g, 32, 34, 10);
      break;
    }

    case 'food_bowl': {
      // Steaming ramen / soup bowl with chopsticks
      fillCircle64(g, 32, 38, 18, 6); // Bowl
      fillCircle64(g, 32, 36, 16, 9); // Red ceramic
      fillCircle64(g, 32, 34, 13, 11); // Rich savory broth
      // Noodles & toppings
      fillCircle64(g, 26, 32, 4, 15); // Chashu pork
      fillCircle64(g, 36, 32, 3, 16); // Soft-boiled egg
      setP64(g, 36, 32, 10); // Yolk
      // Chopsticks
      drawLine64(g, 22, 22, 44, 32, 15);
      drawLine64(g, 24, 20, 46, 30, 15);
      // Steam
      drawLine64(g, 28, 20, 30, 12, 5);
      drawLine64(g, 36, 18, 34, 10, 14);
      break;
    }

    case 'burger': {
      // Gourmet burger with sesame bun, patty, cheddar & tomato
      fillCircle64(g, 32, 22, 14, 11); // Top bun
      fillRect64(g, 18, 24, 28, 4, 11);
      // Sesame seeds
      for (const [sx, sy] of [[26, 20], [32, 18], [38, 20], [29, 24], [35, 23]]) {
        setP64(g, sx, sy, 16);
      }
      // Lettuce & Tomato
      fillHLine64(g, 18, 46, 28, 12); // Green lettuce
      fillHLine64(g, 20, 44, 31, 9); // Red tomato
      // Melted Cheddar
      fillHLine64(g, 17, 47, 34, 10);
      // Beef patty
      fillRect64(g, 18, 36, 28, 6, 23);
      // Bottom bun
      fillRect64(g, 20, 42, 24, 6, 11);
      break;
    }

    case 'cake': {
      // Layered birthday / celebration cake with frosting & candle
      fillRect64(g, 16, 32, 32, 20, 16); // Cake layers
      fillRect64(g, 14, 30, 36, 6, 4); // Cream frosting
      fillRect64(g, 16, 40, 32, 3, 9); // Strawberry jam filling
      // Candle & flame
      fillRect64(g, 31, 20, 2, 10, 14); // Cyan candle
      fillCircle64(g, 32, 16, 3, 10); // Flame
      setP64(g, 32, 16, 18);
      setP64(g, 32, 15, 5);
      break;
    }

    case 'tech_core': {
      // Fusion plasma reactor core with magnetic containment coils
      fillCircle64(g, 32, 32, 20, 6); // Reactor casing
      drawCircleRing64(g, 32, 32, 18, 7, 2);
      // Magnetic coils
      for (let i = 0; i < 4; i++) {
        const rad = (i * Math.PI) / 2;
        const cx = 32 + Math.cos(rad) * 16;
        const cy = 32 + Math.sin(rad) * 16;
        fillCircle64(g, cx, cy, 4, 11); // Copper coil
      }
      // Plasma Core
      fillCircle64(g, 32, 32, 10, 14); // Cyan plasma
      fillCircle64(g, 32, 32, 6, 18); // Electric glow
      fillCircle64(g, 32, 32, 3, 5); // Pure white core
      break;
    }

    case 'chip': {
      // Integrated Silicon Circuit die with gold pins & traces
      fillRect64(g, 18, 18, 28, 28, 20); // Dark PCB substrate
      fillRect64(g, 24, 24, 16, 16, 6); // Central silicon package
      fillRect64(g, 28, 28, 8, 8, 11); // Gold die
      setP64(g, 32, 32, 5);
      // PCB circuit trace lines
      drawLine64(g, 20, 22, 24, 22, 12);
      drawLine64(g, 20, 42, 24, 42, 12);
      drawLine64(g, 40, 22, 44, 22, 12);
      drawLine64(g, 40, 42, 44, 42, 12);
      // Gold external pins
      for (let p = 20; p <= 44; p += 4) {
        setP64(g, p, 15, 11); setP64(g, p, 16, 11);
        setP64(g, p, 47, 11); setP64(g, p, 48, 11);
        setP64(g, 15, p, 11); setP64(g, 16, p, 11);
        setP64(g, 47, p, 11); setP64(g, 48, p, 11);
      }
      break;
    }

    case 'battery': {
      // High-capacity lithium battery cell with charge indicator
      fillRect64(g, 22, 18, 20, 32, 6); // Battery body
      fillRect64(g, 28, 14, 8, 4, 8); // Positive terminal (+)
      // Green charge level bars
      fillRect64(g, 26, 22, 12, 6, 12);
      fillRect64(g, 26, 30, 12, 6, 12);
      fillRect64(g, 26, 38, 12, 6, 12);
      fillHLine64(g, 28, 36, 46, 14); // Cyan energy bar
      break;
    }

    case 'robot': {
      // Autonomous robot head with glowing optical visor & antenna
      fillRect64(g, 20, 22, 24, 24, 7); // Metal head chassis
      fillHLine64(g, 20, 43, 22, 8); // Bevel
      // Glowing cyan optical visor
      fillRect64(g, 24, 28, 16, 6, 20);
      fillHLine64(g, 25, 38, 30, 14);
      fillCircle64(g, 32, 30, 2, 5);
      // Antenna
      drawLine64(g, 32, 22, 32, 14, 7);
      fillCircle64(g, 32, 13, 3, 9); // Red sensor beacon
      break;
    }

    case 'rocket': {
      // Spacecraft rocket with fins & fiery exhaust plume
      for (let y = 14; y <= 38; y++) {
        const w = Math.max(1, Math.min(6, Math.floor((y - 12) * 0.4)));
        fillHLine64(g, 32 - w, 32 + w, y, 8); // Rocket fuselage
        setP64(g, 32, y, 5); // Center shine
      }
      // Porthole window
      fillCircle64(g, 32, 24, 3, 14);
      setP64(g, 32, 24, 5);
      // Aerodynamic side fins
      drawLine64(g, 26, 34, 20, 42, 9);
      drawLine64(g, 38, 34, 44, 42, 9);
      // Fiery rocket exhaust plume
      fillCircle64(g, 32, 44, 5, 10);
      fillCircle64(g, 32, 48, 4, 18);
      setP64(g, 32, 43, 5);
      break;
    }

    case 'watch': {
      // Luxury / Cybernetic Watch with round dial & wrist strap
      fillRect64(g, 26, 12, 12, 40, 15); // Leather strap
      fillCircle64(g, 32, 32, 14, 8); // Watch case
      fillCircle64(g, 32, 32, 11, 20); // Watch face
      // Watch hands
      drawLine64(g, 32, 32, 32, 25, 14); // Minute hand
      drawLine64(g, 32, 32, 37, 32, 5); // Hour hand
      fillCircle64(g, 32, 32, 2, 11); // Center pin
      break;
    }

    case 'gear': {
      // Mechanical brass/steel cogwheel
      fillCircle64(g, 32, 32, 16, 7);
      fillCircle64(g, 32, 32, 10, 8);
      fillCircle64(g, 32, 32, 5, 20); // Axle bore
      // Cog teeth around perimeter
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        const tx = 32 + Math.cos(rad) * 16;
        const ty = 32 + Math.sin(rad) * 16;
        fillCircle64(g, tx, ty, 3, 7);
      }
      break;
    }

    case 'ingot': {
      // Stack of beveled metal ingots (gold/steel)
      fillRect64(g, 18, 34, 28, 12, 11); // Lower ingot
      fillHLine64(g, 20, 44, 34, 18);
      fillRect64(g, 24, 22, 24, 12, 11); // Upper ingot
      fillHLine64(g, 26, 46, 22, 18);
      fillHLine64(g, 26, 46, 23, 5); // Specular bar
      break;
    }

    case 'ore': {
      // Mineral stone rock with glittering embedded gemstone veins
      fillCircle64(g, 32, 34, 16, 6); // Rough stone
      fillCircle64(g, 30, 32, 13, 7);
      // Embedded gem veins
      const veins = [[26, 28], [34, 26], [38, 34], [28, 38], [32, 34]];
      for (const [vx, vy] of veins) {
        fillCircle64(g, vx, vy, 3, 14); // Glowing crystal vein
        setP64(g, vx, vy, 5);
      }
      break;
    }

    case 'wood': {
      // Cut hardwood log with growth rings & bark
      fillCircle64(g, 32, 32, 16, 23); // Bark exterior
      fillCircle64(g, 32, 32, 14, 15); // Wood face
      drawCircleRing64(g, 32, 32, 10, 11, 1); // Growth ring 1
      drawCircleRing64(g, 32, 32, 5, 11, 1); // Growth ring 2
      setP64(g, 32, 32, 23); // Center heartwood
      break;
    }

    case 'leaf': {
      // Botanical botanical leaf with veins
      fillCircle64(g, 32, 32, 16, 12);
      // Vein structure
      drawLine64(g, 32, 48, 32, 16, 22); // Main vein
      drawLine64(g, 32, 36, 24, 30, 22); // Lateral veins
      drawLine64(g, 32, 36, 40, 30, 22);
      drawLine64(g, 32, 26, 26, 22, 22);
      drawLine64(g, 32, 26, 38, 22, 22);
      setP64(g, 31, 20, 5); // Dewdrop
      break;
    }

    case 'fire': {
      // Roaring fire flame with yellow core & orange/red tongues
      fillCircle64(g, 32, 38, 16, 9); // Red outer flame
      fillCircle64(g, 32, 36, 12, 10); // Amber flame
      fillCircle64(g, 32, 38, 7, 18); // Bright electric yellow
      fillCircle64(g, 32, 40, 3, 5); // White hot core
      // Flame tip licks
      drawLine64(g, 32, 22, 32, 14, 10);
      drawLine64(g, 26, 26, 24, 18, 9);
      drawLine64(g, 38, 26, 40, 18, 9);
      break;
    }

    case 'ice': {
      // Prismatic faceted ice crystal cluster
      fillCircle64(g, 32, 32, 16, 14); // Cyan ice body
      fillCircle64(g, 32, 32, 12, 12);
      // Sharp facet lines
      drawLine64(g, 32, 16, 32, 48, 5);
      drawLine64(g, 16, 32, 48, 32, 5);
      drawLine64(g, 20, 20, 44, 44, 8);
      drawLine64(g, 44, 20, 20, 44, 8);
      break;
    }

    case 'water': {
      // Crystalline water droplet with surface tension & specular highlight
      for (let y = 16; y <= 48; y++) {
        const rad = Math.floor(Math.sin(((y - 16) / 32) * Math.PI) * 14);
        fillHLine64(g, 32 - rad, 32 + rad, y, 14);
      }
      fillCircle64(g, 28, 26, 4, 5); // Specular highlight
      break;
    }

    case 'lightning': {
      // Jagged electric lightning bolt with branches
      drawLine64(g, 36, 12, 28, 28, 18);
      drawLine64(g, 28, 28, 38, 28, 18);
      drawLine64(g, 38, 28, 26, 52, 18);
      // White electric core
      drawLine64(g, 35, 13, 29, 27, 5);
      drawLine64(g, 29, 27, 37, 27, 5);
      drawLine64(g, 37, 27, 27, 51, 5);
      break;
    }

    case 'star': {
      // Radiant celestial star with 4 long rays & golden center
      fillCircle64(g, 32, 32, 8, 11);
      fillCircle64(g, 32, 32, 4, 18);
      setP64(g, 32, 32, 5);
      // Rays
      drawLine64(g, 32, 12, 32, 52, 18);
      drawLine64(g, 12, 32, 52, 32, 18);
      drawLine64(g, 20, 20, 44, 44, 11);
      drawLine64(g, 44, 20, 20, 44, 11);
      break;
    }

    case 'crystal': {
      // Faceted mineral crystal cluster
      for (const [cx, cy, h] of [[26, 36, 18], [34, 30, 26], [42, 38, 16]]) {
        for (let dy = 0; dy <= h; dy++) {
          const w = Math.max(1, 4 - Math.floor(dy * 0.15));
          fillHLine64(g, cx - w, cx + w, cy - dy, 13);
          setP64(g, cx, cy - dy, 14); // Facet reflection
        }
        fillCircle64(g, cx, cy - h, 2, 5);
      }
      break;
    }

    case 'mushroom': {
      // Spotted toadstool cap with stem
      fillRect64(g, 28, 32, 8, 18, 16); // Stem
      fillCircle64(g, 32, 26, 18, 9); // Red cap
      fillRect64(g, 14, 26, 36, 6, 9);
      // White spots on cap
      for (const [sx, sy] of [[24, 20], [32, 16], [40, 20], [28, 24], [36, 24]]) {
        fillCircle64(g, sx, sy, 2.5, 5);
      }
      break;
    }

    case 'shallot': {
      // Purple/gold teardrop shallot bulb with green sprouts
      fillCircle64(g, 32, 38, 14, 13); // Violet bulb
      fillCircle64(g, 32, 38, 11, 11); // Golden inner
      // Green shoots at top
      drawLine64(g, 32, 24, 28, 12, 12);
      drawLine64(g, 32, 24, 36, 14, 12);
      break;
    }

    case 'waffle': {
      // Crispy golden embossed waffle with melting butter
      fillRect64(g, 16, 20, 32, 28, 11);
      for (let x = 20; x <= 44; x += 6) {
        for (let y = 24; y <= 44; y += 6) {
          fillRect64(g, x, y, 4, 4, 23); // Indentations
        }
      }
      // Melting butter pat
      fillRect64(g, 28, 22, 8, 6, 18);
      fillHLine64(g, 28, 35, 22, 5);
      break;
    }

    case 'cindercloth': {
      // Flowing banner with glowing cinder embers
      fillRect64(g, 18, 16, 28, 36, 6);
      for (let y = 16; y <= 50; y += 3) {
        setP64(g, 22 + (y % 4), y, 9); // Cinder thread
        setP64(g, 38 - (y % 4), y, 10);
      }
      break;
    }

    case 'myco_membrane': {
      // Hexagonal cellular bio-lattice
      drawCircleRing64(g, 32, 32, 16, 12, 2);
      fillCircle64(g, 32, 32, 8, 14);
      fillCircle64(g, 32, 32, 4, 18);
      setP64(g, 32, 32, 5);
      break;
    }

    case 'hydrosol': {
      // Purified botanical distillation flask
      fillCircle64(g, 32, 38, 14, 14);
      fillCircle64(g, 32, 38, 10, 12);
      fillRect64(g, 29, 18, 6, 10, 14);
      setP64(g, 30, 24, 5);
      break;
    }

    // ========================================================================
    // Artisan Drinks, Coffee, Macchiato, Tea, Beer & Cocktails
    // ========================================================================
    case 'drink': {
      const isCoffee =
        n.includes('macchiato') ||
        n.includes('coffee') ||
        n.includes('espresso') ||
        n.includes('cappuccino') ||
        n.includes('latte') ||
        n.includes('mocha') ||
        n.includes('frappe') ||
        n.includes('cold brew');

      const isTea = n.includes('tea') || n.includes('matcha') || n.includes('chai');
      const isBeer =
        n.includes('beer') ||
        n.includes('ale') ||
        n.includes('lager') ||
        n.includes('stout') ||
        n.includes('pint') ||
        n.includes('cider');
      const isWineOrCocktail =
        n.includes('wine') ||
        n.includes('cocktail') ||
        n.includes('martini') ||
        n.includes('champagne') ||
        n.includes('mimosa');

      if (isCoffee) {
        // High-fidelity Espresso Macchiato / Specialty Coffee Glass (matching pixel art reference)
        // 1. Double-walled glass cup profile
        for (let y = 28; y <= 48; y++) {
          const taper = y >= 40 ? Math.floor((y - 40) * 0.5) : 0;
          const xLeft = 20 + taper;
          const xRight = 44 - taper;

          // Glass wall reflection tint
          setP64(g, xLeft, y, 14); // Cyan glass reflection
          setP64(g, xRight, y, 8); // Light glass highlight

          // Liquid filling inside glass
          if (y >= 29 && y <= 33) {
            // Golden-caramel Crema Layer
            fillHLine64(g, xLeft + 2, xRight - 2, y, 11);
            setP64(g, xLeft + 3, y, 15);
          } else if (y >= 34 && y <= 46) {
            // Rich Dark Roasted Espresso Base
            fillHLine64(g, xLeft + 2, xRight - 2, y, 23); // Roasted brown
            fillHLine64(g, xLeft + 5, xRight - 4, y, 17); // Deep espresso dark shadow
            // Left glass wall inner specular gleam
            setP64(g, xLeft + 2, y, 8);
            setP64(g, xLeft + 3, y, 5);
          } else if (y >= 47) {
            // Heavy glass base bottom
            fillHLine64(g, xLeft, xRight, y, 8);
          }
        }

        // Glass Handle (Right)
        drawLine64(g, 44, 32, 51, 33, 8);
        drawLine64(g, 51, 33, 52, 40, 6);
        drawLine64(g, 52, 40, 44, 42, 23);
        setP64(g, 49, 34, 5);
        setP64(g, 50, 37, 8);

        // Glass Left Vertical Specular Highlight
        for (let y = 30; y <= 42; y++) {
          setP64(g, 21, y, 5); // Pure white vertical gleam
        }

        // 2. Voluminous Fluffy Whipped Cream / Foam Topping
        fillCircle64(g, 32, 22, 10, 16); // Main central dome (cream ivory)
        fillCircle64(g, 26, 24, 7, 16);  // Left cloud
        fillCircle64(g, 38, 24, 7, 16);  // Right cloud
        fillCircle64(g, 32, 16, 5, 16);  // High crown peak
        fillRect64(g, 31, 12, 3, 4, 16);  // Whipped tip

        // Specular Sunlit Highlights on Cream (Top & Left)
        setP64(g, 32, 13, 5);
        fillCircle64(g, 28, 19, 3, 5);
        fillCircle64(g, 24, 23, 2, 5);
        fillCircle64(g, 33, 20, 2, 5);

        // Caramel Drizzle / Foam Shade Folds
        for (const [cx, cy] of [
          [35, 18], [36, 23], [30, 25], [26, 26], [38, 26], [32, 27], [34, 24],
        ]) {
          setP64(g, cx, cy, 11); // Golden caramel
        }
        setP64(g, 36, 25, 15);
        setP64(g, 39, 27, 15);

      } else if (isWineOrCocktail) {
        // Stemmed Crystal Goblet with Radiant Beverage & Citrus Wheel
        fillCircle64(g, 32, 26, 12, 8);
        fillCircle64(g, 32, 27, 10, 21); // Rich red wine / cocktail
        fillRect64(g, 22, 18, 20, 6, 0); // Open top
        fillHLine64(g, 24, 40, 22, 9);
        setP64(g, 24, 25, 5);
        setP64(g, 25, 28, 5);
        // Stem & Base
        fillRect64(g, 31, 34, 2, 14, 8);
        fillHLine64(g, 24, 40, 48, 8);
        fillHLine64(g, 26, 38, 49, 7);
        // Citrus garnish wheel on rim
        fillCircle64(g, 39, 18, 4, 11);
        fillCircle64(g, 39, 18, 2, 18);
      } else if (isBeer) {
        // Frothing Bavarian Beer Stein with Golden Ale & Foaming Head
        fillRect64(g, 22, 26, 22, 24, 11); // Golden beer body
        fillRect64(g, 24, 28, 18, 20, 18); // Amber center
        // Stein Handle
        drawLine64(g, 44, 30, 52, 33, 8);
        drawLine64(g, 52, 33, 52, 44, 7);
        drawLine64(g, 52, 44, 44, 46, 8);
        // Frothy billowing foam cap
        fillCircle64(g, 26, 22, 6, 16);
        fillCircle64(g, 33, 20, 7, 16);
        fillCircle64(g, 40, 22, 6, 16);
        setP64(g, 32, 19, 5);
        setP64(g, 27, 21, 5);
        fillRect64(g, 25, 27, 3, 6, 16); // Foam drip
      } else if (isTea) {
        // Ceramic Teacup with Matcha / Herbal Tea & Rising Steam
        fillCircle64(g, 32, 38, 14, 16); // White ceramic cup
        fillCircle64(g, 32, 37, 12, 22); // Green tea / matcha
        fillHLine64(g, 22, 42, 32, 12);
        // Saucer plate
        fillHLine64(g, 18, 46, 48, 16);
        fillHLine64(g, 20, 44, 49, 8);
        // Rising delicate steam curls
        drawLine64(g, 28, 28, 26, 18, 8);
        drawLine64(g, 34, 26, 36, 16, 8);
        setP64(g, 27, 22, 5);
        setP64(g, 35, 20, 5);
      } else {
        // Chilled Refreshing Tumbler Glass with Ice Cubes & Striped Straw
        fillRect64(g, 22, 22, 20, 26, 14); // Cyan beverage / juice
        fillRect64(g, 24, 24, 16, 22, 3);  // Dynamic beverage color
        fillRect64(g, 26, 25, 5, 5, 8);    // Floating ice cubes
        setP64(g, 27, 26, 5);
        fillRect64(g, 33, 29, 5, 5, 8);
        setP64(g, 34, 30, 5);
        for (let i = 0; i < 18; i++) {
          const sx = 30 + Math.floor(i * 0.4);
          const sy = 12 + i;
          setP64(g, sx, sy, i % 4 < 2 ? 9 : 5);
        }
        for (let y = 24; y <= 44; y++) {
          setP64(g, 23, y, 5);
        }
      }
      break;
    }

    // ========================================================================
    // Artisan Bakery: Crusty Rustic Loaf / Baguette
    // ========================================================================
    case 'bread': {
      fillCircle64(g, 32, 36, 18, 15); // Golden brown base
      fillCircle64(g, 32, 34, 16, 11); // Honey crust
      fillRect64(g, 18, 38, 28, 12, 23); // Roasted lower crust
      for (let s = -8; s <= 8; s += 8) {
        drawLine64(g, 26 + s, 26, 34 + s, 38, 23);
        drawLine64(g, 27 + s, 27, 33 + s, 37, 16);
      }
      setP64(g, 31, 22, 5);
      setP64(g, 32, 21, 5);
      setP64(g, 33, 22, 5);
      break;
    }

    // ========================================================================
    // Prime Roasted Meat / Marbled Steak
    // ========================================================================
    case 'meat': {
      fillCircle64(g, 30, 32, 14, 21); // Rich red meat
      fillCircle64(g, 36, 34, 12, 9);  // Crimson edge
      fillCircle64(g, 22, 26, 4, 16);  // Bone
      setP64(g, 22, 26, 5);
      drawLine64(g, 22, 26, 32, 32, 16);
      drawLine64(g, 24, 30, 42, 38, 23);
      drawLine64(g, 26, 36, 40, 44, 23);
      drawLine64(g, 28, 42, 40, 30, 17);
      break;
    }

    // ========================================================================
    // Gourmet Aged Cheese Wedge
    // ========================================================================
    case 'cheese': {
      for (let y = 24; y <= 44; y++) {
        const xStart = 18;
        const xEnd = 18 + Math.floor((44 - y) * 1.3);
        fillHLine64(g, xStart, xEnd, y, 18); // Cheddar yellow
      }
      fillRect64(g, 18, 36, 32, 10, 11); // Shadow side
      fillCircle64(g, 26, 32, 3, 23);    // Swiss cheese holes
      setP64(g, 26, 32, 11);
      fillCircle64(g, 34, 28, 2, 23);
      fillCircle64(g, 24, 40, 3, 15);
      fillCircle64(g, 38, 38, 2.5, 15);
      break;
    }

    // ========================================================================
    // Orchard Fresh Fruit / Jewel Berry
    // ========================================================================
    case 'fruit': {
      fillCircle64(g, 32, 36, 16, 9);  // Red fruit body
      fillCircle64(g, 28, 34, 12, 21); // Crimson shade
      for (let a = 28; a <= 36; a++) {
        setP64(g, 22, a, 5);
        setP64(g, 23, a - 1, 5);
      }
      drawLine64(g, 32, 22, 32, 16, 15); // Wooden stem
      fillCircle64(g, 37, 17, 4, 12);     // Fresh green leaf
      setP64(g, 38, 16, 22);
      break;
    }

    // ========================================================================
    // Artisan Sushi Nigiri
    // ========================================================================
    case 'sushi': {
      fillCircle64(g, 32, 36, 14, 16); // Rice bed
      fillRect64(g, 20, 34, 24, 10, 16);
      fillRect64(g, 16, 28, 32, 7, 10); // Salmon coral topping
      fillHLine64(g, 18, 44, 28, 9);
      drawLine64(g, 20, 29, 24, 34, 5); // Salmon fat lines
      drawLine64(g, 28, 29, 32, 34, 5);
      drawLine64(g, 36, 29, 40, 34, 5);
      fillRect64(g, 30, 26, 4, 18, 20); // Dark nori belt
      break;
    }

    // ========================================================================
    // Arcane Scrying Orb & Celestial Globe (NOT A PLAIN SPHERE!)
    // ========================================================================
    case 'orb': {
      // Ornate golden pedestal base
      fillHLine64(g, 22, 42, 50, 11);
      fillHLine64(g, 24, 40, 48, 15);
      // Bronze claw prongs grasping the sphere
      drawLine64(g, 20, 48, 24, 38, 11);
      drawLine64(g, 44, 48, 40, 38, 11);
      drawLine64(g, 32, 48, 32, 42, 11);
      // Mystical swirling nebula sphere
      fillCircle64(g, 32, 28, 14, 13); // Arcane purple glass
      fillCircle64(g, 30, 26, 10, 14); // Cyan glowing interior nebula
      fillCircle64(g, 28, 24, 6, 19);  // Cosmic pink core
      // Star glints
      setP64(g, 27, 23, 5);
      setP64(g, 28, 23, 5);
      setP64(g, 27, 24, 5);
      // Orbiting magic sparks
      setP64(g, 16, 22, 14);
      setP64(g, 48, 32, 19);
      break;
    }

    // ========================================================================
    // Armory: Spear, Bow, Crossbow, Scythe, Blaster, Boots, Gauntlet, Cloak
    // ========================================================================
    case 'spear': {
      drawLine64(g, 14, 52, 48, 18, 15); // Ash shaft
      drawLine64(g, 15, 53, 49, 19, 23);
      drawLine64(g, 42, 24, 52, 14, 8); // Steel spearhead
      drawLine64(g, 44, 22, 54, 12, 5);
      fillCircle64(g, 48, 18, 3, 7);
      fillCircle64(g, 40, 26, 3, 11);   // Golden collar
      fillCircle64(g, 38, 30, 3, 9);    // Crimson ribbon
      drawLine64(g, 38, 30, 34, 38, 9);
      break;
    }

    case 'bow': {
      drawLine64(g, 18, 16, 42, 22, 15); // Yew stave
      drawLine64(g, 42, 22, 46, 32, 11);
      drawLine64(g, 46, 32, 42, 42, 11);
      drawLine64(g, 42, 42, 18, 48, 15);
      drawLine64(g, 18, 16, 18, 48, 8);  // Bowstring
      drawLine64(g, 14, 32, 48, 32, 7);  // Arrow
      fillCircle64(g, 48, 32, 2, 5);
      setP64(g, 14, 31, 9);
      setP64(g, 14, 33, 9);
      break;
    }

    case 'crossbow': {
      fillRect64(g, 28, 18, 8, 34, 15); // Hardwood stock
      drawLine64(g, 14, 26, 50, 26, 7); // Steel prod
      drawLine64(g, 14, 25, 50, 25, 8);
      drawLine64(g, 14, 26, 32, 34, 8); // Cocked string
      drawLine64(g, 50, 26, 32, 34, 8);
      fillCircle64(g, 32, 14, 3, 8);    // Stirrup
      fillRect64(g, 31, 20, 2, 12, 5);   // Silver bolt
      break;
    }

    case 'scythe': {
      drawLine64(g, 20, 54, 46, 16, 15); // Snath handle
      drawLine64(g, 46, 16, 16, 18, 8);  // Curved blade
      drawLine64(g, 46, 17, 18, 22, 7);
      fillCircle64(g, 46, 16, 3, 11);    // Golden ring
      setP64(g, 20, 18, 5);
      break;
    }

    case 'blaster': {
      fillRect64(g, 26, 30, 8, 18, 6);  // Ergonomic grip
      fillRect64(g, 20, 22, 28, 10, 7); // Upper receiver
      fillRect64(g, 46, 24, 8, 6, 8);   // Muzzle barrel
      fillRect64(g, 28, 24, 10, 6, 14); // Cyan plasma glow
      fillHLine64(g, 29, 36, 26, 5);    // White electric core
      break;
    }

    case 'boots': {
      fillRect64(g, 22, 22, 10, 20, 15); // Left boot
      fillRect64(g, 34, 22, 10, 20, 15); // Right boot
      fillRect64(g, 18, 38, 16, 8, 23);  // Left sole
      fillRect64(g, 32, 38, 16, 8, 23);  // Right sole
      setP64(g, 28, 28, 11);             // Brass buckles
      setP64(g, 40, 28, 11);
      break;
    }

    case 'gauntlet': {
      fillRect64(g, 24, 24, 16, 24, 7); // Steel plate
      fillHLine64(g, 24, 39, 32, 8);
      for (let f = 24; f <= 36; f += 4) {
        fillRect64(g, f, 18, 3, 8, 8);
      }
      setP64(g, 25, 26, 11); // Golden knuckle studs
      setP64(g, 29, 26, 11);
      setP64(g, 33, 26, 11);
      setP64(g, 37, 26, 11);
      break;
    }

    case 'cloak': {
      for (let y = 20; y <= 50; y++) {
        const w = Math.floor((y - 20) * 0.5) + 8;
        fillHLine64(g, 32 - w, 32 + w, y, 6);
        fillHLine64(g, 32 - Math.max(0, w - 3), 32 + Math.max(0, w - 3), y, 3);
      }
      fillCircle64(g, 32, 20, 4, 11); // Golden brooch
      setP64(g, 32, 20, 5);
      break;
    }

    // ========================================================================
    // Mystical Curiosities & Dungeon Relics
    // ========================================================================
    case 'cauldron': {
      fillCircle64(g, 32, 36, 16, 6);  // Iron belly
      fillRect64(g, 18, 24, 28, 6, 7); // Rim
      drawLine64(g, 20, 44, 16, 52, 6);
      drawLine64(g, 44, 44, 48, 52, 6);
      drawLine64(g, 32, 48, 32, 54, 6);
      fillHLine64(g, 22, 42, 26, 12);  // Glowing potion
      fillCircle64(g, 26, 24, 3, 14);
      fillCircle64(g, 36, 23, 2, 18);
      setP64(g, 28, 16, 14);
      setP64(g, 34, 14, 12);
      break;
    }

    case 'feather': {
      drawLine64(g, 16, 50, 48, 14, 16); // Central spine
      for (let i = 0; i < 28; i++) {
        const sx = 20 + i;
        const sy = 46 - i;
        const w = Math.floor(Math.sin((i / 28) * Math.PI) * 7);
        fillHLine64(g, sx - w, sx + w, sy, 10);
      }
      setP64(g, 16, 50, 7);
      break;
    }

    case 'skull': {
      fillCircle64(g, 32, 26, 14, 16); // Cranium
      fillRect64(g, 26, 36, 12, 8, 16); // Jaw
      fillCircle64(g, 27, 28, 3, 17);   // Eyes
      fillCircle64(g, 37, 28, 3, 17);
      setP64(g, 32, 33, 17);
      fillHLine64(g, 27, 37, 40, 1);
      break;
    }

    case 'key': {
      drawCircleRing64(g, 22, 22, 8, 11, 2); // Clover bow
      setP64(g, 22, 22, 5);
      drawLine64(g, 28, 28, 48, 48, 11);
      drawLine64(g, 29, 27, 49, 47, 15);
      drawLine64(g, 46, 46, 42, 50, 11); // Teeth bit
      drawLine64(g, 42, 42, 38, 46, 11);
      break;
    }

    case 'chest': {
      fillRect64(g, 18, 28, 28, 20, 15); // Box body
      fillCircle64(g, 32, 26, 14, 11);   // Domed lid
      fillRect64(g, 16, 24, 32, 6, 23);
      fillRect64(g, 22, 22, 3, 26, 6);   // Iron bands
      fillRect64(g, 39, 22, 3, 26, 6);
      fillCircle64(g, 32, 32, 3, 11);    // Golden lock
      setP64(g, 32, 32, 1);
      break;
    }

    case 'torch': {
      drawLine64(g, 24, 52, 36, 28, 15); // Wood handle
      drawLine64(g, 25, 53, 37, 29, 23);
      fillRect64(g, 33, 24, 8, 6, 6);
      fillCircle64(g, 38, 18, 8, 9);     // Red flame
      fillCircle64(g, 37, 17, 6, 10);    // Orange flame
      fillCircle64(g, 36, 16, 3, 18);    // Yellow core
      setP64(g, 35, 15, 5);
      setP64(g, 42, 10, 10);
      break;
    }

    case 'flower': {
      drawLine64(g, 32, 36, 32, 52, 12); // Stem
      fillCircle64(g, 28, 42, 3, 22);    // Leaf
      for (let i = 0; i < 5; i++) {
        const rad = (i * 2 * Math.PI) / 5;
        const px = 32 + Math.cos(rad) * 9;
        const py = 28 + Math.sin(rad) * 9;
        fillCircle64(g, px, py, 5, 19);  // Petals
      }
      fillCircle64(g, 32, 28, 4, 11);    // Golden stamen
      setP64(g, 32, 28, 5);
      break;
    }

    case 'anvil': {
      fillRect64(g, 22, 32, 20, 8, 7);  // Waist
      fillRect64(g, 18, 40, 28, 10, 6); // Flared base
      fillRect64(g, 20, 24, 26, 8, 8);  // Working face
      drawLine64(g, 20, 26, 12, 28, 8); // Horn
      drawLine64(g, 20, 28, 12, 28, 7);
      fillHLine64(g, 20, 44, 24, 5);
      break;
    }

    case 'fish': {
      fillCircle64(g, 30, 32, 14, 14); // Sleek fish body
      fillRect64(g, 22, 26, 20, 12, 14);
      drawLine64(g, 42, 32, 52, 24, 8); // Tail fin
      drawLine64(g, 42, 32, 52, 40, 8);
      fillCircle64(g, 22, 30, 2, 1);    // Glistening eye
      setP64(g, 22, 30, 5);
      break;
    }

    case 'cloth': {
      fillRect64(g, 20, 24, 24, 20, 3); // Main fabric drape
      fillCircle64(g, 20, 34, 6, 4);    // Cylinder roll
      fillCircle64(g, 44, 34, 6, 2);
      fillRect64(g, 30, 22, 4, 24, 11); // Golden ribbon tie
      break;
    }

    case 'magnet': {
      drawCircleRing64(g, 32, 28, 14, 9, 5); // Red horseshoe curve
      fillRect64(g, 18, 28, 5, 12, 9);
      fillRect64(g, 41, 28, 5, 12, 9);
      fillRect64(g, 18, 38, 5, 6, 8);        // Silver poles
      fillRect64(g, 41, 38, 5, 6, 8);
      setP64(g, 28, 42, 14);                 // Magnetic spark
      setP64(g, 36, 42, 18);
      break;
    }

    case 'wire': {
      drawCircleRing64(g, 32, 32, 14, 6, 4); // Jacket
      drawCircleRing64(g, 32, 32, 8, 20, 3);
      fillRect64(g, 16, 30, 6, 4, 10);       // Copper leads
      fillRect64(g, 42, 30, 6, 4, 11);
      setP64(g, 18, 31, 5);
      setP64(g, 44, 31, 5);
      break;
    }

    case 'compass': {
      drawCircleRing64(g, 32, 32, 16, 11, 3); // Brass bezel
      fillCircle64(g, 32, 32, 13, 16);       // White face
      drawLine64(g, 32, 32, 32, 22, 9);      // North needle
      drawLine64(g, 32, 32, 32, 42, 14);     // South needle
      fillCircle64(g, 32, 32, 2, 5);
      break;
    }

    case 'telescope': {
      drawLine64(g, 18, 46, 46, 18, 11); // Main brass tube
      drawLine64(g, 19, 47, 47, 19, 15);
      fillCircle64(g, 46, 18, 5, 11);
      fillCircle64(g, 46, 18, 3, 14);    // Glass lens
      setP64(g, 46, 18, 5);
      break;
    }

    case 'tool_craft': {
      drawLine64(g, 32, 18, 20, 48, 7); // Caliper arms
      drawLine64(g, 32, 18, 44, 48, 7);
      fillCircle64(g, 32, 18, 4, 11);
      setP64(g, 32, 18, 5);
      fillHLine64(g, 24, 40, 36, 8);
      break;
    }

    case 'artifact': {
      // Ancient Celestial Astrolabe / Forged Relic Talisman
      for (let y = 18; y <= 46; y++) {
        const span = y <= 32 ? Math.floor((y - 18) * 0.9) : Math.floor((46 - y) * 0.9);
        fillHLine64(g, 32 - span - 4, 32 + span + 4, y, 11); // Gold filigree
        fillHLine64(g, 32 - span, 32 + span, y, 6);          // Dark obsidian core
      }
      drawCircleRing64(g, 32, 32, 10, 14, 2);
      fillCircle64(g, 32, 32, 6, 18);
      fillCircle64(g, 32, 32, 3, 5);
      break;
    }

    // ========================================================================
    // Dynamic Procedural Fallback: Authentic Detailed Item (NEVER plain sphere!)
    // ========================================================================
    default: {
      const shapeType = rng.int(0, 7);

      if (shapeType === 0) {
        // Faceted Gem Cluster / Mineral Crystal Shards
        fillCircle64(g, 32, 34, 14, 3);
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + 0.3;
          const fx = 32 + Math.floor(Math.cos(angle) * 8);
          const fy = 34 + Math.floor(Math.sin(angle) * 8);
          fillCircle64(g, fx, fy, 5, 4);
          setP64(g, fx, fy, 5);
        }
      } else if (shapeType === 1) {
        // Ornate Relic Medallion / Celestial Seal
        for (let y = 20; y <= 44; y++) {
          const w = Math.floor(Math.sin(((y - 20) / 24) * Math.PI) * 12);
          fillHLine64(g, 32 - w, 32 + w, y, 11);
          fillHLine64(g, 32 - Math.max(0, w - 2), 32 + Math.max(0, w - 2), y, 3);
        }
        fillCircle64(g, 32, 32, 4, 5);
      } else if (shapeType === 2) {
        // Forged Ingot / Power Prism
        fillRect64(g, 20, 24, 24, 16, 3);
        fillHLine64(g, 20, 43, 24, 5);
        fillRect64(g, 24, 28, 16, 8, 4);
      } else if (shapeType === 3) {
        // Alchemical Glass Vial / Essence Flask
        fillCircle64(g, 32, 38, 12, 3);
        fillRect64(g, 29, 22, 6, 12, 8);
        fillCircle64(g, 32, 36, 8, 4);
        setP64(g, 30, 30, 5);
      } else if (shapeType === 4) {
        // Compact clockwork mechanism with visible gears and feet
        fillRect64(g, 16, 20, 32, 28, 6);
        fillRect64(g, 20, 24, 24, 18, 3);
        drawCircleRing64(g, 27, 33, 7, 11, 2);
        drawCircleRing64(g, 38, 31, 5, 8, 2);
        fillCircle64(g, 27, 33, 2, 5);
        fillCircle64(g, 38, 31, 1.5, 5);
        fillRect64(g, 19, 48, 7, 5, 7);
        fillRect64(g, 38, 48, 7, 5, 7);
      } else if (shapeType === 5) {
        // Inscribed component tablet with a central maker's seal
        fillRect64(g, 16, 12, 32, 42, 6);
        fillRect64(g, 20, 16, 24, 34, 3);
        drawCircleRing64(g, 32, 29, 9, 13, 2);
        drawLine64(g, 25, 44, 39, 44, 8);
        drawLine64(g, 27, 48, 37, 48, 7);
        fillCircle64(g, 32, 29, 3, 5);
      } else if (shapeType === 6) {
        // Bound artisan pouch containing a botanical or powdered material
        fillCircle64(g, 32, 39, 15, 15);
        fillRect64(g, 24, 23, 16, 9, 15);
        drawLine64(g, 22, 29, 42, 29, 11);
        drawLine64(g, 31, 23, 27, 16, 12);
        drawLine64(g, 33, 23, 38, 16, 12);
        fillCircle64(g, 27, 39, 3, 22);
        fillCircle64(g, 36, 42, 2, 18);
      } else {
        // Asymmetric crafted implement, distinct from gems and potion bottles
        drawLine64(g, 16, 53, 39, 23, 15);
        drawLine64(g, 18, 54, 41, 24, 23);
        fillCircle64(g, 43, 20, 11, 6);
        fillCircle64(g, 42, 19, 7, 14);
        drawLine64(g, 37, 14, 52, 10, 8);
        fillCircle64(g, 16, 52, 4, 11);
      }
      break;
    }
  }

  applyArtisanDetailPass64(g, rng, hash, itemName, itemCategory, archetype);

  // Always apply crisp 1px RPG dark contour outline
  addAutomaticOutlines64(g);

  return g;
}
