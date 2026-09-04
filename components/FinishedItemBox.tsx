/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinishedItem } from '../constants';
import { ItemSprite } from './ItemSprite';
import { calculateEfficiency, EfficiencyMetricsChart } from './EfficiencyMetricsChart';

interface FinishedItemBoxProps {
  finishedItem: FinishedItem | null;
  isCrafting: boolean;
  targetGoal: string;
  activeAction: string | null;
  progress: {
    step: number;
    total: number | null;
    phase: 'planning' | 'processing' | 'revealing';
  };
  showcaseCount: number;
  onClearItem: () => void;
  onInspectSprite?: (item: FinishedItem) => void;
  onUploadSprite?: (item: FinishedItem) => void;
}

export function FinishedItemBox({
  finishedItem,
  isCrafting,
  targetGoal,
  activeAction,
  progress,
  showcaseCount,
  onClearItem,
  onInspectSprite,
  onUploadSprite,
}: FinishedItemBoxProps) {
  const [showFullMetrics, setShowFullMetrics] = useState<boolean>(true);
  if (isCrafting) {
    const progressPercent = progress.total
      ? Math.min(100, Math.round((progress.step / progress.total) * 100))
      : progress.phase === 'planning'
        ? 8
        : Math.min(88, 18 + progress.step * 13);
    const phaseLabel = progress.phase === 'planning'
      ? 'Planning a logical recipe'
      : progress.phase === 'processing'
        ? 'Transforming materials'
        : 'Revealing the new component';

    return (
      <div className="finished-box-container crafting-active">
        <div className="finished-box-header">
          <span className="box-badge">⚡ SYNTHESIS IN PROGRESS</span>
          <span className="box-goal-label">Goal: {targetGoal || 'Custom Request'}</span>
        </div>

        <div className="synthesis-chamber">
          <div className="chamber-glow-ring"></div>
          <div className="chamber-inner">
            <span className="chamber-spinner">⚙️</span>
            <span className="chamber-emoji-pulse">🔮</span>
          </div>
          <div className="chamber-status">
            <div className="status-title" aria-live="polite">{phaseLabel}</div>
            <div className="status-sub" aria-live="polite">
              {activeAction ? (
                <>Applying tool: <code className="active-action-code">{activeAction}()</code></>
              ) : (
                'Choosing materials and ordering the stages...'
              )}
            </div>
          </div>
          <div className="craft-progress-panel" aria-label="Crafting progress">
            <div className="craft-progress-copy">
              <span>
                {progress.step > 0 ? `Stage ${progress.step}${progress.total ? ` of ${progress.total}` : ''}` : 'Recipe setup'}
              </span>
              <span>{progress.phase === 'revealing' ? 'New sprite ready' : 'Working...'}</span>
            </div>
            <div
              className={`craft-progress-track ${progress.total ? '' : 'indeterminate'}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <span className="craft-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="craft-progress-note">
              Each component stays on screen long enough to inspect, with a fresh procedural sprite generated when it appears.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!finishedItem) {
    return (
      <div className="finished-box-container idle">
        <div className="finished-box-header">
          <span className="box-badge">📦 FINISHED ITEM VAULT</span>
          <span className="box-sub">Showcase Vault ({showcaseCount} items created)</span>
        </div>
        <div className="vault-placeholder">
          <div className="placeholder-icon">🔮</div>
          <h3 className="placeholder-title">Ready to Create Anything</h3>
          <p className="placeholder-text">
            Type any item, food, weapon, or gadget in the bar above and click <strong>"Synthesize & Mix"</strong>. 
            Gemini 3 Flash will sequence function calls and generate the finished product with its matching sprite right here!
          </p>
        </div>
      </div>
    );
  }

  const rarityColor = finishedItem.color || (
    finishedItem.rarity === 'Legendary' ? '#f59e0b' :
    finishedItem.rarity === 'Epic' ? '#8b5cf6' :
    finishedItem.rarity === 'Rare' ? '#3b82f6' : '#10b981'
  );

  const efficiency = calculateEfficiency(
    finishedItem.toolsUsed,
    finishedItem.ingredientsUsed,
    finishedItem.rarity,
    rarityColor
  );

  return (
    <div className="finished-box-container complete" style={{ '--item-theme-color': rarityColor } as React.CSSProperties}>
      <div className="finished-box-header">
        <div className="header-badges-left">
          <span className={`rarity-tag rarity-${finishedItem.rarity.toLowerCase()}`}>
            ✨ {finishedItem.rarity.toUpperCase()} CREATION
          </span>
          <div
            className="efficiency-header-pill"
            title={`Logical Multi-Stage Crafting: ${efficiency.actualSteps} deliberate fabrication stages executed (${efficiency.materialsCount} materials processed)`}
            onClick={() => setShowFullMetrics(!showFullMetrics)}
          >
            <span className="efficiency-bolt">⚒️</span>
            <span className="efficiency-score-value">{efficiency.actualSteps} Crafting Stages</span>
            <span className="efficiency-steps-saved-tag">{efficiency.grade}</span>
          </div>
        </div>

        <div className="header-actions-right">
          <button
            type="button"
            className={`toggle-metrics-btn ${showFullMetrics ? 'active' : ''}`}
            onClick={() => setShowFullMetrics(!showFullMetrics)}
            title="Toggle D3 Performance Metrics & Comparison Charts"
          >
            <span>📊 {showFullMetrics ? 'Hide D3 Charts' : 'D3 Performance'}</span>
          </button>
          <button className="clear-box-btn" onClick={onClearItem} title="Clear Box">
            ✕
          </button>
        </div>
      </div>

      <div className="finished-item-card">
        {/* Sprite Display Frame */}
        <div
          className="sprite-frame-wrapper"
          onClick={() => onInspectSprite && onInspectSprite(finishedItem)}
          style={{ cursor: onInspectSprite ? 'pointer' : 'default' }}
          title="Click to inspect or download sprite"
        >
          <div className="sprite-frame-aura" style={{ background: `radial-gradient(circle, ${rarityColor}88 0%, transparent 70%)` }}></div>
          <ItemSprite
            name={finishedItem.name}
            emoji={finishedItem.emoji}
            color={rarityColor}
            rarity={finishedItem.rarity}
            size="large"
            showRarityBadge={true}
          />
          <span className="category-pill">{finishedItem.category}</span>
        </div>

        {/* Item Metadata & Lore */}
        <div className="item-details">
          <div className="item-title-row">
            <h2 className="item-title">{finishedItem.name}</h2>
            <div className="item-mini-efficiency-badge">
              <span>{efficiency.speedup}x Faster Path</span>
            </div>
          </div>
          <p className="item-description">{finishedItem.description}</p>

          {/* Automated Tags */}
          {finishedItem.tags && finishedItem.tags.length > 0 && (
            <div className="item-tags-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0 12px 0' }}>
              {finishedItem.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.3px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="item-recipe-stats">
            <div className="stat-group">
              <span className="stat-label">🛠️ Tools Used ({finishedItem.toolsUsed.length}):</span>
              <div className="stat-chips">
                {finishedItem.toolsUsed.map((tool, idx) => (
                  <span key={idx} className="tool-chip">
                    {tool}()
                  </span>
                ))}
              </div>
            </div>

            <div className="stat-group">
              <span className="stat-label">🧪 Materials Combined ({finishedItem.ingredientsUsed.length}):</span>
              <div className="stat-chips">
                {finishedItem.ingredientsUsed.map((ing, idx) => (
                  <span key={idx} className="material-chip">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* D3 Performance Metrics & Comparison Charts */}
          {showFullMetrics ? (
            <div className="efficiency-section-wrapper">
              <EfficiencyMetricsChart data={efficiency} compact={false} />
            </div>
          ) : (
            <div
              className="efficiency-compact-wrapper"
              onClick={() => setShowFullMetrics(true)}
              title="Click to expand D3 performance charts"
            >
              <EfficiencyMetricsChart data={efficiency} compact={true} />
            </div>
          )}

          <div className="finished-item-actions-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onInspectSprite && (
              <button
                type="button"
                className="inspect-sprite-action-btn"
                onClick={() => onInspectSprite(finishedItem)}
              >
                <span>🎨 Inspect & Download</span>
              </button>
            )}
            {onUploadSprite && (
              <button
                type="button"
                className="upload-sprite-btn-action"
                onClick={() => onUploadSprite(finishedItem)}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>📷 Upload Custom Sprite</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
