/**
 * POST /api/v1/orders
 * Create a pending order for plan purchase
 */

import { NextRequest } from 'next/server'
import { withPostApi } from '@/lib/api/handler'
import { CreateOrderSchema } from '@/lib/validations/order.schema'
import { orderRepository, userRepository } from '@/lib/container'
import { PaymentService } from '@/lib/services/payment.service'
import { eventBus } from '@/lib/events/event-bus'
import logger from '@/lib/logger'

const paymentService = new PaymentService(orderRepository, userRepository, eventBus)

export const POST = withPostApi(
  async (req, context) => {
    const { packageCode } = context.body as { packageCode: string }

    logger.info(
      { userId: context.session?.user?.id, packageCode },
      'Creating pending order'
    )

    try {
      const order = await paymentService.createPendingOrder(
        context.session!.user.id,
        packageCode
      )

      // Generate VietQR payment code (mock)
      const qrUrl = `https://api.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT_NO}-${order.amount}-${order.transferCode}`.replace(/\s+/g, '')

      return {
        orderId: order.id,
        transferCode: order.transferCode,
        amount: order.amount,
        bankAccount: process.env.BANK_ACCOUNT_NO,
        bankName: process.env.BANK_ID,
        qrUrl,
        expiresAt: order.expiresAt,
        instructions: `Chuyển khoản ${order.amount} VND với nội dung: ${order.transferCode}`,
      }
    } catch (error) {
      throw error
    }
  },
  CreateOrderSchema,
  {
    requireAuth: true,
    rateLimit: { max: 5, window: 60 }, // 5 requests per minute
  }
)

// Placeholder
const BANK_ID = process.env.BANK_ID || 'VCB'
const BANK_ACCOUNT_NO = process.env.BANK_ACCOUNT_NO || ''
