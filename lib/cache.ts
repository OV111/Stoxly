// lib/cache.ts
import { RedisCache } from "./crypto-engine/cache/redis-cache";
import { InMemoryCache } from "./crypto-engine/cache/in-memory";

// Generic caches (can store any type)
const redisCache = new RedisCache<any>();
const inMemoryCache = new InMemoryCache<any>();

function getBestCache() {
  const redisAvailable = redisCache.isAvailable();
  return redisAvailable ? redisCache : inMemoryCache;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const cache = getBestCache();
  try {
    if (cache instanceof InMemoryCache) {
      return (cache as InMemoryCache<T>).get(key) || null;
    } else {
      return await (cache as RedisCache<T>).get(key);
    }
  } catch (err) {
    console.error("[cache] getCached error:", err);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  const cache = getBestCache();
  try {
    if (cache instanceof InMemoryCache) {
      (cache as InMemoryCache<T>).set(key, data, ttlSeconds);
    } else {
      await (cache as RedisCache<T>).set(key, data, ttlSeconds);
    }
  } catch (err) {
    console.error("[cache] setCache error:", err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const cache = getBestCache();
  try {
    if (cache instanceof InMemoryCache) {
      cache.delete(key);
    } else {
      await cache.delete(key);
    }
  } catch (err) {
    console.error("[cache] deleteCache error:", err);
  }
}