import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeminiAPIProvider } from "../../gemini/contexts/GeminiAPIContext";
import GeminiDebug from "../../gemini/components/GeminiDebug";
import { FinishedItemBox } from '../FinishedItemBox';
import { ShowcaseGallery } from '../ShowcaseGallery';
import { AuthHeader } from '../AuthHeader';
import { LiveFunctionCallLog } from '../LiveFunctionCallLog';
import { AddCustomItemModal } from '../AddCustomItemModal';
import { SpriteInspectorModal } from '../SpriteInspectorModal';
import { SpriteUploadModal } from '../SpriteUploadModal';
import { CreatorSection } from '../sections/CreatorSection';
import { APIStatsPanel } from '../APIStatsPanel';
import { CombinationAgent, CraftingAgent, CraftingProgress } from '../agents';
import { initCustomSpritesSync, subscribeCustomSprites, getAllCustomSprites } from '../../lib/custom-sprite-service';
import { useAuthAndForgeSync } from '../../hooks/use-auth-sync';
import { analyzeItem } from '../../lib/tagging-engine';
import { getItemColor } from '../../lib/sprite-engine';
import { enqueueBackgroundSpriteGeneration } from '../../lib/background-sprite-painter';
import {
  createSynthesisKey,
  getCachedSynthesis,
  cacheSynthesisResult,
} from '../../lib/synthesis-cache';
import { rateLimiter } from '../../lib/rate-limiter';
import { synthesisQueue } from '../../lib/synthesis-queue';
import { initializePrecomputation } from '../../lib/common-items-precompute';
import { getProgressionSequence } from '../../lib/recipe-progression';
import {
  Ingredient,
  KitchenAction,
  TimelineEntry,
  FinishedItem,
  COOKING_ACTIONS,
  STARTING_INGREDIENTS,
  PRESELECTED_INGREDIENTS,
} from '../../constants';
import {
  isDuplicateIngredient,
  findIngredientInInventory,
  getFallbackEmoji,
  getRarityFromName,
  MIN_STAGE_PROCESSING_MS,
  RESULT_REVIEW_MS,
  wait,
} from '../../utils';

