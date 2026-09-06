import { PrismaClient, User, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { BaseRepository } from './base.repository'

export interface CreateUserDTO {
  email: string
  name: string
  image?: string
  planType?: string
}

export interface UpdateUserDTO {
  name?: string
  image?: string
  planType?: string
  role?: string
}

export interface StudentFilters {
  plan?: string
  search?: string
  offset: number
  limit: number
}

export class UserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO> {
  constructor(prisma: PrismaClient, redis: Redis) {
    super(prisma, redis, 'user')
  }

  async findById(id: string): Promise<User | null> {
    return this.getCached(`id:${id}`, 300, () =>
      this.prisma.user.findUnique({ where: { id } })
    )
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.getCached(`email:${email}`, 300, () =>
      this.prisma.user.findUnique({ where: { email } })
    )
  }

  async create(data: CreateUserDTO): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        image: data.image,
        planType: data.planType || 'NONE',
      },
    })

    return user
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        image: data.image,
        planType: data.planType,
        role: data.role,
      },
    })

    // Invalidate all cache related to this user
    await this.invalidateCache(`id:${id}`, `email:${updated.email}`)
    return updated
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    
    await this.prisma.user.delete({ where: { id } })

    if (user) {
      await this.invalidateCache(`id:${id}`, `email:${user.email}`)
    }
  }

  async upgradePlan(userId: string, planType: string): Promise<User> {
    const roleMap: Record<string, string> = {
      BASIC: 'BASIC',
      PRO: 'PRO',
      EXPERT: 'EXPERT',
      NONE: 'REGISTERED',
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: roleMap[planType] || 'REGISTERED',
        planType,
        purchasedAt: new Date(),
      },
    })

    // Invalidate cache
    await this.invalidateCache(`id:${userId}`, `email:${updated.email}`)
    return updated
  }

  async getStudentList(filters: StudentFilters) {
    // Don't cache list as admin needs real-time data
    const where: Prisma.UserWhereInput = {}

    if (filters.plan && filters.plan !== 'ALL') {
      where.planType = filters.plan
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.offset,
      take: filters.limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        planType: true,
        purchasedAt: true,
        createdAt: true,
        _count: {
          select: {
            progress: {
              where: { completed: true },
            },
          },
        },
      },
    })
  }

  async getUserStats(userId: string) {
    return this.getCached(`stats:${userId}`, 600, async () => {
      const [totalLessons, completedLessons, enrolledCourses] = await Promise.all([
        this.prisma.lesson.count(),
        this.prisma.lessonProgress.count({
          where: { userId, completed: true },
        }),
        this.prisma.order.count({
          where: { userId, status: 'COMPLETED' },
        }),
      ])

      return {
        totalLessons,
        completedLessons,
        enrolledCourses,
        completionPercentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      }
    })
  }
}
