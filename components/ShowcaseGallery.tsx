/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FinishedItem } from '../constants';
import { ItemSprite } from './ItemSprite';

interface ShowcaseGalleryProps {
  items: FinishedItem[];
  selectedItemId: string | null;
  onSelectItem: (item: FinishedItem) => void;
  onInspectItem?: (item: FinishedItem) => void;
  onUploadSprite?: (item: FinishedItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export function ShowcaseGallery({
  items,
  selectedItemId,
  onSelectItem,
  onInspectItem,
  onUploadSprite,
  onDeleteItem,
}: ShowcaseGalleryProps) {
  const [filterRarity, setFilterRarity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesRarity = filterRarity === 'All' || item.rarity === filterRarity;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.toolsUsed && item.toolsUsed.some(t => t.toLowerCase().includes(q))) ||
        (item.ingredientsUsed && item.ingredientsUsed.some(i => i.toLowerCase().includes(q)));
      return matchesRarity && matchesQuery;
    });
  }, [items, filterRarity, searchQuery]);

  if (items.length === 0) return null;

  const rarities = ['All', 'Legendary', 'Epic', 'Rare', 'Common'];

  return (
    <section className="kitchen-section showcase-section">
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="section-header-text">
          <h2 className="section-title">🏆 Crafted Showcase Vault</h2>
          <p className="section-subtitle">Finished items with 64x64 procedural pixel sprites saved to your inventory</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault..."
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#f8fafc',
              outline: 'none',
              width: '130px',
            }}
          />
          <span className="section-count">{filteredItems.length} of {items.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {rarities.map((r) => {
          const count = r === 'All' ? items.length : items.filter(i => i.rarity === r).length;
          const isActive = filterRarity === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRarity(r)}
              style={{
                background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                border: isActive ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                color: isActive ? '#38bdf8' : '#94a3b8',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {r} ({count})
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No items match the selected filter.
        </div>
      ) : (
        <div className="showcase-grid">
          {filteredItems.map((item) => {
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
                  description={item.description}
                  ingredientHistory={item.ingredientsUsed}
                  processHistory={item.toolsUsed}
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
                {onUploadSprite && (
                  <button
                    type="button"
                    className="tile-action-btn upload-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadSprite(item);
                    }}
                    title="Upload Custom Sprite Replacement (Saves for Everyone)"
                    style={{ color: '#38bdf8' }}
                  >
                    📷
                  </button>
                )}
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
      )}
    </section>
  );
}
