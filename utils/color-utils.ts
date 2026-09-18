import { Rarity } from './item-utils';

// Color palette - centralized
export const RARITY_COLOR_MAP: Record<Rarity, string> = {
  'Legendary': '#f59e0b',
  'Epic': '#8b5cf6',
  'Rare': '#3b82f6',
  'Common': '#10b981',
} as const;

export function getRarityColor(rarity: string): string {
  return RARITY_COLOR_MAP[rarity as Rarity] || RARITY_COLOR_MAP.Common;
}

/**
 * Utility to convert hex to HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let h, s, l;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getRarityColorHSL(rarity: string) {
  const hex = getRarityColor(rarity);
  return hexToHSL(hex);
}

/**
 * Get contrasting text color (white/black) for a background
 */
export function getContrastTextColor(backgroundColor: string): '#000000' | '#ffffff' {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
