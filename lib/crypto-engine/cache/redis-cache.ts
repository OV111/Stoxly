import Redis from 'ioredis';
import { CACHE_TTL } from '../config/cache-ttl';

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.REDIS_URL;
  
  if (!url) {
    console.warn('REDIS_URL not configured – Redis cache disabled');
    return null;
  }

  try {
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('Redis connection failed after 3 retries, disabling cache');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      enableReadyCheck: true,
      lazyConnect: false,
      // Add timeout to prevent hanging
      connectTimeout: 5000,
      commandTimeout: 5000,
    });

    redisInstance.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redisInstance.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisInstance.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    return redisInstance;
  } catch (err) {
    console.error('Failed to initialize Redis client:', err);
    return null;
  }
}

export class RedisCache<T> {
  private client: Redis | null;

  constructor() {
    this.client = getRedis();
  }

  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  async set(key: string, data: T, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('Redis not available, skipping set');
      return;
    }
    try {
      const serialized = JSON.stringify(data);
      if (!serialized || serialized === 'undefined') {
        console.warn('Cannot serialize empty data for key:', key);
        return;
      }
      await this.client!.setex(key, ttlSeconds, serialized);
      console.log(`✅ Redis set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }

  async get(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      console.warn('Redis not available, skipping get');
      return null;
    }
    try {
      const value = await this.client!.get(key);
      
      // Check if value exists and is valid
      if (!value) {
        console.log(`❌ Redis miss: ${key} (no value)`);
        return null;
      }
      
      if (value === 'null' || value === 'undefined') {
        console.log(`❌ Redis miss: ${key} (null/undefined value)`);
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        console.log(`✅ Redis hit: ${key} (${value.length} bytes)`);
        return parsed as T;
      } catch (parseError) {
        console.error(`❌ Redis parse error for ${key}:`, parseError);
        console.error(`Raw value (first 100 chars): ${value.substring(0, 100)}`);
        // Delete corrupted entry
        await this.client!.del(key);
        return null;
      }
    } catch (err) {
      console.error('Redis get error:', err);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.del(key);
      console.log(`✅ Redis delete: ${key}`);
    } catch (err) {
      console.error('Redis del error:', err);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (err) {
      return false;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.flushall();
      console.log('✅ Redis cache flushed');
    } catch (err) {
      console.error('Redis flush error:', err);
    }
  }
}