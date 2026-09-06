/**
 * Dependency Injection Container
 * Singleton instances of all repositories
 * 
 * Usage:
 * import { userRepository, orderRepository } from '@/lib/container'
 * 
 * const user = await userRepository.findById(userId)
 */

import prisma from './prisma'
import redis from './redis'
import { UserRepository } from './repositories/user.repository'
import { OrderRepository } from './repositories/order.repository'
import { ProgressRepository } from './repositories/progress.repository'
import { LessonRepository } from './repositories/lesson.repository'

// Initialize singleton repositories
export const userRepository = new UserRepository(prisma, redis)
export const orderRepository = new OrderRepository(prisma, redis)
export const progressRepository = new ProgressRepository(prisma, redis)
export const lessonRepository = new LessonRepository(prisma, redis)

/**
 * Export all repositories as a single object for convenience
 * Usage: const { userRepository, orderRepository } = repositories
 */
export const repositories = {
  user: userRepository,
  order: orderRepository,
  progress: progressRepository,
  lesson: lessonRepository,
}

/**
 * Health check function
 * Verify database and Redis connections are working
 */
export async function checkContainerHealth(): Promise<{
  database: boolean
  redis: boolean
  error?: string
}> {
  try {
    // Test Prisma connection
    await prisma.$queryRaw`SELECT 1`

    // Test Redis connection
    await redis.ping()

    return { database: true, redis: true }
  } catch (error) {
    return {
      database: false,
      redis: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cleanup function for graceful shutdown
 */
export async function cleanupContainer(): Promise<void> {
  await Promise.all([prisma.$disconnect(), redis.disconnect()])
}