export function KitchenAppContainer() {
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
  const [craftingProgress, setCraftingProgress] = useState<CraftingProgress>({
    step: 0,
    total: null,
    phase: 'planning',
  });

  const [finishedItem, setFinishedItem] = useState<FinishedItem | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<FinishedItem | null>(null);
  const [isSpriteUploadModalOpen, setIsSpriteUploadModalOpen] = useState(false);
  const [spriteUploadTarget, setSpriteUploadTarget] = useState<{
    name: string;
    type: 'item' | 'tool' | 'ingredient' | 'any';
  }>({ name: '', type: 'item' });
  const [customSpritesCount, setCustomSpritesCount] = useState<number>(
    () => Object.keys(getAllCustomSprites()).length
  );

  // Sync community custom sprites in real-time from Firestore
  useEffect(() => {
    const cleanupSync = initCustomSpritesSync();
    const cleanupSub = subscribeCustomSprites((sprites) => {
      setCustomSpritesCount(Object.keys(sprites).length);
    });
    return () => {
      cleanupSync();
      cleanupSub();
    };
  }, []);

  // Pre-populate synthesis cache with common recipes to prevent cold-start API exhaustion
  useEffect(() => {
    initializePrecomputation();
  }, []);

  const handleOpenSpriteUploader = useCallback(
    (name?: string, type: 'item' | 'tool' | 'ingredient' | 'any' = 'item') => {
      setSpriteUploadTarget({
        name: name || '',
        type,
      });
      setIsSpriteUploadModalOpen(true);
    },
    []
  );

  const usedToolsSessionRef = useRef<string[]>([]);
  const usedMaterialsSessionRef = useRef<string[]>([]);

  const [combinationAgentOpen, setCombinationAgentOpen] = useState(false);
  const [cookingAgentOpen, setCookingAgentOpen] = useState(false);
  const [verificationAgentOpen, setVerificationAgentOpen] = useState(false);

  const executeCombinationRef = useRef<((action: KitchenAction, ingredients: string[]) => Promise<Ingredient | null>) | null>(null);
  const sendCraftingMessageRef = useRef<((message: string) => void) | null>(null);

  const recordToolUsage = useCallback((tool: string, materials: string[]) => {
    if (!usedToolsSessionRef.current.includes(tool)) {
      usedToolsSessionRef.current.push(tool);
    }
    materials.forEach(material => {
      if (!usedMaterialsSessionRef.current.includes(material)) {
        usedMaterialsSessionRef.current.push(material);
      }
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
      toolsUsed: usedToolsSessionRef.current.length > 0 ? [...usedToolsSessionRef.current] : ['finish_item'],
      ingredientsUsed: usedMaterialsSessionRef.current.length > 0 ? [...usedMaterialsSessionRef.current] : [name],
      createdAt: new Date(),
    };

    setFinishedItem(newItem);
    saveFinishedItem(newItem);
    setIsCrafting(false);
    enqueueBackgroundSpriteGeneration(name, category, emoji, rarity, { preferAI: true });

    // Cache the completed synthesis result so repeated requests for this item never hit the API
    cacheSynthesisResult(createSynthesisKey([], [], name), {
      itemName: name,
      description: newItem.description,
      rarity: rarity,
      category: category,
      emoji: emoji,
      ingredients: newItem.ingredientsUsed,
      recipe: newItem.toolsUsed.join(' → '),
      efficiency: 1.0,
    });
  }, [inventory, saveFinishedItem]);

  const [apiQuotaExceeded, setApiQuotaExceeded] = useState(false);

  const runFallbackCraftingSequence = useCallback(async (goal: string, isQuota: boolean = false) => {
    if (isQuota) {
      setApiQuotaExceeded(true);
    }

    const craftingSteps = getProgressionSequence(goal);

    for (let i = 0; i < craftingSteps.length; i++) {
      const step = craftingSteps[i];
      const tool = allActions.find(a => a.name === step.toolName) || {
        name: step.toolName,
        displayName: step.toolName.replace(/_/g, ' '),
        emoji: step.toolEmoji || getFallbackEmoji(step.toolName),
      };

      const timelineId = `fallback-${Date.now()}-${i}`;
      setActiveAction(tool.name);
      setCraftingProgress({
        step: i + 1,
        total: craftingSteps.length,
        phase: 'processing',
      });
      recordToolUsage(tool.name, step.inputs);

      setTimeline(prev => [...prev, {
        id: timelineId,
        timestamp: new Date(),
        action: tool.name,
        ingredients: step.inputs,
        result: null,
      }]);

      await wait(MIN_STAGE_PROCESSING_MS);

      const newIngredient: Ingredient = {
        name: step.outputName,
        emoji: step.outputEmoji || getFallbackEmoji(step.outputName),
        category: step.category,
      };

      // Asynchronously trigger 64x64 sprite generation with rich visual description
      enqueueBackgroundSpriteGeneration(
        newIngredient.name,
        newIngredient.category,
        newIngredient.emoji,
        step.rarity,
        {
          description: step.description,
          ingredientHistory: step.ingredientHistory,
          processHistory: step.processHistory,
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
      addCustomIngredient(newIngredient);
      setCraftingProgress({
        step: i + 1,
        total: craftingSteps.length,
        phase: 'revealing',
      });

      await wait(RESULT_REVIEW_MS);
    }

    setActiveAction(null);

    setTimeline(prev => [...prev, {
      id: `finish-${Date.now()}`,
      timestamp: new Date(),
      text: `🎁 Logical Synthesis Complete: ${goal}`,
    }]);

    const lastStep = craftingSteps[craftingSteps.length - 1];
    handleFinishItem(goal, lastStep?.description, lastStep?.rarity);
  }, [recordToolUsage, handleFinishItem, allActions, addCustomIngredient]);

  const handleSynthesize = useCallback(async (goal: string) => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) return;

    setTargetGoal(trimmedGoal);
    setIsCrafting(true);
    setFinishedItem(null);
    usedToolsSessionRef.current = [];
    usedMaterialsSessionRef.current = [];
    setCraftingProgress({ step: 0, total: null, phase: 'planning' });

    // 1. Check Synthesis Cache first - skip API completely if already synthesized
    const cacheKey = createSynthesisKey([], [], trimmedGoal);
    const cached = getCachedSynthesis(cacheKey);
    if (cached) {
      console.log(`⚡ [Cache Hit] Re-using cached synthesis for "${trimmedGoal}". Skipping API.`);
      setTimeline(prev => [...prev, {
        id: `cache-${Date.now()}`,
        timestamp: new Date(),
        text: `⚡ Recipe Cache Hit: Instantly synthesized "${cached.itemName}" from local storage! (Zero API quota consumed)`,
      }]);

      handleFinishItem(cached.itemName, cached.description, cached.rarity);
      return;
    }

    // 2. Queue with deduplication and token-bucket rate limiting
    try {
      await synthesisQueue.enqueue(cacheKey, async () => {
        await rateLimiter.waitAndConsume();

        if (sendCraftingMessageRef.current) {
          await sendCraftingMessageRef.current(
            `Please synthesize "${trimmedGoal}" through a thoughtful, realistic, multi-step crafting sequence. Break the creation down into its logical component parts: refine raw materials, fabricate sub-assemblies with appropriate tools, assemble the sub-parts, and treat/calibrate the assembled artifact before calling finish_item.`
          );
        } else {
          await runFallbackCraftingSequence(trimmedGoal, false);
        }
      });
    } catch (err: any) {
      console.warn("Synthesis engine error encountered:", err);
      const isQuota = Boolean(
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quota') ||
        err?.status === 429
      );
      await runFallbackCraftingSequence(trimmedGoal, isQuota);
    }
  }, [runFallbackCraftingSequence, handleFinishItem]);

  const handleLoadRecipeToBench = useCallback((item: FinishedItem) => {
    if (!item) return;
    setInputGoal(item.name);
    if (item.ingredientsUsed && item.ingredientsUsed.length > 0) {
      setSelectedIngredients(new Set(item.ingredientsUsed));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
          onOpenSpriteStudio={() => handleOpenSpriteUploader('', 'any')}
          customSpritesCount={customSpritesCount}
        />

        {/* Title Header */}
        <div className="kitchen-header">
          <h1 className="kitchen-title">Function Call Crafting Forge</h1>
          <p className="kitchen-subtitle">
            Input anything to synthesize with Gemini 3.8 Flash function calling, live procedural pixel sprites, and cloud persistence.
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

        {/* Live Animated Function Call Execution Log (Top Position) */}
        <LiveFunctionCallLog
          timeline={timeline}
          isCrafting={isCrafting}
          activeAction={activeAction}
          craftingProgress={craftingProgress}
          targetGoal={targetGoal}
          onClearTimeline={() => setTimeline([])}
          onQuickSampleSelect={(sample) => {
            setInputGoal(sample);
            handleSynthesize(sample);
          }}
        />

        {/* Finished Item Display Box & Sprite Frame */}
        <FinishedItemBox
          finishedItem={finishedItem}
          isCrafting={isCrafting}
          targetGoal={targetGoal}
          activeAction={activeAction}
          progress={craftingProgress}
          showcaseCount={syncedFinishedItems.length}
          onClearItem={() => setFinishedItem(null)}
          onInspectSprite={(item) => setInspectingItem(item)}
          onUploadSprite={(item) => handleOpenSpriteUploader(item.name, 'item')}
          onLoadRecipe={handleLoadRecipeToBench}
        />

        {/* API Performance & Quota Shield Monitor */}
        <APIStatsPanel />

        {/* Showcase Gallery */}
        <ShowcaseGallery
          items={syncedFinishedItems}
          selectedItemId={finishedItem?.id || null}
          onSelectItem={(item) => setFinishedItem(item)}
          onInspectItem={(item) => setInspectingItem(item)}
          onUploadSprite={(item) => handleOpenSpriteUploader(item.name, 'item')}
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
          onProgress={setCraftingProgress}
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
          enqueueBackgroundSpriteGeneration(ing.name, ing.category, ing.emoji, 'Common', { preferAI: true });
          setInventory(prev => isDuplicateIngredient(ing.name, prev) ? prev : [ing, ...prev]);
          addCustomIngredient(ing);
        }}
        onAddMethod={(method) => {
          enqueueBackgroundSpriteGeneration(method.name, method.category, method.emoji, 'Common', { preferAI: true });
          addCustomMethod(method);
        }}
      />

      {/* Sprite Inspector & Customizer Modal */}
      <SpriteInspectorModal
        item={inspectingItem}
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
        onOpenUploader={(itemName) => handleOpenSpriteUploader(itemName, 'item')}
      />

      {/* Community Sprite Studio & Uploader Modal */}
      <SpriteUploadModal
        isOpen={isSpriteUploadModalOpen}
        onClose={() => setIsSpriteUploadModalOpen(false)}
        initialTargetName={spriteUploadTarget.name}
        initialTargetType={spriteUploadTarget.type}
        inventory={inventory}
        tools={allActions}
        finishedItems={syncedFinishedItems}
      />

      {/* Attribution Footer */}
      <footer className="attribution-footer">
        Powered by Gemini 3.8 Flash Function Calling • Google AI Studio • Firebase Cloud Storage
      </footer>
    </div>
  );
}
