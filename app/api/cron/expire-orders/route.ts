/**
 * Cron Job: /api/cron/expire-orders
 * Expire stale pending orders
 * 
 * Called by Vercel Cron (vercel.json)
 * Authorization: CRON_SECRET header
 */

import { NextRequest } from 'next/server'
import { orderRepository } from '@/lib/container'
import { jsonError, jsonResponse, successResponse } from '@/lib/api/response'
import logger from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
    if (cronSecret !== process.env.CRON_SECRET) {
      logger.error('Invalid cron secret')
      return jsonError('UNAUTHORIZED', 'Invalid cron secret', 401)
    }

    logger.info('Cron job: Expiring stale orders')

    const count = await orderRepository.expireStaleOrders()

    logger.info({ count }, 'Cron job: Stale orders expired')

    return jsonResponse(
      successResponse({ expiredCount: count, message: 'Orders expired successfully' }),
      200
    )
  } catch (error) {
    logger.error({ error }, 'Cron job error')
    return jsonError('CRON_ERROR', 'Cron job failed', 500)
  }
}
