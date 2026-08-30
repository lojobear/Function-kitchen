/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Function Call Crafting Forge
 * Gemini 3.7 Flash controls 100+ tools to synthesize any requested item.
 * Features Google Auth persistent cloud storage, procedural item sprites, and live synthesis.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { GeminiAPIProvider, useGeminiAPIContext } from "./gemini/contexts/GeminiAPIContext";
import GeminiDebug from "./gemini/components/GeminiDebug";
import { Content, FunctionCall } from '@google/genai';
import { FinishedItemBox } from './components/FinishedItemBox';
import { ShowcaseGallery } from './components/ShowcaseGallery';
import { ItemSprite } from './components/ItemSprite';
import { AuthHeader } from './components/AuthHeader';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { SpriteInspectorModal } from './components/SpriteInspectorModal';
import { useAuthAndForgeSync } from './hooks/use-auth-sync';
import { analyzeItem } from './lib/tagging-engine';
import { getItemColor } from './lib/sprite-engine';
import { enqueueBackgroundSpriteGeneration } from './lib/background-sprite-painter';

import {
  Ingredient,
  KitchenAction,
  TimelineEntry,
  CombinationResult,
  FinishedItem,
  PRESET_IDEAS,
  COOKING_ACTIONS,
  STARTING_INGREDIENTS,
  PRESELECTED_INGREDIENTS,
  COMBINATION_SYSTEM_INSTRUCTION,
  COMBINATION_RESPONSE_SCHEMA,
  generateCraftingTools,
  buildCraftingAgentSystemInstruction,
  sanitizeName,
} from './constants';

// ============================================================================
// Ingredient Normalization & Helper Functions
// ============================================================================

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findIngredientInInventory(name: string, inventory: Ingredient[]): Ingredient | null {
  const normalizedSearch = normalizeIngredientName(name);
  return inventory.find(ing => normalizeIngredientName(ing.name) === normalizedSearch) || null;
}

function isDuplicateIngredient(name: string, inventory: Ingredient[]): boolean {
  return findIngredientInInventory(name, inventory) !== null;
}

function getFallbackEmoji(itemName: string): string {
  const analysis = analyzeItem(itemName);
  return analysis.primaryEmoji;
}

function getRarityFromName(name: string): 'Common' | 'Rare' | 'Epic' | 'Legendary' {
  const analysis = analyzeItem(name);
  return analysis.raritySuggestion;
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Legendary': return '#f59e0b';
    case 'Epic': return '#8b5cf6';
    case 'Rare': return '#3b82f6';
    default: return '#10b981';
  }
}

function getCategoryFromName(name: string): string {
  const analysis = analyzeItem(name);
  return analysis.suggestedCategory;
}

// ============================================================================
// Ingredient & Action Tiles
// ============================================================================

