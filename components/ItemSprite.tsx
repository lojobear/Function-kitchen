/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { drawProceduralSprite, getItemColor, RARITY_PALETTES, SpriteConfig } from '../lib/sprite-engine';
import { enqueueBackgroundSpriteGeneration, getCachedSprite, onSpriteUpdated } from '../lib/background-sprite-painter';
import { getCustomSprite, subscribeCustomSprites, CustomSpriteRecord } from '../lib/custom-sprite-service';

function drawGenerationPlaceholder(canvas: HTMLCanvasElement, size: number, color: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  const background = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size * 0.72);
  background.addColorStop(0, '#172033');
  background.addColorStop(1, '#050810');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  const unit = Math.max(2, Math.floor(size / 16));
  const gridStart = Math.floor((size - unit * 12) / 2);
  ctx.fillStyle = `${color}20`;
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(gridStart + x * unit, gridStart + y * unit, unit - 1, unit - 1);
    }
  }

  ctx.strokeStyle = `${color}a8`;
  ctx.lineWidth = Math.max(1, Math.floor(size / 70));
  ctx.setLineDash([unit * 1.5, unit]);
  ctx.strokeRect(gridStart, gridStart, unit * 12, unit * 12);
  ctx.setLineDash([]);
}

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
  onUploadSprite?: () => void;
  showCustomBadge?: boolean;
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
  onUploadSprite,
  showCustomBadge = true,
}: ItemSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [spriteRevision, setSpriteRevision] = useState(0);
  const [isGenerating, setIsGenerating] = useState(() => !getCachedSprite(name));
  const [customSprite, setCustomSprite] = useState<CustomSpriteRecord | undefined>(() => getCustomSprite(name));

  // Size mapping
  const pxSize = size === 'large' ? 140 : size === 'medium' ? 84 : size === 'small' ? 48 : 36;
  const computedColor = color || getItemColor({ name, category, color, rarity });
  const palette = RARITY_PALETTES[rarity] || RARITY_PALETTES.Common;

  // Subscribe to real-time custom sprites
  useEffect(() => {
    setCustomSprite(getCustomSprite(name));
    const unsubscribe = subscribeCustomSprites(() => {
      setCustomSprite(getCustomSprite(name));
    });
    return unsubscribe;
  }, [name]);

  // Enqueue background generation immediately (non-blocking) and subscribe to updates
  useEffect(() => {
    setIsGenerating(!getCachedSprite(name));

    const unsubscribe = onSpriteUpdated((updatedName) => {
      if (updatedName.toLowerCase().trim() === name.toLowerCase().trim()) {
        setIsGenerating(false);
        setSpriteRevision((prev) => prev + 1);
      }
    });

    if (name && name.trim()) {
      enqueueBackgroundSpriteGeneration(name, category, emoji, rarity);
    }

    return unsubscribe;
  }, [name, category, emoji, rarity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If there is a custom uploaded sprite from cloud storage, render it!
    if (customSprite?.imageUrl) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = pxSize;
      canvas.height = pxSize;

      // Dark radial background
      const bgGrad = ctx.createRadialGradient(
        pxSize / 2, 1, pxSize / 2,
        pxSize / 2, pxSize / 2, pxSize * 0.7
      );
      bgGrad.addColorStop(0, '#151d2f');
      bgGrad.addColorStop(0.7, '#0a0e18');
      bgGrad.addColorStop(1, '#03060c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, pxSize, pxSize);

      // Halo glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(pxSize / 2, pxSize / 2, pxSize * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = `${computedColor}2b`;
      ctx.shadowColor = computedColor;
      ctx.shadowBlur = pxSize >= 80 ? 16 : 8;
      ctx.fill();
      ctx.restore();

      // Render custom image pixelated and fitted
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.imageSmoothingEnabled = false;
        const pad = Math.floor(pxSize * 0.08);
        const drawArea = pxSize - pad * 2;
        const scale = Math.min(drawArea / img.width, drawArea / img.height);
        const dw = Math.floor(img.width * scale);
        const dh = Math.floor(img.height * scale);
        const dx = Math.floor((pxSize - dw) / 2);
        const dy = Math.floor((pxSize - dh) / 2);
        ctx.drawImage(img, dx, dy, dw, dh);
      };
      img.src = customSprite.imageUrl;
      return;
    }

    if (!getCachedSprite(name)) {
      drawGenerationPlaceholder(canvas, pxSize, computedColor);
      return;
    }

    const spriteConfig: SpriteConfig = {
      name,
      emoji,
      category,
      color: computedColor,
      rarity,
    };

    drawProceduralSprite(canvas, spriteConfig, pxSize);
  }, [name, emoji, category, computedColor, rarity, pxSize, customSprite, spriteRevision]);

  return (
    <div
      className={`item-sprite-box sprite-${size} ${isGenerating && !customSprite ? 'sprite-generating' : ''} ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
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
      title={`${name} (${rarity})${customSprite ? ' [Custom Community Sprite]' : ''}`}
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

      {isGenerating && !customSprite && (
        <div className={`sprite-generation-overlay ${size === 'thumb' || size === 'small' ? 'compact' : ''}`}>
          <span className="sprite-generation-pixels" aria-hidden="true">
            <i /><i /><i />
          </span>
          {size !== 'thumb' && size !== 'small' && (
            <>
              <span className="sprite-generation-label">Generating</span>
              <span className="sprite-generation-resolution">64 × 64</span>
            </>
          )}
        </div>
      )}

      {/* Custom Community Sprite indicator */}
      {customSprite && showCustomBadge && size !== 'thumb' && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'rgba(56, 189, 248, 0.9)',
            color: '#040d1a',
            fontSize: size === 'large' ? '9px' : '8px',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '4px',
            letterSpacing: '0.4px',
            pointerEvents: 'none',
            boxShadow: '0 0 6px rgba(56, 189, 248, 0.6)',
          }}
          title={`Custom sprite uploaded by ${customSprite.authorName || 'Artisan'}`}
        >
          CUSTOM
        </div>
      )}

      {/* Quick Upload Button on hover for large/medium sprites */}
      {onUploadSprite && hovered && (size === 'large' || size === 'medium') && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUploadSprite();
          }}
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            zIndex: 5,
          }}
          title="Upload or replace sprite"
        >
          📷 Edit
        </button>
      )}

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
