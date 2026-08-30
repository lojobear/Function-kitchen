/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FinishedItem } from '../constants';
import { ItemSprite } from './ItemSprite';

interface ShowcaseGalleryProps {
  items: FinishedItem[];
  selectedItemId: string | null;
  onSelectItem: (item: FinishedItem) => void;
  onInspectItem?: (item: FinishedItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export function ShowcaseGallery({
  items,
  selectedItemId,
  onSelectItem,
  onInspectItem,
  onDeleteItem,
}: ShowcaseGalleryProps) {
  if (items.length === 0) return null;

  return (
    <section className="kitchen-section showcase-section">
      <div className="section-header">
        <div className="section-header-text">
          <h2 className="section-title">🏆 Crafted Showcase Vault</h2>
          <p className="section-subtitle">Finished items with procedural pixel sprites saved to your inventory</p>
        </div>
        <span className="section-count">count: {items.length}</span>
      </div>

      <div className="showcase-grid">
        {items.map((item) => {
          const rarityColor = item.color || (
            item.rarity === 'Legendary' ? '#f59e0b' :
            item.rarity === 'Epic' ? '#8b5cf6' :
            item.rarity === 'Rare' ? '#3b82f6' : '#10b981'
          );
          const isSelected = item.id === selectedItemId;

          return (
            <div
              key={item.id}
              className={`showcase-tile ${isSelected ? 'selected' : ''}`}
              style={{ '--tile-accent': rarityColor } as React.CSSProperties}
            >
              <div
                className="showcase-tile-clickable"
                onClick={() => onSelectItem(item)}
                title={`Click to view ${item.name}`}
              >
                <ItemSprite
                  name={item.name}
                  emoji={item.emoji}
                  color={rarityColor}
                  rarity={item.rarity}
                  size="small"
                />
                <div className="showcase-info">
                  <span className="showcase-name">{item.name}</span>
                  <span className={`showcase-rarity rarity-${item.rarity.toLowerCase()}`}>
                    {item.rarity}
                  </span>
                </div>
              </div>

              <div className="showcase-tile-actions">
                {onInspectItem && (
                  <button
                    type="button"
                    className="tile-action-btn inspect-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectItem(item);
                    }}
                    title="Inspect & Download Sprite"
                  >
                    🎨
                  </button>
                )}
                {onDeleteItem && (
                  <button
                    type="button"
                    className="tile-action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    title="Remove from vault"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
