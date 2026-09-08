interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class InMemoryCache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();

  set(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }
}

// Running analysis flags (in-memory)
const runningAnalyses = new Set<string>();

export function isAnalysisRunning(assetId: string): boolean {
  return runningAnalyses.has(assetId);
}

export function setAnalysisRunning(assetId: string): void {
  runningAnalyses.add(assetId);
}

export function clearRunningFlag(assetId: string): void {
  runningAnalyses.delete(assetId);
}