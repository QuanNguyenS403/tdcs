/**
 * Cron Job: remind the administrator about legal review gates older than 60 days.
 */

import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { NotificationService } from '@/lib/services/notification.service'
import { jsonError, jsonResponse, successResponse } from '@/lib/api/response'
import logger from '@/lib/logger'

const notificationService = new NotificationService()

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret (fail-closed: require configured secret)
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || expectedSecret.trim() === '' || cronSecret !== expectedSecret) {
    logger.error('Unauthorized cron execution attempt or CRON_SECRET not configured')
    return jsonError('UNAUTHORIZED', 'Invalid or unconfigured cron secret', 401)
  }

  try {
    const pendingPackages = await prisma.$queryRaw<Array<{
      code: string
      name: string
      created_at: Date
    }>>`
      SELECT code, name, created_at
      FROM packages
      WHERE legal_review_status = 'pending'
        AND created_at < NOW() - INTERVAL '60 days'
      ORDER BY created_at ASC
    `

    if (pendingPackages.length > 0) {
      await notificationService.alertAdmin({
        type: 'LEGAL_REVIEW_OVERDUE',
        severity: 'high',
        title: 'Gói đào tạo đang chờ rà soát pháp lý',
        message: 'Các gói dưới đây đã ở trạng thái pending quá 60 ngày và vẫn bị khóa bán hàng.',
        data: { packages: pendingPackages },
      })
    }

    logger.info({ count: pendingPackages.length }, 'Legal review reminder completed')
    return jsonResponse(successResponse({ reminded: pendingPackages.length }), 200)
  } catch (error) {
    logger.error({ error }, 'Legal review reminder failed')
    return jsonError('CRON_ERROR', 'Legal review reminder failed', 500)
  }
}