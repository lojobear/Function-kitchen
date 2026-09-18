export const MIN_STAGE_PROCESSING_MS = 1050;
export const RESULT_REVIEW_MS = 650;

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function waitForMinimumDuration(
  startedAt: number,
  minimumMs: number
): Promise<void> {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) await wait(remaining);
}
