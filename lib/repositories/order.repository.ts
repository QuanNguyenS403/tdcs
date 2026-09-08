import { PrismaClient, Order, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { BaseRepository } from './base.repository'

export function planTypeFromTransferCode(transferCode: string): string {
  const packageCode = transferCode.slice(-2)
  if (!/^[AB][1-3]$/.test(packageCode)) {
    throw new Error(`Unsupported package code: ${packageCode}`)
  }
  return packageCode
}

function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  result.setMonth(result.getMonth() + months)
  return result
}

export interface CreateOrderDTO {
  userId: string
  courseId?: string
  packageId?: string
  amount: number
  transferCode: string
  expiresAt?: Date
}

export interface UpdateOrderDTO {
  status?: string
  bankTransactionId?: string
  paidAt?: Date
}

export class OrderRepository extends BaseRepository<Order, CreateOrderDTO, UpdateOrderDTO> {
  constructor(prisma: PrismaClient, redis: Redis) {
    super(prisma, redis, 'order')
  }

  async findById(id: string, bypassCache: boolean = false): Promise<(Order & { user?: any; course?: any; package?: any }) | null> {
    return this.getCached(`id:${id}`, 300, () =>
      this.prisma.order.findUnique({
        where: { id },
        include: { user: true, course: true, package: true },
      }),
      bypassCache
    )
  }

  async findByTransferCode(code: string, bypassCache: boolean = false): Promise<(Order & { user?: any; course?: any; package?: any }) | null> {
    return this.getCached(`code:${code}`, 60, () =>
      this.prisma.order.findUnique({
        where: { transferCode: code },
        include: { user: true, course: true, package: true },
      }),
      bypassCache
    )
  }

  async create(data: CreateOrderDTO): Promise<Order> {
    const order = await this.prisma.order.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        packageId: data.packageId,
        amount: data.amount,
        transferCode: data.transferCode,
        status: 'PENDING',
        expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
      },
      include: { user: true, course: true, package: true },
    })

    return order
  }

  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        bankTransactionId: data.bankTransactionId,
        paidAt: data.paidAt,
      },
      include: { user: true, course: true },
    })

    // Invalidate cache
    await this.invalidateCache(`id:${id}`)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({ where: { id } })
    await this.invalidateCache(`id:${id}`)
  }

  /**
   * Confirm payment atomically with strict idempotency and conditional update:
   * 1. Only transitions from PENDING -> COMPLETED
   * 2. Preserves User administrative role
   * 3. Uses calendar months calculation for content access expiration
   */
  async confirmPayment(
    orderId: string,
    bankTxnId: string
  ): Promise<{ order: Order; user: any }> {
    const order = await this.findById(orderId, true)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Order ${orderId} is not in PENDING status (current: ${order.status})`)
    }

    const planType = planTypeFromTransferCode(order.transferCode)
    const activatedAt = new Date()

    return await this.prisma.$transaction(async (tx) => {
      // 1. Conditional update to prevent double-confirmation race condition
      const updateCount = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: {
          status: 'COMPLETED',
          bankTransactionId: bankTxnId,
          paidAt: activatedAt,
        },
      })

      if (updateCount.count === 0) {
        throw new Error(`Order ${orderId} status changed concurrently`)
      }

      // 2. Fetch fresh order
      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { course: true, package: true },
      })

      // 3. Update User plan info without altering administrative role
      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: {
          planType,
          purchasedAt: activatedAt,
        },
      })

      // 4. Create active subscription with calendar months
      if (order.packageId && order.package) {
        const contentAccessExpiresAt = addCalendarMonths(activatedAt, order.package.contentAccessMonths)
        const supportExpiresAt = order.package.supportDays
          ? new Date(activatedAt.getTime() + order.package.supportDays * 24 * 60 * 60 * 1000)
          : null

        await tx.subscription.create({
          data: {
            userId: order.userId,
            packageId: order.packageId,
            status: 'active',
            amount: BigInt(order.amount),
            paymentReference: bankTxnId,
            activatedAt,
            contentAccessExpiresAt,
            supportExpiresAt,
            confirmedAt: activatedAt,
          },
        })
      }

      return { order: updatedOrder, user: updatedUser }
    }).finally(async () => {
      // Invalidate related caches
      await this.invalidateCache(`id:${orderId}`, `code:${order.transferCode}`)
    })
  }

  /**
   * Expire stale pending orders
   */
  async expireStaleOrders(): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    // Invalidate pattern cache for both code:* and id:*
    await this.invalidateCachePattern('code:*')
    await this.invalidateCachePattern('id:*')

    return result.count
  }

  /**
   * Get user's order history
   */
  async getUserOrders(userId: string, limit: number = 10): Promise<Order[]> {
    return this.getCached(`user:${userId}:orders`, 300, () =>
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { course: true },
      })
    )
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStats(filters: { startDate?: Date; endDate?: Date } = {}) {
    const where: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
    }

    if (filters.startDate) {
      where.paidAt = { gte: filters.startDate }
    }

    if (filters.endDate) {
      where.paidAt = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        lte: filters.endDate,
      }
    }

    const [totalOrders, totalRevenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { amount: true },
      }),
    ])

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.amount || 0,
      averageOrderValue:
        totalOrders > 0 ? Math.round((totalRevenue._sum.amount || 0) / totalOrders) : 0,
    }
  }
}
