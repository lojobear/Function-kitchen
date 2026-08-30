/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { drawProceduralSprite, getItemColor, RARITY_PALETTES, SpriteConfig } from '../lib/sprite-engine';
import { enqueueBackgroundSpriteGeneration, onSpriteUpdated } from '../lib/background-sprite-painter';

export interface ItemSpriteProps {
  name: string;
  emoji: string;
  category?: string;
  color?: string;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  size?: 'large' | 'medium' | 'small' | 'thumb';
  className?: string;
  showRarityBadge?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export function ItemSprite({
  name,
  emoji,
  category,
  color,
  rarity = 'Common',
  size = 'large',
  className = '',
  showRarityBadge = false,
  interactive = false,
  onClick,
}: ItemSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [, setRenderTrigger] = useState(0);

  // Size mapping
  const pxSize = size === 'large' ? 140 : size === 'medium' ? 84 : size === 'small' ? 48 : 36;
  const computedColor = color || getItemColor({ name, category, color, rarity });
  const palette = RARITY_PALETTES[rarity] || RARITY_PALETTES.Common;

  // Enqueue background generation immediately (non-blocking) and subscribe to updates
  useEffect(() => {
    if (name && name.trim()) {
      enqueueBackgroundSpriteGeneration(name, category, emoji, rarity);
    }

    const unsubscribe = onSpriteUpdated((updatedName) => {
      if (updatedName.toLowerCase().trim() === name.toLowerCase().trim()) {
        setRenderTrigger((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [name, category, emoji, rarity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const spriteConfig: SpriteConfig = {
      name,
      emoji,
      category,
      color: computedColor,
      rarity,
    };

    drawProceduralSprite(canvas, spriteConfig, pxSize);
  }, [name, emoji, category, computedColor, rarity, pxSize]);

  return (
    <div
      className={`item-sprite-box sprite-${size} ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      style={{
        width: `${pxSize}px`,
        height: `${pxSize}px`,
        borderColor: computedColor,
        boxShadow: hovered ? `0 0 16px ${computedColor}80` : `0 0 8px ${computedColor}33`,
        position: 'relative',
        borderRadius: size === 'large' ? '12px' : '8px',
        overflow: 'hidden',
        background: '#090d16',
      }}
      title={`${name} (${rarity})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${pxSize}px`,
          height: `${pxSize}px`,
          display: 'block',
        }}
      />

      {showRarityBadge && size === 'large' && (
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${palette.border}`,
            color: palette.glow,
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            padding: '2px 8px',
            borderRadius: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {rarity}
        </div>
      )}
    </div>
  );
}
