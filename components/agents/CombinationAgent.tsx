import React, { useCallback, useEffect, useRef, useState } from "react";
import { Content } from '@google/genai';
import { useGeminiAPIContext } from "../../gemini/contexts/GeminiAPIContext";
import {
  Ingredient,
  KitchenAction,
  TimelineEntry,
  CombinationResult,
  COMBINATION_SYSTEM_INSTRUCTION,
  COMBINATION_RESPONSE_SCHEMA,
  sanitizeName,
} from '../../constants';
import { IngredientTile, ActionTile } from '../tiles';
import { analyzeItem } from '../../lib/tagging-engine';
import { enqueueBackgroundSpriteGeneration } from '../../lib/background-sprite-painter';
import { matchProgressionStep } from '../../lib/recipe-progression';
import {
  createSynthesisKey,
  getCachedSynthesis,
  cacheSynthesisResult,
} from '../../lib/synthesis-cache';
import { rateLimiter } from '../../lib/rate-limiter';
import { synthesisQueue } from '../../lib/synthesis-queue';
import {
  isDuplicateIngredient,
  getFallbackEmoji,
  MIN_STAGE_PROCESSING_MS,
  RESULT_REVIEW_MS,
  wait,
  waitForMinimumDuration,
} from '../../utils';

export interface CombinationAgentProps {
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

export function CombinationAgent({
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
      enqueueBackgroundSpriteGeneration(newIng.name, newIng.category, newIng.emoji, 'Common', { preferAI: true });
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
      enqueueBackgroundSpriteGeneration(newTool.name, newTool.category, newTool.emoji, 'Common', { preferAI: true });
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
    const cacheKey = createSynthesisKey(ingredientNames, [action.name], '');

    // 1. Check logical recipe progression steps first (Coffee, Metallurgy, Alchemy, Tech, Culinary)
    const progressionStep = matchProgressionStep(action.name, ingredientNames);
    if (progressionStep) {
      cacheSynthesisResult(cacheKey, {
        itemName: progressionStep.outputName,
        emoji: progressionStep.outputEmoji,
        category: progressionStep.category,
        description: progressionStep.description,
        rarity: progressionStep.rarity,
        ingredients: ingredientNames,
        efficiency: 1.0,
      });
      return {
        name: progressionStep.outputName,
        emoji: progressionStep.outputEmoji,
        category: progressionStep.category,
      };
    }

    // 2. Check Synthesis Cache - instant response, zero API calls
    const cached = getCachedSynthesis(cacheKey);
    if (cached) {
      return {
        name: cached.itemName,
        emoji: cached.emoji || getFallbackEmoji(cached.itemName),
        category: cached.category || 'Synthesized',
      };
    }

    // 3. Request deduplication + rate limiting + API execution
    try {
      const result = await synthesisQueue.enqueue(cacheKey, async () => {
        // Enforce safe token-bucket rate limit (20 req/min)
        await rateLimiter.waitAndConsume();

        const prompt = `Action: ${action.displayName}\nIngredients: ${ingredientNames.join(', ')}\n\nWhat is the crafted result of this action?`;
        const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
        const response = await generateContent(contents);
        const text = response?.text || '{}';
        const parsed: CombinationResult = JSON.parse(text);

        const newName = parsed.result_name || `${action.displayName}ed ${ingredientNames[0]}`;
        const newEmoji = parsed.emoji || getFallbackEmoji(newName);
        const newCategory = parsed.category || 'Synthesized';

        // 3. Store result in persistent cache
        cacheSynthesisResult(cacheKey, {
          itemName: newName,
          emoji: newEmoji,
          category: newCategory,
          description: parsed.description || `Crafted by ${action.displayName}`,
          rarity: parsed.rarity || 'Common',
          ingredients: ingredientNames,
          efficiency: 1.0,
        });

        return {
          name: newName,
          emoji: newEmoji,
          category: newCategory,
        };
      });

      return result;
    } catch {
      // 4. Quiet fallback when offline or quota reached
      const fallbackName = `${action.displayName}ed ${ingredientNames.join(' & ')}`;
      return {
        name: fallbackName,
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

    const stageStartedAt = Date.now();
    const newIngredient = await executeCombination(action, ingredientNames);
    await waitForMinimumDuration(stageStartedAt, MIN_STAGE_PROCESSING_MS);

    if (newIngredient) {
      const stepProg = matchProgressionStep(action.name, ingredientNames);
      const synthCached = getCachedSynthesis(createSynthesisKey(ingredientNames, [action.name], ''));

      enqueueBackgroundSpriteGeneration(
        newIngredient.name,
        newIngredient.category,
        newIngredient.emoji,
        stepProg?.rarity || synthCached?.rarity || 'Common',
        {
          description: stepProg?.description || synthCached?.description,
          ingredientHistory: stepProg?.ingredientHistory || synthCached?.ingredients || ingredientNames,
          processHistory: stepProg?.processHistory || [action.name],
          preferAI: true,
        }
      );
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

    await wait(RESULT_REVIEW_MS);
    setActiveAction(null);
  }, [selectedIngredients, executeCombination, setTimeline, setActiveAction, setSelectedIngredients, setInventory, onFinishItem, onSaveNewIngredient]);

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
            <p className="section-subtitle">Gemini 3.8 Flash function calling engine components</p>
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
    </div>
  );
}
