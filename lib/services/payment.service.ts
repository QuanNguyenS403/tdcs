/**
 * Payment Service - Core business logic for payment processing
 * 
 * Responsibilities:
 * - Create pending orders with business rules (screening checks, entropy in transfer codes)
 * - Process bank webhooks with strict idempotency using PaymentTransaction ledger
 * - Atomic payment confirmation (order + user upgrade)
 * - Handle order expiration and exceptions (manual review routing)
 */

import crypto from 'crypto'
import { Order } from '@prisma/client'
import { EventBus } from '@/lib/events/event-bus'
import { OrderRepository, planTypeFromTransferCode } from '@/lib/repositories/order.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
import {
  BusinessError,
  NotFoundError,
} from '@/lib/errors/business.error'
import {
  PaymentAmountMismatchError,
  DuplicateTransactionError,
} from '@/lib/errors/domain.error'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const PACKAGE_CODES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'] as const

export interface BankTransaction {
  transactionId: string
  amount: number
  senderName: string
  description: string
  transactionDate: Date
}

export interface ProcessResult {
  status: 'SUCCESS' | 'DUPLICATE' | 'NO_MATCH' | 'ORDER_NOT_FOUND' | 'ORDER_NOT_PENDING' | 'AMOUNT_MISMATCH' | 'MANUAL_REVIEW'
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
   * 1. Reuse existing valid pending order for same package if not expired
   * 2. Verify screening requirement if package requires screening
   * 3. Generate high-entropy transfer code
   */
  async createPendingOrder(userId: string, packageCode: string): Promise<Order> {
    logger.info({ userId, packageCode }, 'Creating pending order')

    if (!PACKAGE_CODES.includes(packageCode as typeof PACKAGE_CODES[number])) {
      throw new BusinessError(`Invalid package code: ${packageCode}`, 'INVALID_PACKAGE_CODE')
    }

    const academyPackage = await prisma.package.findUnique({ where: { code: packageCode } })
    if (!academyPackage || !academyPackage.isActive) throw new NotFoundError('Package', packageCode)
    if (academyPackage.legalReviewStatus === 'pending') {
      throw new BusinessError('Gói học chưa hoàn tất rà soát pháp lý', 'PACKAGE_NOT_OPEN')
    }
    if (!academyPackage.priceFounder) {
      throw new BusinessError('Gói học chưa có giá thanh toán', 'PACKAGE_PRICE_UNAVAILABLE')
    }

    // Screening check (SYS-08): if package requires screening, user must have an approved application
    if (academyPackage.requiresScreening) {
      const application = await prisma.application.findFirst({
        where: {
          userId,
          packageId: academyPackage.id,
          status: 'approved',
        },
      })
      if (!application) {
        throw new BusinessError(
          'Gói học yêu cầu xét duyệt hồ sơ đầu vào. Vui lòng nộp hồ sơ và chờ phê duyệt trước khi thanh toán.',
          'SCREENING_REQUIRED'
        )
      }
    }

    // Verify user exists
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new NotFoundError('User', userId)
    }

