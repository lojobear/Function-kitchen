/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient, KitchenAction, sanitizeName } from '../constants';
import { analyzeItem } from '../lib/tagging-engine';
import { ItemSprite } from './ItemSprite';

interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIngredient: (ingredient: Ingredient) => void;
  onAddMethod: (method: KitchenAction) => void;
}

const COMMON_EMOJIS = ['✨', '🔥', '💧', '⚡', '🌿', '💎', '🧪', '🔮', '⚙️', '🗡️', '🛡️', '🧬', '🌌', '🚀', '🍕', '🍜', '🔋', '🧱', '📜', '🍄'];
const INGREDIENT_CATEGORIES = ['Raw Material', 'Material', 'Element', 'Tech', 'Magic', 'Crafting', 'Food', 'Alchemy', 'Component', 'Custom'];
const METHOD_CATEGORIES = ['metallurgy', 'alchemy', 'tech', 'culinary', 'magic', 'crafting', 'processing', 'custom'];

export function AddCustomItemModal({
  isOpen,
  onClose,
  onAddIngredient,
  onAddMethod,
}: AddCustomItemModalProps) {
  const [tab, setTab] = useState<'ingredient' | 'method'>('ingredient');
  
  // Ingredient state
  const [ingName, setIngName] = useState('');
  const [ingEmoji, setIngEmoji] = useState('✨');
  const [ingCategory, setIngCategory] = useState('Custom');
  const [ingTags, setIngTags] = useState<string[]>([]);
  const [hasManuallySetEmoji, setHasManuallySetEmoji] = useState(false);
  const [hasManuallySetCategory, setHasManuallySetCategory] = useState(false);

  // Method state
  const [methodName, setMethodName] = useState('');
  const [methodEmoji, setMethodEmoji] = useState('⚡');
  const [methodCategory, setMethodCategory] = useState('custom');
  const [methodTags, setMethodTags] = useState<string[]>([]);
  const [hasManuallySetMethodEmoji, setHasManuallySetMethodEmoji] = useState(false);
  const [hasManuallySetMethodCategory, setHasManuallySetMethodCategory] = useState(false);

  // Real-time Semantic Analysis for Ingredients
  const ingAnalysis = useMemo(() => {
    return analyzeItem(ingName, {
      category: ingCategory,
      currentEmoji: ingEmoji,
      type: 'ingredient',
    });
  }, [ingName, ingCategory, ingEmoji]);

  // Real-time Semantic Analysis for Tools/Methods
  const methodAnalysis = useMemo(() => {
    return analyzeItem(methodName, {
      category: methodCategory,
      currentEmoji: methodEmoji,
      type: 'tool',
    });
  }, [methodName, methodCategory, methodEmoji]);

  // Auto-apply suggestions when typing if user hasn't locked in manual choices
  useEffect(() => {
    if (tab === 'ingredient' && ingName.trim().length >= 2) {
      if (!hasManuallySetEmoji && ingAnalysis.primaryEmoji) {
        setIngEmoji(ingAnalysis.primaryEmoji);
      }
      if (!hasManuallySetCategory && ingAnalysis.suggestedCategory) {
        setIngCategory(ingAnalysis.suggestedCategory);
      }
      setIngTags(ingAnalysis.suggestedTags);
    }
  }, [ingName, ingAnalysis, hasManuallySetEmoji, hasManuallySetCategory, tab]);

  useEffect(() => {
    if (tab === 'method' && methodName.trim().length >= 2) {
      if (!hasManuallySetMethodEmoji && methodAnalysis.primaryEmoji) {
        setMethodEmoji(methodAnalysis.primaryEmoji);
      }
      if (!hasManuallySetMethodCategory && methodAnalysis.suggestedCategory) {
        setMethodCategory(methodAnalysis.suggestedCategory);
      }
      setMethodTags(methodAnalysis.suggestedTags);
    }
  }, [methodName, methodAnalysis, hasManuallySetMethodEmoji, hasManuallySetMethodCategory, tab]);

  if (!isOpen) return null;

  const handleApplyIngredientAutoTags = () => {
    setIngEmoji(ingAnalysis.primaryEmoji);
    setIngCategory(ingAnalysis.suggestedCategory);
    setIngTags(ingAnalysis.suggestedTags);
  };

  const handleApplyMethodAutoTags = () => {
    setMethodEmoji(methodAnalysis.primaryEmoji);
    setMethodCategory(methodAnalysis.suggestedCategory);
    setMethodTags(methodAnalysis.suggestedTags);
  };

  const toggleIngTag = (tag: string) => {
    if (ingTags.includes(tag)) {
      setIngTags(ingTags.filter((t) => t !== tag));
    } else {
      setIngTags([...ingTags, tag]);
    }
  };

  const toggleMethodTag = (tag: string) => {
    if (methodTags.includes(tag)) {
      setMethodTags(methodTags.filter((t) => t !== tag));
    } else {
      setMethodTags([...methodTags, tag]);
    }
  };

  const handleCreateIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;

    onAddIngredient({
      name: ingName.trim().toLowerCase(),
      emoji: ingEmoji,
      category: ingCategory,
      tags: ingTags.length > 0 ? ingTags : ingAnalysis.suggestedTags,
    });

    setIngName('');
    setHasManuallySetEmoji(false);
    setHasManuallySetCategory(false);
    onClose();
  };

  const handleCreateMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodName.trim()) return;

    const sanitized = sanitizeName(methodName.trim());
    onAddMethod({
      name: sanitized,
      displayName: methodName.trim(),
      emoji: methodEmoji,
      category: methodCategory,
      tags: methodTags.length > 0 ? methodTags : methodAnalysis.suggestedTags,
    });

    setMethodName('');
    setHasManuallySetMethodEmoji(false);
    setHasManuallySetMethodCategory(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🛠️</span>
            <div>
              <h3 className="modal-title">Forge Catalog & Item Creator</h3>
              <p className="modal-subtitle" style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                Automated tagging & high-accuracy procedural pixel sprite synthesis
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="modal-tab-toggle">
          <button
            type="button"
            className={`tab-toggle-btn ${tab === 'ingredient' ? 'active' : ''}`}
            onClick={() => setTab('ingredient')}
          >
            🧪 New Ingredient / Material
          </button>
          <button
            type="button"
            className={`tab-toggle-btn ${tab === 'method' ? 'active' : ''}`}
            onClick={() => setTab('method')}
          >
            ⚡ New Crafting Method / Tool
          </button>
        </div>

        {tab === 'ingredient' ? (
          <form onSubmit={handleCreateIngredient} className="modal-form">
            {/* Live Sprite & Analysis Header */}
            <div className="modal-analysis-hero" style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              background: '#0d1321',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ flexShrink: 0 }}>
                <ItemSprite
                  name={ingName || 'New Material'}
                  emoji={ingEmoji}
                  category={ingCategory}
                  size="medium"
                  showRarityBadge={true}
                  rarity={ingAnalysis.raritySuggestion}
                />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.8px' }}>
                    ⚡ Automated Tagging Engine
                  </span>
                  {ingName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={handleApplyIngredientAutoTags}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid #38bdf8',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Apply All Suggestions
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '6px' }}>
                  Detected: <strong>{ingAnalysis.suggestedCategory}</strong> • Archetype: <code>{ingAnalysis.detectedArchetype}</code>
                </div>
                {/* Auto Suggested Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {ingAnalysis.suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleIngTag(tag)}
                      style={{
                        background: ingTags.includes(tag) ? '#38bdf8' : 'rgba(30, 41, 59, 0.8)',
                        color: ingTags.includes(tag) ? '#0f172a' : '#94a3b8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Click to toggle tag"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Ingredient / Material Name</label>
              <input
                type="text"
                value={ingName}
                onChange={(e) => setIngName(e.target.value)}
                placeholder="e.g. Adamantine Ingot, Celestial Dust, Dragon Scale, Truffle Sauce..."
                className="modal-text-input"
                autoFocus
                required
              />
            </div>

            <div className="form-field-group">
              <label className="form-label">
                Icon / Emoji 
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>
                  (Click any suggested emoji to apply)
                </span>
              </label>
              <div className="emoji-picker-row">
                <input
                  type="text"
                  value={ingEmoji}
                  onChange={(e) => {
                    setIngEmoji(e.target.value);
                    setHasManuallySetEmoji(true);
                  }}
                  className="emoji-input"
                  maxLength={4}
                />
                <div className="emoji-quick-picks">
                  {/* Top AI Suggested Emojis */}
                  {ingAnalysis.suggestedEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-pick-btn ${ingEmoji === em ? 'selected' : ''}`}
                      onClick={() => {
                        setIngEmoji(em);
                        setHasManuallySetEmoji(true);
                      }}
                      title="Suggested by analyzer"
                      style={{ borderColor: ingEmoji === em ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)' }}
                    >
                      {em}
                    </button>
                  ))}
                  {/* Common standard list */}
                  {COMMON_EMOJIS.slice(0, 8).map((em) => (
                    !ingAnalysis.suggestedEmojis.includes(em) && (
                      <button
                        key={em}
                        type="button"
                        className={`emoji-pick-btn ${ingEmoji === em ? 'selected' : ''}`}
                        onClick={() => {
                          setIngEmoji(em);
                          setHasManuallySetEmoji(true);
                        }}
                      >
                        {em}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Category</label>
              <select
                value={ingCategory}
                onChange={(e) => {
                  setIngCategory(e.target.value);
                  setHasManuallySetCategory(true);
                }}
                className="modal-select-input"
              >
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} {cat === ingAnalysis.suggestedCategory ? '★ (Auto-Suggested)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions-row">
              <button type="button" onClick={onClose} className="modal-cancel-btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!ingName.trim()}
                className="modal-submit-btn"
              >
                Save Ingredient ({ingTags.length} tags)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateMethod} className="modal-form">
            {/* Live Tool Sprite & Analysis Header */}
            <div className="modal-analysis-hero" style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              background: '#0d1321',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ flexShrink: 0 }}>
                <ItemSprite
                  name={methodName || 'New Technique'}
                  emoji={methodEmoji}
                  category={methodCategory}
                  size="medium"
                  showRarityBadge={true}
                  rarity="Rare"
                />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.8px' }}>
                    ⚡ Tool Function Analyzer
                  </span>
                  {methodName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={handleApplyMethodAutoTags}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Apply All Suggestions
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '6px' }}>
                  Category: <strong>{methodAnalysis.suggestedCategory.toUpperCase()}</strong> • Sprite: <code>{methodAnalysis.detectedArchetype}</code>
                </div>
                {/* Auto Suggested Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {methodAnalysis.suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMethodTag(tag)}
                      style={{
                        background: methodTags.includes(tag) ? '#f59e0b' : 'rgba(30, 41, 59, 0.8)',
                        color: methodTags.includes(tag) ? '#0f172a' : '#94a3b8',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Click to toggle tag"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Method / Technique Name</label>
              <input
                type="text"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
                placeholder="e.g. laser_solder, quantum_infuse, hyper_weld, cryo_distill..."
                className="modal-text-input"
                autoFocus
                required
              />
              <span className="field-hint">
                Callable function declaration: <code>{sanitizeName(methodName || 'action_name')}()</code>
              </span>
            </div>

            <div className="form-field-group">
              <label className="form-label">
                Icon / Emoji
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>
                  (Click any suggested emoji to apply)
                </span>
              </label>
              <div className="emoji-picker-row">
                <input
                  type="text"
                  value={methodEmoji}
                  onChange={(e) => {
                    setMethodEmoji(e.target.value);
                    setHasManuallySetMethodEmoji(true);
                  }}
                  className="emoji-input"
                  maxLength={4}
                />
                <div className="emoji-quick-picks">
                  {/* Top AI Suggested Emojis */}
                  {methodAnalysis.suggestedEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-pick-btn ${methodEmoji === em ? 'selected' : ''}`}
                      onClick={() => {
                        setMethodEmoji(em);
                        setHasManuallySetMethodEmoji(true);
                      }}
                      title="Suggested tool icon"
                      style={{ borderColor: methodEmoji === em ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)' }}
                    >
                      {em}
                    </button>
                  ))}
                  {COMMON_EMOJIS.slice(8, 16).map((em) => (
                    !methodAnalysis.suggestedEmojis.includes(em) && (
                      <button
                        key={em}
                        type="button"
                        className={`emoji-pick-btn ${methodEmoji === em ? 'selected' : ''}`}
                        onClick={() => {
                          setMethodEmoji(em);
                          setHasManuallySetMethodEmoji(true);
                        }}
                      >
                        {em}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Category</label>
              <select
                value={methodCategory}
                onChange={(e) => {
                  setMethodCategory(e.target.value);
                  setHasManuallySetMethodCategory(true);
                }}
                className="modal-select-input"
              >
                {METHOD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()} {cat === methodAnalysis.suggestedCategory ? '★ (Auto-Suggested)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions-row">
              <button type="button" onClick={onClose} className="modal-cancel-btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!methodName.trim()}
                className="modal-submit-btn"
              >
                Save Method Tool ({methodTags.length} tags)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
