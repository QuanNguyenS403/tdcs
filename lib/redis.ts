import { Redis } from 'ioredis'

/**
 * Singleton Redis client.
 * Gracefully handles missing REDIS_URL in development by returning
 * a stub that always rejects — callers (rate limiter) have fail-open logic.
 */
function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    // Return a stub instance that will fail on every call.
    // RateLimiter.check() catches errors and fail-opens, so this is safe.
    console.warn('[redis] REDIS_URL not set — rate limiting disabled (fail-open)')
  }

  const client = new Redis(url || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null, // Don't retry indefinitely — fail fast
    enableReadyCheck: false,    // Don't block on ready
    lazyConnect: true,          // Don't connect until first command
    retryStrategy: () => null,  // Give up immediately when no real server
  })

  client.on('error', () => {
    // Suppress ioredis error events so Node doesn't crash with unhandled error
  })

  return client
}

const redis = createRedisClient()

// Key patterns:
// "session:{userId}"          — TTL: 24h
// "rate:{ip}:{endpoint}"      — TTL: 1m
// "order:pending:{userId}"    — TTL: 24h
// "lesson:url:{lessonId}"     — TTL: 1h (signed URL cache)
// "progress:{userId}:summary" — TTL: 5m
// "admin:stats"               — TTL: 5m

export default redis

export async function setWithExpiry(key: string, value: any, ttlSeconds: number) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  await redis.setex(key, ttlSeconds, serialized)
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await redis.get(key)
  return value ? JSON.parse(value) : null
}

export async function deleteKey(key: string) {
  await redis.del(key)
}

export async function clearPattern(pattern: string) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
