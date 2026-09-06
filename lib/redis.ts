import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000)
})

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
