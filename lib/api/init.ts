/**
 * API Initialization & Bootstrap
 * 
 * Call this during application startup to register all event handlers
 * and initialize the API layer.
 */

import { EventBus, eventBus } from '@/lib/events/event-bus'
import { registerEventHandlers } from '@/lib/events/handlers'
import { checkContainerHealth } from '@/lib/container'
import logger from '@/lib/logger'

/**
 * Initialize API layer
 * Call during Next.js app startup
 */
export async function initializeApi() {
  logger.info('Initializing API layer...')

  try {
    // 1. Check container health (DB + Redis)
    const health = await checkContainerHealth()
    if (!health.database || !health.redis) {
      throw new Error(`Health check failed: DB=${health.database}, Redis=${health.redis}`)
    }
    logger.info('✓ Container health check passed')

    // 2. Register event handlers
    registerEventHandlers(eventBus)
    logger.info('✓ Event handlers registered')

    // 3. Log API routes info
    logger.info(`API Layer initialized successfully`)
    logger.info(`Environment: ${process.env.NODE_ENV}`)
    logger.info(`App URL: ${process.env.NEXT_PUBLIC_APP_URL}`)

    return { success: true }
  } catch (error) {
    logger.error({ error }, 'Failed to initialize API layer')
    throw error
  }
}

/**
 * Usage in Next.js:
 * 
 * // lib/init.ts or app/layout.tsx
 * import { initializeApi } from '@/lib/api/init'
 * 
 * if (typeof window === 'undefined') {
 *   initializeApi().catch(console.error)
 * }
 */
