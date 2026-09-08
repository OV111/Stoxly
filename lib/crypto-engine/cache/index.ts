import { InMemoryCache } from './in-memory';
import { RedisCache } from './redis-cache';
import { getAnalysisKey } from './cache-keys';
import { CACHE_TTL } from '../config/cache-ttl';
import type { AnalysisResult } from '../types';

// ----- Running flags (stay in‑memory – synchronous) -----
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

// ----- Analysis cache with fallback -----
const redisCache = new RedisCache<AnalysisResult>();
const inMemoryCache = new InMemoryCache<AnalysisResult>();

function getBestCache() {
  const redisAvailable = redisCache.isAvailable();
  console.log(`Cache selection: Redis ${redisAvailable ? '✅' : '❌'} available, using ${redisAvailable ? 'Redis' : 'in-memory'}`);
  return redisAvailable ? redisCache : inMemoryCache;
}

export async function getCachedAnalysis(assetId: string): Promise<AnalysisResult | null> {
  const key = getAnalysisKey(assetId);
  const cache = getBestCache();
  
  try {
    if (cache instanceof InMemoryCache) {
      const result = cache.get(key);
      console.log(`In-memory cache ${result ? '✅ hit' : '❌ miss'}: ${key}`);
      return result || null;
    } else {
      const result = await (cache as RedisCache<AnalysisResult>).get(key);
      console.log(`Redis cache ${result ? '✅ hit' : '❌ miss'}: ${key}`);
      return result;
    }
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
}

export async function setCachedAnalysis(assetId: string, data: AnalysisResult): Promise<void> {
  const key = getAnalysisKey(assetId);
  const cache = getBestCache();
  const ttl = CACHE_TTL.fullAnalysis;
  
  try {
    if (cache instanceof InMemoryCache) {
      cache.set(key, data, ttl);
      console.log(`✅ In-memory cache set: ${key}`);
    } else {
      await (cache as RedisCache<AnalysisResult>).set(key, data, ttl);
      console.log(`✅ Redis cache set: ${key}`);
    }
  } catch (err) {
    console.error('Cache set error:', err);
  }
}

export async function invalidateAnalysisCache(assetId: string): Promise<void> {
  const key = getAnalysisKey(assetId);
  const cache = getBestCache();
  
  try {
    if (cache instanceof InMemoryCache) {
      cache.delete(key);
    } else {
      await (cache as RedisCache<AnalysisResult>).delete(key);
    }
    console.log(`✅ Cache invalidated: ${key}`);
  } catch (err) {
    console.error('Cache invalidation error:', err);
  }
}

export { CACHE_TTL };