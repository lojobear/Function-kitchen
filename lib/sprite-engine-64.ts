/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 64-Bit High-Definition Procedural Pixel Art Sprite Engine
 * Renders exquisite 64x64 pixel art matrices with rich 64-bit color fidelity,
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

  switch (archetype) {
    // ========================================================================
    // CRAFTING TOOLS & PROCESSES (Accurate, Dedicated 64-Bit Sprites)
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

    // Default Fallback: High-Definition Procedural Item
    default: {
      // Produces an authentic, balanced, beautiful 64x64 item shape
      fillCircle64(g, 32, 32, 16, 3);
      fillCircle64(g, 30, 30, 12, 4);
      fillCircle64(g, 28, 28, 6, 5);
      drawCircleRing64(g, 32, 32, 16, 8, 2);
      break;
    }
  }

  // Always apply crisp 1px RPG dark contour outline
  addAutomaticOutlines64(g);

  return g;
}
