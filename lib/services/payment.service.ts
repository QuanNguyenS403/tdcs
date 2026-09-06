/**
 * Payment Service - Core business logic for payment processing
 * 
 * Responsibilities:
 * - Create pending orders with business rules
 * - Process bank webhooks with idempotency
 * - Atomic payment confirmation (order + user upgrade)
 * - Handle order expiration
 */

import { Order } from '@prisma/client'
import { EventBus } from '@/lib/events/event-bus'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
import {
  BusinessError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/business.error'
import {
  PlanDowngradeError,
  PaymentAmountMismatchError,
  DuplicateTransactionError,
  OrderNotFoundError,
} from '@/lib/errors/domain.error'
import logger from '@/lib/logger'

// Plan pricing (VND)
export const PLAN_PRICES: Record<string, number> = {
  BASIC: 99000,
  PRO: 299000,
  EXPERT: 699000,
  NONE: 0,
}

// Plan hierarchy for downgrade validation
const PLAN_HIERARCHY: Record<string, number> = {
  NONE: 0,
  REGISTERED: 1,
  BASIC: 2,
  PRO: 3,
  EXPERT: 4,
}

export interface BankTransaction {
  transactionId: string
  amount: number
  senderName: string
  description: string
  transactionDate: Date
}

export interface ProcessResult {
  status: 'SUCCESS' | 'DUPLICATE' | 'NO_MATCH' | 'ORDER_NOT_FOUND' | 'ORDER_NOT_PENDING' | 'AMOUNT_MISMATCH'
  message?: string
  order?: Order
  user?: any
  diff?: number
}

export class PaymentService {
  constructor(
    private orderRepo: OrderRepository,
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}

  /**
   * Create a pending order for purchase
   * Business Rules:
   * 1. Reuse existing pending order if same plan
   * 2. Prevent plan downgrade
   * 3. Generate transfer code with specific format
   */
  async createPendingOrder(userId: string, planType: string): Promise<Order> {
    logger.info({ userId, planType }, 'Creating pending order')

    // Validate plan type
    if (!PLAN_PRICES[planType]) {
      throw new BusinessError(`Invalid plan type: ${planType}`, 'INVALID_PLAN_TYPE')
    }

    // Get user
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    // Rule 1: Reuse active pending order if same plan
    const existingOrder = await this.orderRepo.findByTransferCode(
      this.generateTransferCode(userId, planType)
    )
    if (existingOrder && existingOrder.status === 'PENDING') {
      logger.info(
        { userId, planType, orderId: existingOrder.id },
        'Reusing existing pending order'
      )
      return existingOrder
    }

    // Rule 2: Prevent downgrade
    if (this.isDowngrade(user.planType || 'NONE', planType)) {
      throw new PlanDowngradeError(user.planType || 'NONE', planType)
    }

    // Rule 3: Generate transfer code
    const transferCode = this.generateTransferCode(userId, planType)

    // Create order
    const order = await this.orderRepo.create({
      userId,
      courseId: 'system', // Placeholder for system orders
      amount: PLAN_PRICES[planType],
      transferCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    logger.info(
      { userId, orderId: order.id, transferCode },
      'Pending order created'
    )
    return order
  }

  /**
   * Process webhook transaction from bank
   * Business Rules:
   * 1. Check idempotency - don't process duplicate transactions
   * 2. Extract transfer code from description
   * 3. Validate order exists and is pending
   * 4. Check amount with ±1000 VND tolerance
   * 5. Atomic: confirm order + upgrade user
   */
  async processWebhookTransaction(payload: BankTransaction): Promise<ProcessResult> {
    logger.info({ txnId: payload.transactionId }, 'Processing bank transaction webhook')

    try {
      // Check idempotency
      const isDuplicate = await this.orderRepo.findByTransferCode(
        `PROCESSED:${payload.transactionId}`
      )
      if (isDuplicate) {
        logger.warn({ txnId: payload.transactionId }, 'Duplicate transaction')
        throw new DuplicateTransactionError(payload.transactionId)
      }

      // Extract transfer code
      const transferCode = this.extractTransferCode(payload.description)
      if (!transferCode) {
        logger.warn({ description: payload.description }, 'No transfer code in description')
        return { status: 'NO_MATCH', message: 'Transfer code not found in description' }
      }

      // Find order
      const order = await this.orderRepo.findByTransferCode(transferCode)
      if (!order) {
        logger.warn({ transferCode }, 'Order not found')
        return { status: 'ORDER_NOT_FOUND', message: 'Order not found' }
      }

      // Check order status
      if (order.status !== 'PENDING') {
        logger.warn({ orderId: order.id, status: order.status }, 'Order not pending')
        return {
          status: 'ORDER_NOT_PENDING',
          message: `Order status is ${order.status}`,
        }
      }

      // Validate amount (±1000 VND tolerance)
      const amountDiff = Math.abs(payload.amount - order.amount)
      const AMOUNT_TOLERANCE = 1000

      if (amountDiff > AMOUNT_TOLERANCE) {
        logger.error(
          { orderId: order.id, expected: order.amount, actual: payload.amount },
          'Amount mismatch'
        )
        await this.eventBus.emit('payment.amount_mismatch', {
          orderId: order.id,
          expectedAmount: order.amount,
          actualAmount: payload.amount,
          difference: amountDiff,
        })
        throw new PaymentAmountMismatchError(order.amount, payload.amount, amountDiff)
      }

      // Atomic: confirm payment
      const { order: confirmed, user } = await this.orderRepo.confirmPayment(
        order.id,
        payload.transactionId
      )

      logger.info({ orderId: confirmed.id, userId: confirmed.userId }, 'Payment confirmed')

      // Emit domain event
      await this.eventBus.emit('payment.confirmed', {
        orderId: confirmed.id,
        userId: confirmed.userId,
        amount: confirmed.amount,
        planType: 'BASIC', // TODO: store planType in order
        email: user.email,
        name: user.name,
      })

      return { status: 'SUCCESS', order: confirmed, user }
    } catch (error) {
      if (error instanceof DuplicateTransactionError) {
        return { status: 'DUPLICATE', message: error.message }
      }
      if (error instanceof PaymentAmountMismatchError) {
        return {
          status: 'AMOUNT_MISMATCH',
          message: error.message,
          diff: error.context?.diff,
        }
      }
      throw error
    }
  }

  /**
   * Mark stale orders as expired (cron job)
   */
  async expireStaleOrders(): Promise<number> {
    logger.info('Expiring stale orders')
    const count = await this.orderRepo.expireStaleOrders()
    logger.info({ count }, 'Stale orders expired')
    return count
  }

  /**
   * Generate transfer code format: CSGK{6 chars}{2 chars}
   * Example: CSGK123ABC CB
   */
  private generateTransferCode(userId: string, planType: string): string {
    const shortId = userId.replace(/-/g, '').slice(0, 6).toUpperCase()
    const planCode: Record<string, string> = {
      BASIC: 'CB',
      PRO: 'CN',
      EXPERT: 'CG',
      NONE: 'XX',
    }
    return `CSGK${shortId}${planCode[planType] || 'XX'}`
  }

  /**
   * Extract transfer code from payment description
   * Pattern: CSGK{6 alphanumeric}{2 letters}
   */
  private extractTransferCode(description: string): string | null {
    const match = description.toUpperCase().match(/CSGK[A-Z0-9]{6}(CB|CN|CG|XX)/)
    return match ? match[0] : null
  }

  /**
   * Check if requested plan is a downgrade
   */
  private isDowngrade(currentPlan: string, requestedPlan: string): boolean {
    const currentLevel = PLAN_HIERARCHY[currentPlan] || 0
    const requestedLevel = PLAN_HIERARCHY[requestedPlan] || 0
    return requestedLevel < currentLevel
  }
}
