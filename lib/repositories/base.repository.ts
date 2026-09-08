import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import logger from '@/lib/logger'

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly redis: Redis,
    protected readonly cachePrefix: string
  ) {}

  /**
   * Cache-Aside pattern: check cache first, then fetch from DB.
   * - Gracefully falls back to DB if Redis is unavailable or fails.
   * - Serializes BigInt safely into decimal strings to avoid JSON.stringify crash.
   */
  protected async getCached<R>(
    key: string,
    ttl: number,
    fetcher: () => Promise<R>,
    bypassCache: boolean = false
  ): Promise<R> {
    const cacheKey = `${this.cachePrefix}:${key}`

    if (!bypassCache) {
      try {
        const cached = await this.redis.get(cacheKey)
        if (cached) {
          return JSON.parse(cached)
        }
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Redis read failed, falling back to database')
      }
    }

    // Cache miss or bypass: fetch from database
    const data = await fetcher()

    // Store in cache with TTL if not null/undefined
    if (data !== null && data !== undefined && !bypassCache) {
      try {
        const serialized = JSON.stringify(data, (_k, v) =>
          typeof v === 'bigint' ? v.toString() : v
        )
        await this.redis.setex(cacheKey, ttl, serialized)
      } catch (error) {
        logger.warn({ error, cacheKey }, 'Failed to cache data')
      }
    }

    return data
  }

  /**
   * Invalidate cache keys for this repository safely
   */
  protected async invalidateCache(...keys: string[]): Promise<void> {
    if (keys.length === 0) return

    try {
      const cacheKeys = keys.map(k => `${this.cachePrefix}:${k}`)
      await this.redis.del(...cacheKeys)
    } catch (error) {
      logger.warn({ error, keys }, 'Failed to invalidate cache keys')
    }
  }

  /**
   * Clear all cache for this repository using SCAN to prevent Redis blocking
   */
  protected async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      const matchPattern = `${this.cachePrefix}:${pattern}`
      let cursor = '0'
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100)
        cursor = nextCursor
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } while (cursor !== '0')
    } catch (error) {
      logger.warn({ error, pattern }, 'Failed to invalidate cache pattern')
    }
  }

  // Abstract methods to be implemented by subclasses
  abstract findById(id: string): Promise<T | null>
  abstract create(data: CreateDTO): Promise<T>
  abstract update(id: string, data: UpdateDTO): Promise<T>
  abstract delete(id: string): Promise<void>
}
