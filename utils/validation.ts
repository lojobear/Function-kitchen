import { isValidItemName } from './item-utils';

export function isValidCraftingInput(input: string): boolean {
  return isValidItemName(input);
}

export function validateSelection(selectedIngredients: Set<string>): {
  valid: boolean;
  reason?: string;
} {
  if (selectedIngredients.size === 0) {
    return { valid: false, reason: 'Select at least one ingredient' };
  }
  return { valid: true };
}

export function validateAction(
  actionName: string,
  selectedCount: number
): { allowed: boolean; reason?: string } {
  if (actionName === 'finish_item' || actionName === 'serve') {
    if (selectedCount !== 1) {
      return { allowed: false, reason: 'Finalizing requires exactly 1 crafted item' };
    }
    return { allowed: true };
  }

  if (selectedCount === 0) {
    return { allowed: false, reason: 'Select ingredients before using a tool' };
  }

  return { allowed: true };
}
