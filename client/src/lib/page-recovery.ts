declare global {
  interface Window {
    meatmallRecovery?: {
      isChunkError(error: unknown): boolean;
      tryReload(error: unknown): boolean;
    };
  }
}

export function recoverPageLoad(error: unknown): boolean {
  return window.meatmallRecovery?.tryReload(error) || false;
}
