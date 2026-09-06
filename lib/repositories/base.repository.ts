import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly redis: Redis,
    protected readonly cachePrefix: string
  ) {}

  /**
   * Cache-Aside pattern: check cache first, then fetch from DB
   */
  protected async getCached<R>(
    key: string,
    ttl: number,
    fetcher: () => Promise<R>
  ): Promise<R> {
    const cacheKey = `${this.cachePrefix}:${key}`
    
    // Try to get from cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Cache miss: fetch from database
    const data = await fetcher()
    
    // Store in cache with TTL
    if (data !== null) {
      await this.redis.setex(
        cacheKey,
        ttl,
        JSON.stringify(data)
      )
    }
    
    return data
  }

  /**
   * Invalidate cache keys for this repository
   */
  protected async invalidateCache(...keys: string[]): Promise<void> {
    if (keys.length === 0) return
    
    const cacheKeys = keys.map(k => `${this.cachePrefix}:${k}`)
    await this.redis.del(...cacheKeys)
  }

  /**
   * Clear all cache for this repository using pattern
   */
  protected async invalidateCachePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${this.cachePrefix}:${pattern}`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  // Abstract methods to be implemented by subclasses
  abstract findById(id: string): Promise<T | null>
  abstract create(data: CreateDTO): Promise<T>
  abstract update(id: string, data: UpdateDTO): Promise<T>
  abstract delete(id: string): Promise<void>
}
