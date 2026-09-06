import { PrismaClient, Order, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { BaseRepository } from './base.repository'

export interface CreateOrderDTO {
  userId: string
  courseId: string
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

  async findById(id: string): Promise<Order | null> {
    return this.getCached(`id:${id}`, 300, () =>
      this.prisma.order.findUnique({
        where: { id },
        include: { user: true, course: true },
      })
    )
  }

  async findByTransferCode(code: string): Promise<(Order & { user?: any; course?: any }) | null> {
    return this.getCached(`code:${code}`, 60, () =>
      this.prisma.order.findUnique({
        where: { transferCode: code },
        include: { user: true, course: true },
      })
    )
  }

  async create(data: CreateOrderDTO): Promise<Order> {
    const order = await this.prisma.order.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        amount: data.amount,
        transferCode: data.transferCode,
        status: 'PENDING',
        expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
      },
      include: { user: true, course: true },
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
   * Confirm payment atomically: update order status and user plan
   */
  async confirmPayment(
    orderId: string,
    bankTxnId: string
  ): Promise<{ order: Order; user: any }> {
    const order = await this.findById(orderId)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Atomic transaction
    const [updatedOrder, updatedUser] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          bankTransactionId: bankTxnId,
          paidAt: new Date(),
        },
        include: { course: true },
      }),
      this.prisma.user.update({
        where: { id: order.userId },
        data: {
          role: 'BASIC', // Default role after purchase
          planType: 'BASIC',
          purchasedAt: new Date(),
        },
      }),
    ])

    // Invalidate related caches
    await this.invalidateCache(
      `id:${orderId}`,
      `code:${order.transferCode}`
    )

    return { order: updatedOrder, user: updatedUser }
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

    // Invalidate pattern cache
    await this.invalidateCachePattern('code:*')

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
