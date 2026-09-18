/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pixel Art Color Quantizer (Median Cut Algorithm)
 *
 * Implements:
 * - Quantize image down to 24-40 colors (default 32)
 * - Preserve hard pixel edges (binary alpha, no semi-transparent blur)
 * - Eliminate anti-aliasing fuzz
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorBox {
  pixels: RGB[];
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function createBox(pixels: RGB[]): ColorBox {
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }

  return { pixels, rMin, rMax, gMin, gMax, bMin, bMax };
}

function splitBox(box: ColorBox): [ColorBox, ColorBox] {
  const rRange = box.rMax - box.rMin;
  const gRange = box.gMax - box.gMin;
  const bRange = box.bMax - box.bMin;

  let channel: 'r' | 'g' | 'b' = 'r';
  if (gRange >= rRange && gRange >= bRange) channel = 'g';
  else if (bRange >= rRange && bRange >= gRange) channel = 'b';

  box.pixels.sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(box.pixels.length / 2);
  const part1 = box.pixels.slice(0, mid);
  const part2 = box.pixels.slice(mid);

  return [createBox(part1), createBox(part2)];
}

function getBoxAverage(box: ColorBox): RGB {
  if (box.pixels.length === 0) return { r: 0, g: 0, b: 0 };
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < box.pixels.length; i++) {
    r += box.pixels[i].r;
    g += box.pixels[i].g;
    b += box.pixels[i].b;
  }
  const len = box.pixels.length;
  return {
    r: Math.round(r / len),
    g: Math.round(g / len),
    b: Math.round(b / len),
  };
}

export function colorDistanceSq(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Generate a quantized palette of ~24-40 colors from opaque pixels
 */
export function buildQuantizedPalette(pixels: RGB[], maxColors: number = 32): RGB[] {
  if (pixels.length === 0) return [{ r: 0, g: 0, b: 0 }];
  if (pixels.length <= maxColors) return pixels;

  let boxes: ColorBox[] = [createBox(pixels)];

  while (boxes.length < maxColors) {
    // Pick box with the largest volume or range
    let largestIdx = -1;
    let maxRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length <= 1) continue;
      const range = Math.max(b.rMax - b.rMin, b.gMax - b.gMin, b.bMax - b.bMin);
      if (range > maxRange) {
        maxRange = range;
        largestIdx = i;
      }
    }

    if (largestIdx === -1) break;

    const targetBox = boxes.splice(largestIdx, 1)[0];
    const [b1, b2] = splitBox(targetBox);
    if (b1.pixels.length > 0) boxes.push(b1);
    if (b2.pixels.length > 0) boxes.push(b2);
  }

  return boxes.map(getBoxAverage);
}

/**
 * Quantize an ImageData object in-place:
 * - Alpha thresholding: alpha < 64 becomes completely transparent (0)
 * - Alpha >= 64 becomes completely opaque (255)
 * - Reduces opaque colors to 24-40 distinct palette colors
 */
export function quantizeImageDataInPlace(imageData: ImageData, targetColors: number = 32): void {
  const data = imageData.data;
  const len = data.length;

  const opaquePixels: RGB[] = [];

  // Pass 1: gather all opaque pixels
  for (let i = 0; i < len; i += 4) {
    const a = data[i + 3];
    if (a >= 64) {
      opaquePixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }
  }

  // Constrain target colors to 24-40 range
  const numColors = Math.max(24, Math.min(40, targetColors));
  const palette = buildQuantizedPalette(opaquePixels, numColors);

  // Pass 2: map every pixel to strict binary alpha and nearest palette color
  for (let i = 0; i < len; i += 4) {
    const a = data[i + 3];
    if (a < 64) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      const current: RGB = { r: data[i], g: data[i + 1], b: data[i + 2] };
      let nearest = palette[0];
      let minDist = Number.POSITIVE_INFINITY;

      for (let p = 0; p < palette.length; p++) {
        const d = colorDistanceSq(current, palette[p]);
        if (d < minDist) {
          minDist = d;
          nearest = palette[p];
        }
      }

      data[i] = nearest.r;
      data[i + 1] = nearest.g;
      data[i + 2] = nearest.b;
      data[i + 3] = 255; // Hard opaque pixel edge
    }
  }
}
