/**
 * GET /api/v1/orders/:id
 * Get order details
 */

import { NextRequest } from 'next/server'
import { withGetApi } from '@/lib/api/handler'
import { orderRepository } from '@/lib/container'
import { NotFoundError, ForbiddenError } from '@/lib/errors/business.error'
import logger from '@/lib/logger'

export const GET = withGetApi(
  async (req, context) => {
    const orderId = context.params?.id

    if (!orderId) {
      throw new NotFoundError('Order', 'unknown')
    }

    logger.info({ orderId, userId: context.session?.user?.id }, 'Fetching order')

    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundError('Order', orderId)
    }

    // Verify ownership
    if (order.userId !== context.session?.user?.id) {
      throw new ForbiddenError('Cannot access this order')
    }

    return {
      id: order.id,
      transferCode: order.transferCode,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
    }
  },
  { requireAuth: true }
)
