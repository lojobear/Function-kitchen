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
  onLoadRecipe?: (item: FinishedItem) => void;
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
  onLoadRecipe,
}: FinishedItemBoxProps) {
  const [showFullMetrics, setShowFullMetrics] = useState<boolean>(true);
  const [copiedRecipe, setCopiedRecipe] = useState<boolean>(false);
  const [showStagesList, setShowStagesList] = useState<boolean>(false);

  const handleCopyRecipe = async () => {
    if (!finishedItem) return;
    const text = `Crafted Item: ${finishedItem.name} (${finishedItem.rarity})\n` +
      `Description: ${finishedItem.description}\n` +
      `Category: ${finishedItem.category || 'Crafted'}\n` +
      `Tools Used (${finishedItem.toolsUsed.length}): ${finishedItem.toolsUsed.join(', ')}\n` +
      `Materials (${finishedItem.ingredientsUsed.length}): ${finishedItem.ingredientsUsed.join(', ')}\n` +
      (finishedItem.ingredientHistory && finishedItem.ingredientHistory.length > 0 ? `Component History: ${finishedItem.ingredientHistory.join(' -> ')}\n` : '');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedRecipe(true);
      setTimeout(() => setCopiedRecipe(false), 2500);
    } catch {
      // Fallback if clipboard API not permitted in iframe
    }
  };
  if (isCrafting) {
    const progressPercent = progress.total
      ? Math.min(100, Math.round((progress.step / progress.total) * 100))
      : progress.phase === 'planning'
        ? 8
        : Math.min(94, Math.round(15 + (1 - Math.exp(-progress.step / 6)) * 75));
    const phaseLabel = progress.phase === 'planning'
      ? 'Formulating logical recipe'
      : progress.phase === 'processing'
        ? `Stage ${progress.step} in progress`
        : 'Revealing newly fabricated component';

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
                <>Executing tool: <code className="active-action-code">{activeAction}()</code></>
              ) : (
                'Processing materials and formulating stages...'
              )}
            </div>
          </div>
          <div className="craft-progress-panel" aria-label="Crafting progress">
            <div className="craft-progress-copy">
              <span>
                {progress.step > 0
                  ? (progress.total ? `Stage ${progress.step} of ${progress.total}` : `Stage ${progress.step} • Formulating thoroughly`)
                  : 'Formulation setup'}
              </span>
              <span>{progress.phase === 'revealing' ? 'Component forged' : 'Active transformation...'}</span>
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
            Gemini 3.8 Flash will sequence function calls through a 10–15 stage progression and generate the finished product with its matching 64x64 sprite right here!
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
            description={finishedItem.description}
            ingredientHistory={finishedItem.ingredientsUsed}
            processHistory={finishedItem.toolsUsed}
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

          <div className="finished-item-actions-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            <button
              type="button"
              onClick={handleCopyRecipe}
              style={{
                background: copiedRecipe ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                border: copiedRecipe ? '1px solid #22c55e' : '1px solid rgba(148, 163, 184, 0.25)',
                color: copiedRecipe ? '#4ade80' : '#cbd5e1',
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
              title="Copy crafting formulation summary to clipboard"
            >
              <span>{copiedRecipe ? '✅ Copied Formulation!' : '📋 Copy Formulation'}</span>
            </button>
            {onLoadRecipe && (
              <button
                type="button"
                onClick={() => onLoadRecipe(finishedItem)}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid #f59e0b',
                  color: '#fbbf24',
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
                title="Load materials and goal back onto crafting bench"
              >
                <span>🔨 Load to Bench</span>
              </button>
            )}
            {finishedItem.processHistory && finishedItem.processHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStagesList(!showStagesList)}
                style={{
                  background: showStagesList ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: '#c084fc',
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
                <span>{showStagesList ? '🔽 Hide Pipeline' : `📜 View ${finishedItem.processHistory.length} Stages`}</span>
              </button>
            )}
          </div>

          {showStagesList && finishedItem.processHistory && finishedItem.processHistory.length > 0 && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Multi-Stage Pipeline Execution ({finishedItem.processHistory.length} Steps):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {finishedItem.processHistory.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      style={{
                        fontSize: '12px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}. {step}()
                    </span>
                    {idx < finishedItem.processHistory!.length - 1 && (
                      <span style={{ color: '#64748b', fontSize: '11px' }}>➔</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
