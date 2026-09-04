/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ItemSprite } from './ItemSprite';
import { getItemColor, RARITY_PALETTES } from '../lib/sprite-engine';
import { FinishedItem } from '../constants';

interface SpriteInspectorModalProps {
  item: FinishedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUploader?: (itemName: string) => void;
}

export function SpriteInspectorModal({
  item,
  isOpen,
  onClose,
  onOpenUploader,
}: SpriteInspectorModalProps) {
  const [activeRarity, setActiveRarity] = useState<'Common' | 'Rare' | 'Epic' | 'Legendary'>(
    item?.rarity || 'Epic'
  );
  const [customColor, setCustomColor] = useState<string>(item?.color || '#3b82f6');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const handleDownloadPng = () => {
    // Locate the canvas inside the modal sprite box
    const canvas = document.querySelector('.inspector-sprite-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${item.name.toLowerCase().replace(/\s+/g, '_')}_sprite.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyDetails = () => {
    const text = `📦 ${item.name} (${activeRarity})\n${item.description}\nTools: ${item.toolsUsed?.join(', ') || 'None'}\nMaterials: ${item.ingredientsUsed?.join(', ') || 'None'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sprite-inspector-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🎨</span>
            <h3 className="modal-title">Sprite Forge Inspector</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="inspector-content-layout">
          <div className="inspector-sprite-column">
            <div className="inspector-sprite-wrapper">
              <ItemSprite
                name={item.name}
                emoji={item.emoji}
                category={item.category}
                color={customColor}
                rarity={activeRarity}
                size="large"
                showRarityBadge={true}
              />
            </div>

            <button onClick={handleDownloadPng} className="download-sprite-btn">
              💾 Download Sprite (PNG)
            </button>

            {onOpenUploader && (
              <button
                type="button"
                onClick={() => {
                  onOpenUploader(item.name);
                }}
                className="upload-custom-sprite-btn"
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1px solid #38bdf8',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
                }}
              >
                <span>🎨 Upload Custom Sprite</span>
              </button>
            )}
          </div>

          <div className="inspector-meta-column">
            <div className="inspector-item-header">
              <h2 className="inspector-item-name">{item.name}</h2>
              <span className="inspector-category-badge">{item.category}</span>
            </div>

            <p className="inspector-desc">{item.description}</p>

            <div className="inspector-controls-block">
              <label className="inspector-label">Rarity Tier & Aura</label>
              <div className="rarity-selector-chips">
                {(['Common', 'Rare', 'Epic', 'Legendary'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`rarity-chip-btn ${activeRarity === r ? 'active' : ''} rarity-${r.toLowerCase()}`}
                    onClick={() => setActiveRarity(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="inspector-controls-block">
              <label className="inspector-label">Aura Glow & Accent Color</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="color-wheel-input"
                />
                <div className="preset-colors-row">
                  {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      className="preset-color-dot"
                      style={{ background: col }}
                      onClick={() => setCustomColor(col)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="recipe-lineage-box">
              <span className="lineage-title">Synthesis Lineage:</span>
              <div className="lineage-tools">
                <strong>Tools Used:</strong> {item.toolsUsed?.length ? item.toolsUsed.join(' ➔ ') : 'Direct Synthesis'}
              </div>
              <div className="lineage-ingredients">
                <strong>Materials:</strong> {item.ingredientsUsed?.length ? item.ingredientsUsed.join(', ') : 'Primal Elements'}
              </div>
            </div>

            <button onClick={handleCopyDetails} className="copy-details-btn">
              {copied ? '✓ Copied Details!' : '📋 Copy Item Specs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
