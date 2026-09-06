/**
 * POST /api/v1/certificate
 * Request certificate (only EXPERT plan users)
 */

import { NextRequest } from 'next/server'
import { withGetApi } from '@/lib/api/handler'
import { userRepository, progressRepository } from '@/lib/container'
import { IssueCertificateUseCase } from '@/lib/use-cases/issue-certificate.use-case'
import { NotificationService } from '@/lib/services/notification.service'
import { eventBus } from '@/lib/events/event-bus'
import { ForbiddenError } from '@/lib/errors/business.error'
import logger from '@/lib/logger'

export const POST = withGetApi(
  async (req, context) => {
    const userId = context.session!.user.id

    logger.info({ userId }, 'Requesting certificate')

    // Check EXPERT plan
    const user = await userRepository.findById(userId)
    if (!user || user.planType !== 'EXPERT') {
      throw new ForbiddenError('Certificate issuance requires EXPERT plan')
    }

    // Mock implementation - replace with actual certificate generation
    const notificationService = new NotificationService()

    // Check if already issued
    const certCode = `CSE-${new Date().getFullYear()}-MOCKCODE`
    
    await notificationService.sendCertificateEmail(
      { email: user.email, name: user.name },
      certCode
    )

    await eventBus.emit('certificate.issued', {
      userId,
      certCode,
      filePath: 'mock/path.pdf',
    })

    return {
      status: 'requested',
      message: 'Chứng chỉ của bạn đang được tạo. Vui lòng kiểm tra email.',
      certCode,
    }
  },
  { requireAuth: true, rateLimit: { max: 1, window: 3600 } } // 1 request per hour
)
