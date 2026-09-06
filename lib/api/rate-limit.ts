/**
 * Rate limiting with Redis
 * Token bucket algorithm: max N requests per window
 */

import Redis from 'ioredis'
import logger from '@/lib/logger'

export interface RateLimitOptions {
  max: number // Max requests
  window: number // Time window in seconds
  keyPrefix?: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

export class RateLimiter {
  constructor(private redis: Redis) {}

  /**
   * Check if request is allowed
   * Uses token bucket algorithm
   */
  async check(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const fullKey = `${options.keyPrefix || 'rate-limit'}:${key}`
    const now = Date.now()

    try {
      // Lua script for atomic operation
      const script = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local current = redis.call('GET', key)
        if not current then
          redis.call('SET', key, 1)
          redis.call('EXPIRE', key, window)
          return {1, limit - 1, now + window * 1000}
        end
        
        current = tonumber(current)
        if current >= limit then
          local ttl = redis.call('TTL', key)
          return {current, 0, now + ttl * 1000}
        end
        
        current = current + 1
        redis.call('INCR', key)
        return {current, limit - current, now + window * 1000}
      `

      const result = await this.redis.eval(script, 1, fullKey, options.max, options.window, now)
      const [requests, remaining, resetAt] = result as number[]

      const allowed = requests <= options.max

      logger.debug(
        { key, requests, limit: options.max, allowed },
        'Rate limit check'
      )

      return {
        allowed,
        limit: options.max,
        remaining: Math.max(0, remaining),
        resetAt: new Date(resetAt),
      }
    } catch (error) {
      logger.error({ error, key }, 'Rate limit check failed')
      // Fail open: allow request if Redis fails
      return {
        allowed: true,
        limit: options.max,
        remaining: options.max,
        resetAt: new Date(Date.now() + options.window * 1000),
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string, keyPrefix: string = 'rate-limit'): Promise<void> {
    const fullKey = `${keyPrefix}:${key}`
    await this.redis.del(fullKey)
  }

  /**
   * Get remaining requests without incrementing
   */
  async getRemainingRequests(
    key: string,
    options: RateLimitOptions
  ): Promise<number> {
    const fullKey = `${options.keyPrefix || 'rate-limit'}:${key}`
    const current = await this.redis.get(fullKey)
    return Math.max(0, options.max - (parseInt(current || '0') || 0))
  }
}

/**
 * Extract client IP from request
 */
export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const clientIP = req.headers.get('cf-connecting-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (clientIP) {
    return clientIP
  }

  return 'unknown'
}
