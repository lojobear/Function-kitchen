import React, { useEffect, useRef } from "react";
import { FunctionCall } from '@google/genai';
import { useGeminiAPIContext } from "../../gemini/contexts/GeminiAPIContext";
import {
  Ingredient,
  KitchenAction,
  TimelineEntry,
  buildCraftingAgentSystemInstruction,
  generateCraftingTools,
} from '../../constants';
import {
  findIngredientInInventory,
  isDuplicateIngredient,
  MIN_STAGE_PROCESSING_MS,
  RESULT_REVIEW_MS,
  wait,
  waitForMinimumDuration,
} from '../../utils';
import { analyzeItem } from '../../lib/tagging-engine';
import { enqueueBackgroundSpriteGeneration } from '../../lib/background-sprite-painter';
import { matchProgressionStep } from '../../lib/recipe-progression';
import { createSynthesisKey, getCachedSynthesis } from '../../lib/synthesis-cache';

export interface CraftingProgress {
  step: number;
  total: number | null;
  phase: 'planning' | 'processing' | 'revealing';
}

export interface CraftingAgentProps {
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
  onProgress: (progress: CraftingProgress) => void;
}

export function CraftingAgent({
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
  onProgress,
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

        // Strict 10-15 stage progression guard: reject premature completion before stage 10
        if (currentStep < 10) {
          console.warn(`⚠️ Premature finish_item rejected at step ${currentStep} of 10-15. Enforcing comprehensive formulation.`);
          setTimeline(prev => [...prev, {
            id: `guard-${Date.now()}`,
            timestamp: new Date(),
            text: `⚠️ Stage ${currentStep} of 10-15: Premature completion rejected. Detailed formulation requires at least 10 deliberate stages.`,
          }]);
          try {
            await sendMessage([{
              functionResponse: {
                name: actionName,
                response: {
                  success: false,
                  error: `Premature completion rejected. The recipe formulation sequence MUST be kept strictly within 10 to 15 deliberate stages (currently at stage ${currentStep}). Continue planning intermediate steps: extract/smelt raw components, fabricate sub-assemblies, wire/treat sub-parts, and do not call finish_item until at least step 10.`
                }
              }
            }]);
          } catch {
            // Ignore API response delivery errors
          }
          return;
        }

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
      const stageStartedAt = Date.now();
      onProgress({ step: currentStep, total: null, phase: 'processing' });

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
        enqueueBackgroundSpriteGeneration(action.name, action.category, action.emoji, 'Common', { preferAI: true });
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
          enqueueBackgroundSpriteGeneration(newMaterial.name, newMaterial.category, newMaterial.emoji, 'Common', { preferAI: true });
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

        await waitForMinimumDuration(stageStartedAt, MIN_STAGE_PROCESSING_MS);

        const stepProg = matchProgressionStep(action.name, ingredients);
        const synthCached = getCachedSynthesis(createSynthesisKey(ingredients, [action.name], ''));

        enqueueBackgroundSpriteGeneration(
          newIngredient.name,
          newIngredient.category,
          newIngredient.emoji,
          stepProg?.rarity || synthCached?.rarity || 'Common',
          {
            description: stepProg?.description || synthCached?.description,
            ingredientHistory: stepProg?.ingredientHistory || synthCached?.ingredients || ingredients,
            processHistory: stepProg?.processHistory || [action.name],
            preferAI: true,
          }
        );

        setTimeline(prev => prev.map(entry =>
          entry.id === timelineId ? { ...entry, result: newIngredient } : entry
        ));

        setInventory(prev => {
          if (isDuplicateIngredient(newIngredient!.name, prev)) return prev;
          return [newIngredient!, ...prev];
        });
        onSaveNewIngredient(newIngredient);
        onProgress({ step: currentStep, total: null, phase: 'revealing' });
        await wait(RESULT_REVIEW_MS);

        // Hard limit: auto-finalize at step 15 to strictly observe the 10-15 steps constraint
        if (currentStep >= 15) {
          const finalItemName = targetGoal || newIngredient.name;
          setTimeline(prev => [...prev, {
            id: `finish-${Date.now()}`,
            timestamp: new Date(),
            text: `🎁 Synthesis Completed: ${finalItemName}`,
          }]);
          onFinishItem(finalItemName, `Masterfully formulated across ${currentStep} meticulous, logical crafting stages.`, 'Epic');
          return;
        }

        try {
          let instructionText = '';
          if (currentStep < 10) {
            instructionText = `Stage ${currentStep} complete. Target range: 10 to 15 steps. Continue formulating remaining intermediate sub-components, materials, or circuitry. Do not call finish_item until at least step 10.`;
          } else if (currentStep < 14) {
            instructionText = `Stage ${currentStep} of 10-15 complete. You are now inside the completion window. Integrate final assemblies or calibrations, and prepare to conclude by calling finish_item(...) within the next 1-2 steps.`;
          } else if (currentStep === 14) {
            instructionText = `Stage 14 complete! Step limit reached (maximum 15 steps). On your next turn, you MUST call finish_item(item_name="${targetGoal || newIngredient.name}", description="...", rarity="...") to complete the masterpiece!`;
          }

          const responsePayload: any = {
            success: true,
            result: newIngredient.name,
            emoji: newIngredient.emoji,
            message: `Successfully formulated '${newIngredient.name}' at stage ${currentStep} of 10-15.`,
            instruction: instructionText,
            inventory_updated: true,
          };

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
  }, [client, sendMessage, setTimeline, setActiveAction, setActionTriggerCount, setInventory, executeCombinationRef, onFinishItem, inventory, targetGoal, recordToolUsage, onSaveNewIngredient, onSaveNewMethod, allActions, onProgress]);

  useEffect(() => {
    sendMessageRef.current = async (message: string) => {
      const currentConfig = {
        systemInstruction: buildCraftingAgentSystemInstruction(inventory, targetGoal),
        tools: generateCraftingTools(),
      };
      client.startChat(model || "gemini-3.8-flash", currentConfig);
      await sendMessage([{ text: message }]);
    };
    return () => { sendMessageRef.current = null; };
  }, [sendMessage, sendMessageRef, client, model, inventory, targetGoal]);

  return null;
}