    // Rule 1: Reuse active, unexpired pending order if same package and owner
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        packageId: academyPackage.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { user: true, course: true, package: true },
    })

    if (existingOrder) {
      logger.info(
        { userId, packageCode, orderId: existingOrder.id },
        'Reusing existing active pending order'
      )
      return existingOrder
    }

    // Generate high-entropy transfer code
    const transferCode = this.generateTransferCode(packageCode)

    // Create order with 24h expiration
    const order = await this.orderRepo.create({
      userId,
      packageId: academyPackage.id,
      amount: Number(academyPackage.priceFounder),
      transferCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    logger.info(
      { userId, orderId: order.id, transferCode },
      'Pending order created'
    )
    return order
  }

  /**
   * Process webhook transaction from bank with idempotency ledger
   */
  async processWebhookTransaction(payload: BankTransaction): Promise<ProcessResult> {
    logger.info({ txnId: payload.transactionId }, 'Processing bank transaction webhook')

    try {
      // 1. Idempotency Check: check durable PaymentTransaction ledger
      const existingTxn = await prisma.paymentTransaction.findUnique({
        where: {
          provider_providerTransactionId: {
            provider: 'casso',
            providerTransactionId: payload.transactionId,
          },
        },
        include: { order: true },
      })

      if (existingTxn) {
        logger.warn({ txnId: payload.transactionId, status: existingTxn.status }, 'Duplicate provider transaction')
        return {
          status: 'DUPLICATE',
          message: `Transaction ${payload.transactionId} was already processed with status ${existingTxn.status}`,
          order: existingTxn.order || undefined,
        }
      }

      // Helper to record transaction status
      const recordLedger = async (status: string, orderId?: string) => {
        try {
          await prisma.paymentTransaction.create({
            data: {
              provider: 'casso',
              providerTransactionId: payload.transactionId,
              amount: BigInt(payload.amount),
              description: payload.description,
              senderName: payload.senderName || null,
              transactionDate: payload.transactionDate,
              status,
              orderId: orderId || null,
              rawPayload: payload as any,
            },
          })
        } catch (err) {
          logger.warn({ err, txnId: payload.transactionId }, 'Failed to record payment transaction ledger')
        }
      }

      // 2. Extract transfer code
      const transferCode = this.extractTransferCode(payload.description)
      if (!transferCode) {
        logger.warn({ description: payload.description }, 'No transfer code in description')
        await recordLedger('NO_MATCH')
        return { status: 'NO_MATCH', message: 'Transfer code not found in description' }
      }

      // 3. Find order fresh from DB
      const order = await this.orderRepo.findByTransferCode(transferCode, true)
      if (!order) {
        logger.warn({ transferCode }, 'Order not found')
        await recordLedger('ORDER_NOT_FOUND')
        return { status: 'ORDER_NOT_FOUND', message: 'Order not found' }
      }

      // 4. Check order status
      if (order.status !== 'PENDING') {
        logger.warn({ orderId: order.id, status: order.status }, 'Order not pending')
        await recordLedger('ORDER_NOT_PENDING', order.id)
        return {
          status: 'ORDER_NOT_PENDING',
          message: `Order status is ${order.status}`,
          order,
        }
      }

      // 5. Check order expiration (SYS-07): if payment arrives after expiration, route to manual review
      if (new Date() > new Date(order.expiresAt)) {
        logger.warn({ orderId: order.id, expiresAt: order.expiresAt }, 'Payment received after order expiration')
        await recordLedger('MANUAL_REVIEW_EXPIRED', order.id)
        return {
          status: 'MANUAL_REVIEW',
          message: 'Thanh toán nhận sau khi đơn hết hạn. Đã chuyển sang trạng thái đối soát thủ công.',
          order,
        }
      }

      // 6. Validate amount (±1000 VND tolerance)
      const amountDiff = Math.abs(payload.amount - order.amount)
      const AMOUNT_TOLERANCE = 1000

      if (amountDiff > AMOUNT_TOLERANCE) {
        logger.error(
          { orderId: order.id, expected: order.amount, actual: payload.amount },
          'Amount mismatch'
        )
        await recordLedger('AMOUNT_MISMATCH', order.id)
        await this.eventBus.emit('payment.amount_mismatch', {
          orderId: order.id,
          expectedAmount: order.amount,
          actualAmount: payload.amount,
          difference: amountDiff,
        })
        throw new PaymentAmountMismatchError(order.amount, payload.amount, amountDiff)
      }

      // 7. Atomic: confirm payment
      const { order: confirmed, user } = await this.orderRepo.confirmPayment(
        order.id,
        payload.transactionId
      )

      // Record successful transaction in ledger
      await recordLedger('PROCESSED', confirmed.id)

      logger.info({ orderId: confirmed.id, userId: confirmed.userId }, 'Payment confirmed')

      // Emit domain event
      await this.eventBus.emit('payment.confirmed', {
        orderId: confirmed.id,
        userId: confirmed.userId,
        amount: confirmed.amount,
        planType: planTypeFromTransferCode(confirmed.transferCode),
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
   * Generate high-entropy transfer code format: MV{8 chars}{2 chars}
   * Example: MV4A9C2E7FB1
   */
  private generateTransferCode(packageCode: string): string {
    const randomEntropy = crypto.randomBytes(4).toString('hex').toUpperCase()
    return `MV${randomEntropy}${packageCode}`
  }

  /**
   * Extract transfer code from payment description
   * Matches both MV{8}{pkg} and legacy CSGK{6}{pkg}
   */
  private extractTransferCode(description: string): string | null {
    const match = description.toUpperCase().match(/(?:MV[A-Z0-9]{8}|CSGK[A-Z0-9]{6})[AB][1-3]/)
    return match ? match[0] : null
  }
}
