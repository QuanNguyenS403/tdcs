/**
 * Upgrade Plan Use Case
 * 
 * Orchestrates the plan upgrade process
 * 
 * Flow:
 * 1. Create pending order
 * 2. Generate transfer code
 * 3. Return order with payment instructions
 */

import { Order } from '@prisma/client'
import { PaymentService } from '@/lib/services/payment.service'
import { NotificationService } from '@/lib/services/notification.service'
import { UserRepository } from '@/lib/repositories/user.repository'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, BusinessError } from '@/lib/errors/business.error'
import logger from '@/lib/logger'

export interface UpgradePlanRequest {
  userId: string
  planType: string
}

export interface UpgradePlanResult {
  order: Order
  transferCode: string
  amount: number
  accountNumber: string
  bankName: string
  instructions: string
}

export class UpgradePlanUseCase {
  constructor(
    private paymentService: PaymentService,
    private userRepo: UserRepository,
    private notificationService: NotificationService,
    private eventBus: EventBus
  ) {}

  async execute(request: UpgradePlanRequest): Promise<UpgradePlanResult> {
    logger.info({ userId: request.userId, plan: request.planType }, 'Attempting plan upgrade')

    try {
      // Validate user exists
      const user = await this.userRepo.findById(request.userId)
      if (!user) {
        throw new NotFoundError('User', request.userId)
      }

      // Create pending order (handles all business rules)
      const order = await this.paymentService.createPendingOrder(
        request.userId,
        request.planType
      )

      logger.info(
        { userId: request.userId, orderId: order.id },
        'Pending order created for plan upgrade'
      )

      // Prepare payment instructions
      const accountNumber = process.env.BANK_ACCOUNT_NO || '1234567890'
      const bankName = process.env.BANK_ID || 'VCB'

      const instructions = `
Hướng dẫn thanh toán:
1. Chuyển khoản từ ứng dụng ngân hàng của bạn
2. Nội dung chuyển khoản: ${order.transferCode}
3. Số tài khoản: ${accountNumber}
4. Ngân hàng: ${bankName}
5. Số tiền: ${order.amount.toLocaleString('vi-VN')} VND

Ghi chú: Nội dung chuyển khoản phải chính xác để hệ thống tự động xác nhận thanh toán.
Thời gian xác nhận: 5-10 phút (có thể lâu hơn vào giờ cao điểm)
Hết hạn: 24 giờ từ lúc tạo đơn
      `.trim()

      const result: UpgradePlanResult = {
        order,
        transferCode: order.transferCode,
        amount: order.amount,
        accountNumber,
        bankName,
        instructions,
      }

      // Send confirmation email with payment instructions
      try {
        await this.notificationService.sendEmail({
          to: user.email,
          subject: `Hướng dẫn thanh toán gói ${request.planType}`,
          html: `
<h2>Hướng dẫn thanh toán</h2>
<p>Cảm ơn ${user.name},</p>
<p>Bạn vừa tạo đơn nâng cấp gói <strong>${request.planType}</strong></p>
<div style="border: 1px solid #ccc; padding: 20px; margin: 20px 0;">
  <h3>Chi tiết thanh toán</h3>
  <p><strong>Số tiền:</strong> ${order.amount.toLocaleString('vi-VN')} VND</p>
  <p><strong>Nội dung CK:</strong> ${order.transferCode}</p>
  <p><strong>Số tài khoản:</strong> ${accountNumber}</p>
  <p><strong>Ngân hàng:</strong> ${bankName}</p>
  <p><strong>Hết hạn:</strong> 24 giờ</p>
</div>
<p>Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong 5-10 phút.</p>
<p>Nếu không nhận được xác nhận, vui lòng liên hệ <a href="mailto:${process.env.ADMIN_EMAIL}">admin</a></p>
          `,
        })
      } catch (error) {
        logger.error({ error, userId: request.userId }, 'Failed to send payment instructions')
      }

      logger.info({ userId: request.userId, orderId: order.id }, 'Plan upgrade initiated')

      return result
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      if (error instanceof BusinessError) {
        throw error
      }

      logger.error({ userId: request.userId, error }, 'Unexpected error in plan upgrade')
      throw new BusinessError(
        'Failed to initiate plan upgrade',
        'PLAN_UPGRADE_ERROR'
      )
    }
  }

  /**
   * Check upgrade eligibility
   */
  async checkEligibility(userId: string): Promise<{
    eligible: boolean
    reason?: string
    currentPlan?: string
    availablePlans?: string[]
  }> {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      return { eligible: false, reason: 'User not found' }
    }

    // Prevent downgrade - only allow same or upgrade
    const planHierarchy: Record<string, number> = {
      NONE: 0,
      REGISTERED: 1,
      BASIC: 2,
      PRO: 3,
      EXPERT: 4,
    }

    const currentLevel = planHierarchy[user.planType || 'NONE'] || 0
    const availablePlans = Object.entries(planHierarchy)
      .filter(([_, level]) => level > currentLevel)
      .map(([plan]) => plan)

    return {
      eligible: availablePlans.length > 0,
      currentPlan: user.planType || 'NONE',
      availablePlans,
    }
  }
}
