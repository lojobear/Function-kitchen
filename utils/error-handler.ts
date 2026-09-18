export class CraftingError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' = 'error'
  ) {
    super(message);
    this.name = 'CraftingError';
  }
}

export async function wrapCraftingOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CraftingError) {
      console.error(`[${context}] ${error.code}: ${error.message}`);
    } else {
      console.error(`[${context}] Unexpected error:`, error);
    }
    return null;
  }
}