interface IngredientTileProps {
  ingredient: Ingredient;
  isSelected: boolean;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function IngredientTile({ ingredient, isSelected, isActive, isDisabled, onClick }: IngredientTileProps) {
  return (
    <button
      className={`ingredient-tile ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`${ingredient.name} (${ingredient.category || 'Material'})`}
      data-ingredient={ingredient.name}
      disabled={isDisabled}
    >
      <span className="tile-sprite-thumb">
        <ItemSprite
          name={ingredient.name}
          emoji={ingredient.emoji}
          category={ingredient.category}
          size="thumb"
        />
      </span>
      <span className="name">{ingredient.name}</span>
    </button>
  );
}

interface ActionTileProps {
  action: KitchenAction;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function ActionTile({ action, isActive, isDisabled, onClick }: ActionTileProps) {
  return (
    <button
      className={`action-tile ${isActive ? 'active' : ''}`}
      onClick={onClick}
      disabled={isDisabled}
      title={action.displayName}
      data-action={action.name}
    >
      <span className="tile-sprite-thumb">
        <ItemSprite
          name={action.displayName || action.name}
          emoji={action.emoji}
          category={action.category || 'tool'}
          size="thumb"
        />
      </span>
      <span className="name">{action.name}()</span>
    </button>
  );
}

// ============================================================================
// Timeline Item Component
// ============================================================================

interface TimelineItemProps {
  entry: TimelineEntry;
}

function TimelineItem({ entry }: TimelineItemProps) {
  const hasAction = entry.action && entry.ingredients;
  const hasText = entry.text;
  const isLoading = hasAction && entry.result === null;

  if (hasText && !hasAction) {
    return (
      <div className="timeline-item timeline-text-only">
        <div className="timeline-text-content">{entry.text}</div>
      </div>
    );
  }

  return (
    <div className={`timeline-item ${isLoading ? 'loading' : ''}`}>
      {hasText && <div className="timeline-text-content">{entry.text}</div>}
      {hasAction && (
        <>
          <div className="timeline-action">
            <span className="action-name">{entry.action}(</span>
            <span className="action-args">{entry.ingredients?.join(', ')}</span>
            <span className="action-name">)</span>
          </div>
          <div className="timeline-result">
            <span className="timeline-result-arrow">↳</span>
            {isLoading ? (
              <span className="spinner">⏳</span>
            ) : (
              <div className="timeline-result-sprite-row">
                <ItemSprite
                  name={entry.result!.name}
                  emoji={entry.result!.emoji}
                  size="thumb"
                />
                <span className="result-name">{entry.result!.name}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Creator Input Bar Component
// ============================================================================

interface CreatorSectionProps {
  inputGoal: string;
  setInputGoal: (val: string) => void;
  onSynthesize: (goal: string) => void;
  isCrafting: boolean;
  onOpenAddModal: () => void;
}

function CreatorSection({ inputGoal, setInputGoal, onSynthesize, isCrafting, onOpenAddModal }: CreatorSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputGoal.trim() && !isCrafting) {
      e.preventDefault();
      onSynthesize(inputGoal.trim());
    }
  };

  return (
    <section className="creator-section">
      <div className="creator-input-row">
        <input
          type="text"
          className="creator-input-field"
          placeholder="Input anything to create... e.g. Laser Sword, Magic Potion, Cybernetic Watch, Ramen"
          value={inputGoal}
          onChange={(e) => setInputGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCrafting}
        />
        <button
          className="synthesize-btn"
          onClick={() => inputGoal.trim() && onSynthesize(inputGoal.trim())}
          disabled={!inputGoal.trim() || isCrafting}
        >
          {isCrafting ? '⚡ Crafting...' : '✨ Synthesize & Mix'}
        </button>
        <button
          type="button"
          className="add-custom-btn catalog-btn"
          onClick={onOpenAddModal}
          title="Add a custom ingredient, material, or tool method to your catalog"
        >
          + Add to Catalog
        </button>
      </div>

      <div className="preset-ideas-row">
        <span className="preset-label">Preset Ideas:</span>
        <div className="preset-chips">
          {PRESET_IDEAS.map((preset) => (
            <button
              key={preset.name}
              className="preset-chip"
              onClick={() => {
                setInputGoal(preset.name);
                if (!isCrafting) {
                  onSynthesize(preset.name);
                }
              }}
              disabled={isCrafting}
            >
              <span>{preset.emoji}</span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Combination Agent Component (Synthesis Engine)
// ============================================================================

interface CombinationAgentProps {
  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  timeline: TimelineEntry[];
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  selectedIngredients: Set<string>;
  setSelectedIngredients: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeAction: string | null;
  setActiveAction: React.Dispatch<React.SetStateAction<string | null>>;
  actionTriggerCount: number;
  onExecuteActionRef: React.MutableRefObject<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>;
  onFinishItem: (name: string, desc?: string, rarity?: string) => void;
  onOpenCombinationAgent: () => void;
  onOpenCookingAgent: () => void;
  onOpenVerificationAgent: () => void;
  isCrafting: boolean;
  isCookingAgentOpen: boolean;
  isAlchemyAgentOpen: boolean;
  isJudgeAgentOpen: boolean;
  onSaveNewIngredient: (ing: Ingredient) => void;
  onSaveNewMethod: (method: KitchenAction) => void;
  allActions: KitchenAction[];
}

function CombinationAgent({
  inventory,
  setInventory,
  timeline,
  setTimeline,
  selectedIngredients,
  setSelectedIngredients,
  activeAction,
  setActiveAction,
  actionTriggerCount,
  onExecuteActionRef,
  onFinishItem,
  onOpenCombinationAgent,
  onOpenCookingAgent,
  onOpenVerificationAgent,
  isCrafting,
  isCookingAgentOpen,
  isAlchemyAgentOpen,
  isJudgeAgentOpen,
  onSaveNewIngredient,
  onSaveNewMethod,
  allActions,
}: CombinationAgentProps) {
  const { generateContent, setConfig } = useGeminiAPIContext();

  const ingredientsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfig({
      systemInstruction: COMBINATION_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: COMBINATION_RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    });
  }, [setConfig]);

  const [newMaterialName, setNewMaterialName] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  const [newToolName, setNewToolName] = useState('');
  const [showToolForm, setShowToolForm] = useState(false);

  const handleAddMaterial = () => {
    if (!newMaterialName.trim()) return;
    const name = newMaterialName.trim();
    if (!isDuplicateIngredient(name, inventory)) {
      const analysis = analyzeItem(name, { type: 'ingredient' });
      const newIng: Ingredient = {
        name,
        emoji: analysis.primaryEmoji,
        category: analysis.suggestedCategory,
        tags: analysis.suggestedTags,
      };
      setInventory(prev => [newIng, ...prev]);
      onSaveNewIngredient(newIng);
    }
    setNewMaterialName('');
    setShowMaterialForm(false);
  };

  const handleAddTool = () => {
    if (!newToolName.trim()) return;
    const name = newToolName.trim();
    const sanitized = sanitizeName(name);
    if (!allActions.some(a => a.name === sanitized)) {
      const analysis = analyzeItem(name, { type: 'tool' });
      const newTool: KitchenAction = {
        name: sanitized,
        displayName: name,
        emoji: analysis.primaryEmoji,
        category: analysis.suggestedCategory,
        tags: analysis.suggestedTags,
      };
      onSaveNewMethod(newTool);
    }
    setNewToolName('');
    setShowToolForm(false);
  };

  const toggleIngredient = useCallback((name: string) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, [setSelectedIngredients]);

  const executeCombination = useCallback(async (
    action: KitchenAction,
    ingredientNames: string[]
  ): Promise<Ingredient | null> => {
    try {
      const prompt = `Action: ${action.displayName}\nIngredients: ${ingredientNames.join(', ')}\n\nWhat is the crafted result of this action?`;
      const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
      const response = await generateContent(contents);
      const text = response?.text || '{}';
      const result: CombinationResult = JSON.parse(text);

      return {
        name: result.result_name || `${action.displayName}ed ${ingredientNames[0]}`,
        emoji: result.emoji || getFallbackEmoji(result.result_name || ''),
        category: 'Synthesized',
      };
    } catch {
      // Quiet fallback when offline or quota reached
      return {
        name: `${action.displayName}ed ${ingredientNames.join(' & ')}`,
        emoji: getFallbackEmoji(`${action.displayName}ed ${ingredientNames[0] || ''}`) || action.emoji,
        category: 'Synthesized',
      };
    }
  }, [generateContent]);

  useEffect(() => {
    onExecuteActionRef.current = executeCombination;
    return () => { onExecuteActionRef.current = null; };
  }, [executeCombination, onExecuteActionRef]);

  const executeAction = useCallback(async (action: KitchenAction) => {
    if (selectedIngredients.size === 0 && action.name !== 'finish_item') return;

    const ingredientNames = Array.from(selectedIngredients);
    setSelectedIngredients(new Set());

    if (action.name === 'finish_item' || action.name === 'serve') {
      const targetName = ingredientNames[0] || 'Custom Item';
      setTimeline(prev => [...prev, {
        id: `finish-${Date.now()}`,
        timestamp: new Date(),
        text: `🎁 Finalized & Produced: ${targetName}`,
      }]);
      onFinishItem(targetName);
      return;
    }

    const timelineId = `${Date.now()}`;
    setTimeline(prev => [...prev, {
      id: timelineId,
      timestamp: new Date(),
      action: action.name,
      ingredients: ingredientNames,
      result: null,
    }]);
    setActiveAction(action.name);

    const newIngredient = await executeCombination(action, ingredientNames);

    if (newIngredient) {
      setTimeline(prev => prev.map(entry =>
        entry.id === timelineId ? { ...entry, result: newIngredient } : entry
      ));
      setInventory(prev => {
        if (isDuplicateIngredient(newIngredient.name, prev)) return prev;
        return [newIngredient, ...prev];
      });
      onSaveNewIngredient(newIngredient);
    } else {
      setTimeline(prev => prev.map(entry =>
        entry.id === timelineId ? { ...entry, result: { name: 'error', emoji: '❌' } } : entry
      ));
    }

    setActiveAction(null);
  }, [selectedIngredients, executeCombination, setTimeline, setActiveAction, setSelectedIngredients, setInventory, onFinishItem, onSaveNewIngredient]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({
        left: timelineRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [timeline.length]);

  const hasSelection = selectedIngredients.size > 0;

  return (
    <div className="kitchen-app">
      {/* Ingredients and Tools */}
      <div className="ingredients-tools-row">
        {/* Ingredients */}
        <section className="kitchen-section ingredients-section">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="section-title">Materials & Inventory</h2>
              <p className="section-subtitle">Select materials to combine with tools</p>
            </div>
            <div className="section-header-actions">
              <button
                className="add-custom-btn"
                onClick={() => setShowMaterialForm(!showMaterialForm)}
                title="Add a custom material or ingredient"
              >
                + Add Material
              </button>
              <span className="section-count">count: {inventory.length}</span>
            </div>
          </div>

          {showMaterialForm && (
            <div className="add-custom-form">
              <input
                type="text"
                placeholder="New material name (e.g. Titanium Ingot, Dark Mana)..."
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
                autoFocus
              />
              <button onClick={handleAddMaterial}>Create</button>
              <button className="cancel-btn" onClick={() => setShowMaterialForm(false)}>✕</button>
            </div>
          )}

          <div className="ingredients-grid" ref={ingredientsRef}>
            {inventory.map((ingredient, index) => (
              <IngredientTile
                key={`${ingredient.name}-${index}-${actionTriggerCount}`}
                ingredient={ingredient}
                isSelected={selectedIngredients.has(ingredient.name)}
                isActive={false}
                isDisabled={isCrafting}
                onClick={() => toggleIngredient(ingredient.name)}
              />
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="kitchen-section actions-section">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="section-title">{allActions.length} Crafting Tools</h2>
              <p className="section-subtitle">Use function calls to combine and synthesize</p>
            </div>
            <div className="section-header-actions">
              <button
                className="add-custom-btn"
                onClick={() => setShowToolForm(!showToolForm)}
                title="Add a custom tool function"
              >
                + Add Tool
              </button>
              <span className="section-count">count: {allActions.length}</span>
            </div>
          </div>

          {showToolForm && (
            <div className="add-custom-form">
              <input
                type="text"
                placeholder="New tool function name (e.g. subatomic_align)..."
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTool()}
                autoFocus
              />
              <button onClick={handleAddTool}>Create</button>
              <button className="cancel-btn" onClick={() => setShowToolForm(false)}>✕</button>
            </div>
          )}
          <div className="actions-grid" ref={actionsRef}>
            {allActions.map(action => {
              const isFinishDisabled = (action.name === 'finish_item' || action.name === 'serve') && selectedIngredients.size !== 1;
              const isDisabled = isCrafting ? false : (!hasSelection || activeAction !== null || isFinishDisabled);

              return (
                <ActionTile
                  key={`${action.name}-${actionTriggerCount}`}
                  action={action}
                  isActive={false}
                  isDisabled={isDisabled}
                  onClick={() => executeAction(action)}
                />
              );
            })}
          </div>
        </section>
      </div>

      {/* Agents Debug Controls */}
      <section className="kitchen-section agents-section">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="section-title">AI Function Calling Agents</h2>
            <p className="section-subtitle">Gemini 3.7 Flash function calling engine components</p>
          </div>
        </div>
        <div className="agents-grid">
          <div className="agent-card agent-card-wide">
            <div className="agent-card-header">
              <span className="agent-emoji">🧑‍🍳</span>
              <span className="agent-name">Crafting Agent</span>
            </div>
            <p className="agent-description">Sequences tools and methods to synthesize any requested creation</p>
            <div className="agent-actions">
              <button
                className="agent-view-button"
                onClick={onOpenCookingAgent}
                disabled={isCookingAgentOpen}
              >
                <span className="material-symbols-outlined">search</span>
                Open Crafting Console
              </button>
            </div>
          </div>

          <div className="agent-card">
            <div className="agent-card-header">
              <span className="agent-emoji">🧑‍🔬</span>
              <span className="agent-name">Alchemy Engine</span>
            </div>
            <p className="agent-description">Determines outputs from tool combinations</p>
            <div className="agent-actions">
              <button
                className="agent-view-button"
                onClick={onOpenCombinationAgent}
                disabled={isAlchemyAgentOpen}
              >
                <span className="material-symbols-outlined">search</span>
                Open
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="kitchen-section timeline-section">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="section-title">Synthesis Function Call Log</h2>
            <p className="section-subtitle">Real-time function execution timeline with procedural sprites</p>
          </div>
        </div>
        <div className="timeline-container" ref={timelineRef}>
          {timeline.length === 0 ? (
            <div className="timeline-empty">
              Type an item above to see Gemini execute tool function calls!
            </div>
          ) : (
            timeline.map(entry => <TimelineItem key={entry.id} entry={entry} />)
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Crafting Agent Component (Layer 2 - Orchestrator)
// ============================================================================

interface CraftingAgentProps {
  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  setTimeline: React.Dispatch<React.SetStateAction<TimelineEntry[]>>;
  setActiveAction: React.Dispatch<React.SetStateAction<string | null>>;
  setActionTriggerCount: React.Dispatch<React.SetStateAction<number>>;
  executeCombinationRef: React.MutableRefObject<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>;
  sendMessageRef: React.MutableRefObject<((message: string) => void) | null>;
  onFinishItem: (name: string, desc?: string, rarity?: string) => void;
  targetGoal: string;
  recordToolUsage: (tool: string, materials: string[]) => void;
  onSaveNewIngredient: (ing: Ingredient) => void;
  onSaveNewMethod: (method: KitchenAction) => void;
  allActions: KitchenAction[];
}

function CraftingAgent({
  inventory,
  setInventory,
  setTimeline,
  setActiveAction,
  setActionTriggerCount,
  executeCombinationRef,
  sendMessageRef,
  onFinishItem,
  targetGoal,
  recordToolUsage,
  onSaveNewIngredient,
  onSaveNewMethod,
  allActions,
}: CraftingAgentProps) {
  const { client, setConfig, sendMessage, model } = useGeminiAPIContext();
  const pendingTextRef = useRef<string | null>(null);
  const stepCountRef = useRef<number>(0);

  // Reset step counter when target goal changes
  useEffect(() => {
    stepCountRef.current = 0;
  }, [targetGoal]);

  useEffect(() => {
    setConfig({
      systemInstruction: buildCraftingAgentSystemInstruction(inventory, targetGoal),
      tools: generateCraftingTools(),
    });
  }, [setConfig, inventory, targetGoal]);

  useEffect(() => {
    const handleLog = (log: any) => {
      if (log.type !== 'send-message' || log.direction !== 'receive') return;
      const response = log.message;
      if (!response) return;

      const text = response.text;
      if (text && text.trim()) {
        const hasFunctionCalls = response.candidates?.[0]?.content?.parts?.some(
          (part: any) => part.functionCall
        ) || response.functionCalls?.length > 0;

        if (hasFunctionCalls) {
          pendingTextRef.current = text;
        } else {
          setTimeline(prev => {
            const hasText = prev.some(e => e.text === text && !e.action);
            if (hasText) return prev;
            return [...prev, { id: `text-${Date.now()}-${Math.random()}`, timestamp: new Date(), text }];
          });
        }
      }
    };

    (client as any).on('log', handleLog);
    return () => { (client as any).off('log', handleLog); };
  }, [client, setTimeline]);

  useEffect(() => {
    const handleApprovedFunctionCalls = async (functionCalls: FunctionCall[]) => {
      if (functionCalls.length === 0) return;
      const fc = functionCalls[0];
      const actionName = fc.name || '';
      const args = fc.args as { ingredients?: string[]; item_name?: string; description?: string; rarity?: string; dish?: string } || {};

      stepCountRef.current += 1;
      const currentStep = stepCountRef.current;

      if (actionName === 'finish_item' || actionName === 'serve') {
        const itemName = args.item_name || args.dish || targetGoal || 'Finished Item';
        console.log(`🎁 Finishing Item: ${itemName}`);

        setTimeline(prev => [...prev, {
          id: `finish-${Date.now()}`,
          timestamp: new Date(),
          text: `🎁 Finished: ${itemName}`,
        }]);

        onFinishItem(itemName, args.description, args.rarity);

        try {
          await sendMessage([{
            functionResponse: {
              name: actionName,
              response: { success: true, message: `${itemName} has been produced and displayed!` }
            }
          }]);
        } catch {
          // Ignore API response delivery errors if quota limit reached
        }
        return;
      }

      const requestedIngredients = args.ingredients || [];
      const timelineId = `crafting-${Date.now()}`;

      // Dynamic tool creation: if tool action doesn't exist, create it and save to list
      let action = allActions.find(a => a.name === actionName);
      if (!action) {
        const toolAnalysis = analyzeItem(actionName, { type: 'tool' });
        action = {
          name: actionName,
          displayName: actionName.replace(/_/g, ' '),
          emoji: toolAnalysis.primaryEmoji,
          category: toolAnalysis.suggestedCategory,
          tags: toolAnalysis.suggestedTags,
        };
        onSaveNewMethod(action);
      }

      // Dynamic ingredient creation: if an ingredient is missing, create and add it to inventory & save!
      const validatedIngredients: string[] = [];
      const newItemsToCreate: Ingredient[] = [];

      for (const reqName of requestedIngredients) {
        const found = findIngredientInInventory(reqName, inventory);
        if (found) {
          validatedIngredients.push(found.name);
        } else {
          const ingAnalysis = analyzeItem(reqName, { type: 'ingredient' });
          const newMaterial: Ingredient = {
            name: reqName,
            emoji: ingAnalysis.primaryEmoji,
            category: ingAnalysis.suggestedCategory,
            tags: ingAnalysis.suggestedTags,
          };
          validatedIngredients.push(reqName);
          newItemsToCreate.push(newMaterial);
          onSaveNewIngredient(newMaterial);
        }
      }

      if (newItemsToCreate.length > 0) {
        setInventory(prev => {
          const fresh = newItemsToCreate.filter(item => !isDuplicateIngredient(item.name, prev));
          return [...fresh, ...prev];
        });
      }

      const ingredients = validatedIngredients.length > 0 ? validatedIngredients : (requestedIngredients.length > 0 ? requestedIngredients : ['Base Component']);

      recordToolUsage(actionName, ingredients);

      const pendingText = pendingTextRef.current;
      pendingTextRef.current = null;

      setTimeline(prev => [...prev, {
        id: timelineId,
        timestamp: new Date(),
        text: pendingText || undefined,
        action: actionName,
        ingredients: ingredients,
        result: null,
      }]);
      setActiveAction(actionName);
      setActionTriggerCount(prev => prev + 1);

      try {
        let newIngredient: Ingredient | null = null;
        if (executeCombinationRef.current) {
          newIngredient = await executeCombinationRef.current(action, ingredients);
        }

        if (!newIngredient) {
          const synthName = `${action.displayName}ed ${ingredients.join(' & ')}`;
          const synthAnalysis = analyzeItem(synthName, { type: 'ingredient' });
          newIngredient = {
            name: synthName,
            emoji: synthAnalysis.primaryEmoji || action.emoji,
            category: synthAnalysis.suggestedCategory,
            tags: synthAnalysis.suggestedTags,
          };
        }

        setTimeline(prev => prev.map(entry =>
          entry.id === timelineId ? { ...entry, result: newIngredient } : entry
        ));

        setInventory(prev => {
          if (isDuplicateIngredient(newIngredient!.name, prev)) return prev;
          return [newIngredient!, ...prev];
        });
        onSaveNewIngredient(newIngredient);

        // Step budget safety limiter: only auto-finalize if 8+ steps to allow deep multi-stage logical craftsmanship
        if (currentStep >= 8) {
          const finalItemName = targetGoal || newIngredient.name;
          setTimeline(prev => [...prev, {
            id: `finish-${Date.now()}`,
            timestamp: new Date(),
            text: `🎁 Synthesis Completed: ${finalItemName}`,
          }]);
          onFinishItem(finalItemName, `Masterfully forged in ${currentStep} meticulous, logical crafting stages.`, 'Epic');
          return;
        }

        try {
          const responsePayload: any = {
            success: true,
            result: newIngredient.name,
            emoji: newIngredient.emoji,
            message: `Successfully produced '${newIngredient.name}'. Continue your logical step-by-step crafting sequence towards "${targetGoal || 'the goal'}".`,
            inventory_updated: true,
          };

          if (currentStep >= 5) {
            responsePayload.instruction = `You have completed ${currentStep} logical synthesis stages. If all prerequisite components are fabricated and integrated, you may call finish_item(item_name="${targetGoal || newIngredient.name}", description="...", rarity="...") on your next turn to present the completed artifact.`;
          }

          await sendMessage([{
            functionResponse: {
              name: actionName,
              response: responsePayload
            }
          }]);
        } catch {
          // Ignore delivery errors if quota limit reached
        }
      } catch {
        // Safe catch - prevent unhandled error logs
      } finally {
        setActiveAction(null);
      }
    };

    (client as any).on('approvedfunctioncalls', handleApprovedFunctionCalls);
    return () => { (client as any).off('approvedfunctioncalls', handleApprovedFunctionCalls); };
  }, [client, sendMessage, setTimeline, setActiveAction, setActionTriggerCount, setInventory, executeCombinationRef, onFinishItem, inventory, targetGoal, recordToolUsage, onSaveNewIngredient, onSaveNewMethod, allActions]);


  useEffect(() => {
    sendMessageRef.current = async (message: string) => {
      const currentConfig = {
        systemInstruction: buildCraftingAgentSystemInstruction(inventory, targetGoal),
        tools: generateCraftingTools(),
      };
      client.startChat(model || "gemini-3.7-flash", currentConfig);
      await sendMessage([{ text: message }]);
    };
    return () => { sendMessageRef.current = null; };
  }, [sendMessage, sendMessageRef, client, model, inventory, targetGoal]);

  return null;
}

// ============================================================================
// Kitchen App Container (Main Workspace)
// ============================================================================

function KitchenAppContainer() {
  const {
    user,
    authLoading,
    isCloudSyncing,
    syncStatus,
    finishedItems: syncedFinishedItems,
    customIngredients: syncedIngredients,
    customMethods: syncedMethods,
    loginWithGoogle,
    logout,
    saveFinishedItem,
    deleteFinishedItem,
    addCustomIngredient,
    addCustomMethod,
  } = useAuthAndForgeSync();

  // Combine starting ingredients with user's saved/synced custom ingredients
  const [inventory, setInventory] = useState<Ingredient[]>(() => {
    const combined = [...STARTING_INGREDIENTS];
    return combined;
  });

  // Keep inventory in sync when custom ingredients load from Firestore
  useEffect(() => {
    if (syncedIngredients && syncedIngredients.length > 0) {
      setInventory(prev => {
        const merged = [...prev];
        syncedIngredients.forEach(custom => {
          if (!isDuplicateIngredient(custom.name, merged)) {
            merged.unshift(custom);
          }
        });
        return merged;
      });
    }
  }, [syncedIngredients]);

  // Combine built-in cooking tools with custom synced tools
  const allActions = useMemo(() => {
    const actionsMap = new Map<string, KitchenAction>();
    COOKING_ACTIONS.forEach(a => actionsMap.set(a.name, a));
    syncedMethods.forEach(m => actionsMap.set(m.name, m));
    return Array.from(actionsMap.values());
  }, [syncedMethods]);

  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set(PRESELECTED_INGREDIENTS));
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionTriggerCount, setActionTriggerCount] = useState(0);

  const [inputGoal, setInputGoal] = useState<string>('Laser Sword');
  const [targetGoal, setTargetGoal] = useState<string>('');
  const [isCrafting, setIsCrafting] = useState<boolean>(false);

  const [finishedItem, setFinishedItem] = useState<FinishedItem | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<FinishedItem | null>(null);

  const [usedToolsSession, setUsedToolsSession] = useState<string[]>([]);
  const [usedMaterialsSession, setUsedMaterialsSession] = useState<string[]>([]);

  const [combinationAgentOpen, setCombinationAgentOpen] = useState(false);
  const [cookingAgentOpen, setCookingAgentOpen] = useState(false);
  const [verificationAgentOpen, setVerificationAgentOpen] = useState(false);

  const executeCombinationRef = useRef<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>(null);
  const sendCraftingMessageRef = useRef<((message: string) => void) | null>(null);

  const recordToolUsage = useCallback((tool: string, materials: string[]) => {
    setUsedToolsSession(prev => prev.includes(tool) ? prev : [...prev, tool]);
    setUsedMaterialsSession(prev => {
      const updated = [...prev];
      materials.forEach(m => {
        if (!updated.includes(m)) updated.push(m);
      });
      return updated;
    });
  }, []);

  const handleFinishItem = useCallback((name: string, desc?: string, rarityInput?: string) => {
    const analysis = analyzeItem(name, { type: 'finished_item' });
    const found = findIngredientInInventory(name, inventory);
    const emoji = (found?.emoji && found.emoji !== '✨') ? found.emoji : analysis.primaryEmoji;
    const rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 
      (rarityInput === 'Legendary' || rarityInput === 'Epic' || rarityInput === 'Rare' || rarityInput === 'Common')
        ? rarityInput as any
        : analysis.raritySuggestion;

    const category = analysis.suggestedCategory;
    const color = getItemColor({ name, category, rarity });

    const newItem: FinishedItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name,
      emoji: emoji,
      rarity: rarity,
      category: category,
      color: color,
      tags: analysis.suggestedTags,
      description: desc || `A masterfully synthesized ${name} created through AI tool function calling.`,
      toolsUsed: usedToolsSession.length > 0 ? [...usedToolsSession] : ['smelt', 'forge', 'enchant'],
      ingredientsUsed: usedMaterialsSession.length > 0 ? [...usedMaterialsSession] : ['Raw Materials'],
      createdAt: new Date(),
    };

    setFinishedItem(newItem);
    saveFinishedItem(newItem);
    setIsCrafting(false);
    enqueueBackgroundSpriteGeneration(name, category, emoji, rarity);
  }, [inventory, usedToolsSession, usedMaterialsSession, saveFinishedItem]);

  const [apiQuotaExceeded, setApiQuotaExceeded] = useState(false);

  const runFallbackCraftingSequence = useCallback(async (goal: string, isQuota: boolean = false) => {
    if (isQuota) {
      setApiQuotaExceeded(true);
    }
    const lowerGoal = goal.toLowerCase();

    interface CraftingStep {
      toolName: string;
      inputs: string[];
      outputName: string;
      outputEmoji: string;
    }

    let craftingSteps: CraftingStep[] = [];

    if (lowerGoal.includes('sword') || lowerGoal.includes('blade') || lowerGoal.includes('katana') || lowerGoal.includes('saber') || lowerGoal.includes('laser sword')) {
      craftingSteps = [
        { toolName: 'smelt', inputs: ['iron ore', 'coal'], outputName: 'Refined Steel Ingot', outputEmoji: '🧱' },
        { toolName: 'forge', inputs: ['Refined Steel Ingot', 'plasma core'], outputName: 'Tempered Blade Core', outputEmoji: '🗡️' },
        { toolName: 'carve', inputs: ['wood log', 'leather strip'], outputName: 'Reinforced Grip & Hilt', outputEmoji: '🪵' },
        { toolName: 'laser_cut', inputs: ['silicon', 'copper wire'], outputName: 'Focusing Emitter Matrix', outputEmoji: '⚡' },
        { toolName: 'assemble', inputs: ['Tempered Blade Core', 'Reinforced Grip & Hilt', 'Focusing Emitter Matrix'], outputName: 'Hilted Blade Assembly', outputEmoji: '⚔️' },
        { toolName: 'calibrate', inputs: ['Hilted Blade Assembly', 'crystal gem'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    } else if (lowerGoal.includes('potion') || lowerGoal.includes('elixir') || lowerGoal.includes('brew') || lowerGoal.includes('tonic') || lowerGoal.includes('invisibility')) {
      craftingSteps = [
        { toolName: 'crush', inputs: ['mana crystal', 'quartz'], outputName: 'Purified Arcane Powder', outputEmoji: '💎' },
        { toolName: 'distill', inputs: ['Purified Arcane Powder', 'water'], outputName: 'Concentrated Mana Distillate', outputEmoji: '🧪' },
        { toolName: 'extract', inputs: ['phoenix feather', 'starlight'], outputName: 'Radiant Spectral Essence', outputEmoji: '✨' },
        { toolName: 'brew', inputs: ['Concentrated Mana Distillate', 'Radiant Spectral Essence', 'herb leaf'], outputName: 'Ethereal Alchemy Compound', outputEmoji: '🫖' },
        { toolName: 'infuse', inputs: ['Ethereal Alchemy Compound', 'glass flask'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    } else if (lowerGoal.includes('watch') || lowerGoal.includes('robot') || lowerGoal.includes('core') || lowerGoal.includes('rocket') || lowerGoal.includes('shuttle') || lowerGoal.includes('quantum') || lowerGoal.includes('cybernetic')) {
      craftingSteps = [
        { toolName: 'laser_cut', inputs: ['silicon', 'copper wire'], outputName: 'High-Density Circuit Substrate', outputEmoji: '🟫' },
        { toolName: 'program', inputs: ['microchip', 'circuit board'], outputName: 'Synaptic Micro-Controller Firmware', outputEmoji: '💻' },
        { toolName: 'wire', inputs: ['High-Density Circuit Substrate', 'battery', 'fiber cable'], outputName: 'Powered Neural Power Unit', outputEmoji: '🔋' },
        { toolName: 'forge', inputs: ['steel ingot', 'rubber'], outputName: 'Precision Chassis Housing', outputEmoji: '⚙️' },
        { toolName: 'assemble', inputs: ['Synaptic Micro-Controller Firmware', 'Powered Neural Power Unit', 'Precision Chassis Housing', 'optical lens'], outputName: 'Calibrated Prototype Matrix', outputEmoji: '🛰️' },
        { toolName: 'calibrate', inputs: ['Calibrated Prototype Matrix'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    } else if (lowerGoal.includes('pizza') || lowerGoal.includes('ramen') || lowerGoal.includes('burger') || lowerGoal.includes('cake') || lowerGoal.includes('noodle') || lowerGoal.includes('soup') || lowerGoal.includes('food') || lowerGoal.includes('truffle')) {
      craftingSteps = [
        { toolName: 'knead', inputs: ['flour', 'water', 'eggs'], outputName: 'Artisan Culinary Base Dough', outputEmoji: '🍞' },
        { toolName: 'simmer', inputs: ['tomatoes', 'exotic spices', 'rich broth'], outputName: 'Aromatic Reduction Sauce', outputEmoji: '🍲' },
        { toolName: 'shred', inputs: ['cheese', 'herb leaf'], outputName: 'Fine Garnish & Toppings', outputEmoji: '🧀' },
        { toolName: 'bake', inputs: ['Artisan Culinary Base Dough', 'Aromatic Reduction Sauce', 'Fine Garnish & Toppings'], outputName: 'Oven-Baked Masterpiece Base', outputEmoji: '🍕' },
        { toolName: 'garnish', inputs: ['Oven-Baked Masterpiece Base', 'exotic spices'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    } else if (lowerGoal.includes('wand') || lowerGoal.includes('staff') || lowerGoal.includes('grimoire') || lowerGoal.includes('ring') || lowerGoal.includes('amulet') || lowerGoal.includes('armor') || lowerGoal.includes('shield')) {
      craftingSteps = [
        { toolName: 'carve', inputs: ['wood log', 'crystal gem'], outputName: 'Resonant Artifact Core Shaft', outputEmoji: '🪵' },
        { toolName: 'crystallize', inputs: ['mana crystal', 'fire essence'], outputName: 'Prismatic Focus Gem', outputEmoji: '💎' },
        { toolName: 'bind', inputs: ['Resonant Artifact Core Shaft', 'phoenix feather', 'gold dust'], outputName: 'Bound Focus Relic Blank', outputEmoji: '🪄' },
        { toolName: 'enchant', inputs: ['Bound Focus Relic Blank', 'Prismatic Focus Gem', 'starlight'], outputName: 'Channeled Astral Relic', outputEmoji: '⭐' },
        { toolName: 'bless', inputs: ['Channeled Astral Relic'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    } else {
      craftingSteps = [
        { toolName: 'smelt', inputs: ['iron ore', 'coal'], outputName: 'Refined Metal Matrix', outputEmoji: '🧱' },
        { toolName: 'mold', inputs: ['Refined Metal Matrix', 'rubber'], outputName: 'Structured Component Blank', outputEmoji: '⚙️' },
        { toolName: 'synthesize', inputs: ['Structured Component Blank', 'copper wire'], outputName: 'Integrated Sub-Assembly Unit', outputEmoji: '🧩' },
        { toolName: 'assemble', inputs: ['Integrated Sub-Assembly Unit', 'crystal gem'], outputName: 'Composite Base Assembly', outputEmoji: '📦' },
        { toolName: 'polish', inputs: ['Composite Base Assembly'], outputName: goal, outputEmoji: getFallbackEmoji(goal) },
      ];
    }

    for (let i = 0; i < craftingSteps.length; i++) {
      const step = craftingSteps[i];
      const tool = allActions.find(a => a.name === step.toolName) || {
        name: step.toolName,
        displayName: step.toolName.replace(/_/g, ' '),
        emoji: getFallbackEmoji(step.toolName),
      };

      const timelineId = `fallback-${Date.now()}-${i}`;
      setActiveAction(tool.name);
      recordToolUsage(tool.name, step.inputs);

      setTimeline(prev => [...prev, {
        id: timelineId,
        timestamp: new Date(),
        action: tool.name,
        ingredients: step.inputs,
        result: null,
      }]);

      await new Promise(res => setTimeout(res, 450));

      const newIngredient: Ingredient = {
        name: step.outputName,
        emoji: step.outputEmoji || getFallbackEmoji(step.outputName),
        category: i === craftingSteps.length - 1 ? 'Finished Creation' : 'Component Sub-Assembly',
      };

      setTimeline(prev => prev.map(entry =>
        entry.id === timelineId ? { ...entry, result: newIngredient } : entry
      ));

      setInventory(prev => {
        if (isDuplicateIngredient(newIngredient.name, prev)) return prev;
        return [newIngredient, ...prev];
      });
      addCustomIngredient(newIngredient);

      await new Promise(res => setTimeout(res, 280));
    }

    setActiveAction(null);

    setTimeline(prev => [...prev, {
      id: `finish-${Date.now()}`,
      timestamp: new Date(),
      text: `🎁 Logical Synthesis Complete: ${goal}`,
    }]);

    handleFinishItem(goal);
  }, [recordToolUsage, handleFinishItem, allActions, addCustomIngredient]);

  const handleSynthesize = useCallback(async (goal: string) => {
    setTargetGoal(goal);
    setIsCrafting(true);
    setFinishedItem(null);
    setUsedToolsSession([]);
    setUsedMaterialsSession([]);

    try {
      if (sendCraftingMessageRef.current) {
        await sendCraftingMessageRef.current(
          `Please synthesize "${goal}" through a thoughtful, realistic, multi-step crafting sequence. Break the creation down into its logical component parts: refine raw materials, fabricate sub-assemblies with appropriate tools, assemble the sub-parts, and treat/calibrate the assembled artifact before calling finish_item.`
        );
      } else {
        await runFallbackCraftingSequence(goal, false);
      }
    } catch (err: any) {
      console.warn("Synthesis engine error encountered:", err);
      const isQuota = Boolean(
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quota') ||
        err?.status === 429
      );
      await runFallbackCraftingSequence(goal, isQuota);
    }
  }, [runFallbackCraftingSequence]);

  return (
    <div className="app-container">
      <div className="kitchen-app">
        {/* Persistent Authentication & Cloud Sync Bar */}
        <AuthHeader
          user={user}
          authLoading={authLoading}
          isCloudSyncing={isCloudSyncing}
          syncStatus={syncStatus}
          onLogin={loginWithGoogle}
          onLogout={logout}
          savedItemsCount={syncedFinishedItems.length}
          customIngredientsCount={syncedIngredients.length}
        />

        {/* Title Header */}
        <div className="kitchen-header">
          <h1 className="kitchen-title">Function Call Crafting Forge</h1>
          <p className="kitchen-subtitle">
            Input anything to synthesize with Gemini 3.7 Flash function calling, live procedural pixel sprites, and cloud persistence.
          </p>
        </div>

        {apiQuotaExceeded && (
          <div className="api-quota-banner">
            <span>⚡ <strong>Offline Fallback Crafting Mode Active</strong> — API quota limit reached. Tool sequencing, material combination, and pixel sprite rendering continue seamlessly!</span>
            <button onClick={() => setApiQuotaExceeded(false)}>✕</button>
          </div>
        )}

        {/* Creator Input Bar */}
        <CreatorSection
          inputGoal={inputGoal}
          setInputGoal={setInputGoal}
          onSynthesize={handleSynthesize}
          isCrafting={isCrafting}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />

        {/* Finished Item Display Box & Sprite Frame */}
        <FinishedItemBox
          finishedItem={finishedItem}
          isCrafting={isCrafting}
          targetGoal={targetGoal}
          activeAction={activeAction}
          showcaseCount={syncedFinishedItems.length}
          onClearItem={() => setFinishedItem(null)}
          onInspectSprite={(item) => setInspectingItem(item)}
        />

        {/* Showcase Gallery */}
        <ShowcaseGallery
          items={syncedFinishedItems}
          selectedItemId={finishedItem?.id || null}
          onSelectItem={(item) => setFinishedItem(item)}
          onInspectItem={(item) => setInspectingItem(item)}
          onDeleteItem={(id) => deleteFinishedItem(id)}
        />
      </div>

      {/* Synthesis Agent Layer */}
      <GeminiAPIProvider>
        <CombinationAgent
          inventory={inventory}
          setInventory={setInventory}
          timeline={timeline}
          setTimeline={setTimeline}
          selectedIngredients={selectedIngredients}
          setSelectedIngredients={setSelectedIngredients}
          activeAction={activeAction}
          setActiveAction={setActiveAction}
          actionTriggerCount={actionTriggerCount}
          onExecuteActionRef={executeCombinationRef}
          onFinishItem={handleFinishItem}
          onOpenCombinationAgent={() => setCombinationAgentOpen(true)}
          onOpenCookingAgent={() => setCookingAgentOpen(true)}
          onOpenVerificationAgent={() => setVerificationAgentOpen(true)}
          isCrafting={isCrafting}
          isCookingAgentOpen={cookingAgentOpen}
          isAlchemyAgentOpen={combinationAgentOpen}
          isJudgeAgentOpen={verificationAgentOpen}
          onSaveNewIngredient={addCustomIngredient}
          onSaveNewMethod={addCustomMethod}
          allActions={allActions}
        />
        <GeminiDebug
          agentName="Alchemy Engine"
          isOpen={combinationAgentOpen}
          onClose={() => setCombinationAgentOpen(false)}
          welcomeMessage="I calculate combination outputs for crafting tools."
          placeholder="Ask about combinations..."
          showApprovalSelector={false}
        />
      </GeminiAPIProvider>

      {/* Crafting Agent Orchestrator */}
      <GeminiAPIProvider>
        <CraftingAgent
          inventory={inventory}
          setInventory={setInventory}
          setTimeline={setTimeline}
          setActiveAction={setActiveAction}
          setActionTriggerCount={setActionTriggerCount}
          executeCombinationRef={executeCombinationRef}
          sendMessageRef={sendCraftingMessageRef}
          onFinishItem={handleFinishItem}
          targetGoal={targetGoal}
          recordToolUsage={recordToolUsage}
          onSaveNewIngredient={addCustomIngredient}
          onSaveNewMethod={addCustomMethod}
          allActions={allActions}
        />
        <GeminiDebug
          agentName="Crafting Agent"
          isOpen={cookingAgentOpen}
          onClose={() => setCookingAgentOpen(false)}
          welcomeMessage="I execute tool function calls to synthesize requested items."
          placeholder="Type an item idea..."
          initialAutoApprove={true}
          showApprovalSelector={true}
        />
      </GeminiAPIProvider>

      {/* Custom Item / Tool Creation Modal */}
      <AddCustomItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddIngredient={(ing) => {
          setInventory(prev => isDuplicateIngredient(ing.name, prev) ? prev : [ing, ...prev]);
          addCustomIngredient(ing);
        }}
        onAddMethod={(method) => {
          addCustomMethod(method);
        }}
      />

      {/* Sprite Inspector & Customizer Modal */}
      <SpriteInspectorModal
        item={inspectingItem}
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
      />

      {/* Attribution Footer */}
      <footer className="attribution-footer">
        Powered by Gemini 3.7 Flash Function Calling • Google AI Studio • Firebase Cloud Storage
      </footer>
    </div>
  );
}

function App() {
  return <KitchenAppContainer />;
}

export default App;
