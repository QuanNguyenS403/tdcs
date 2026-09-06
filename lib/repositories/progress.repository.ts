import { PrismaClient, LessonProgress } from '@prisma/client'
import Redis from 'ioredis'
import { BaseRepository } from './base.repository'

export interface ProgressData {
  watchTimeDelta?: number
  lastPosition?: number
  completed?: boolean
}

export interface ProgressSummary {
  total: number
  completed: number
  percentage: number
  inProgress: number
}

export class ProgressRepository extends BaseRepository<LessonProgress, any, any> {
  constructor(prisma: PrismaClient, redis: Redis) {
    super(prisma, redis, 'progress')
  }

  async findById(id: string): Promise<LessonProgress | null> {
    return this.getCached(`id:${id}`, 300, () =>
      this.prisma.lessonProgress.findUnique({ where: { id } })
    )
  }

  async create(data: any): Promise<LessonProgress> {
    const progress = await this.prisma.lessonProgress.create({ data })
    return progress
  }

  async update(id: string, data: any): Promise<LessonProgress> {
    const updated = await this.prisma.lessonProgress.update({
      where: { id },
      data,
    })

    await this.invalidateCache(`id:${id}`)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lessonProgress.delete({ where: { id } })
    await this.invalidateCache(`id:${id}`)
  }

  /**
   * Upsert progress record: update if exists, create if new
   * Supports incremental watch time tracking
   */
  async upsertProgress(
    userId: string,
    lessonId: string,
    data: ProgressData
  ): Promise<LessonProgress> {
    const progress = await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      create: {
        userId,
        lessonId,
        watchTime: data.watchTimeDelta ?? 0,
        lastPosition: data.lastPosition ?? 0,
        completed: data.completed ?? false,
        lastWatched: new Date(),
      },
      update: {
        watchTime: { increment: data.watchTimeDelta ?? 0 },
        lastPosition: data.lastPosition,
        completed: data.completed ?? undefined,
        lastWatched: new Date(),
      },
    })

    // Invalidate user summary cache
    await this.invalidateCache(`summary:${userId}`)

    return progress
  }

  /**
   * Get user's overall completion summary
   */
  async getUserCompletionSummary(userId: string): Promise<ProgressSummary> {
    return this.getCached(`summary:${userId}`, 300, async () => {
      const [totalLessons, completedLessons, inProgressLessons] = await Promise.all([
        this.prisma.lesson.count({ where: { isPublished: true } }),
        this.prisma.lessonProgress.count({
          where: { userId, completed: true },
        }),
        this.prisma.lessonProgress.count({
          where: {
            userId,
            completed: false,
            watchTime: { gt: 0 },
          },
        }),
      ])

      const percentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      return {
        total: totalLessons,
        completed: completedLessons,
        inProgress: inProgressLessons,
        percentage,
      }
    })
  }

  /**
   * Get progress for specific course
   */
  async getCourseProgress(
    userId: string,
    courseId: string
  ): Promise<{ completed: number; total: number; percentage: number }> {
    const [total, completed] = await Promise.all([
      this.prisma.lesson.count({
        where: { courseId, isPublished: true },
      }),
      this.prisma.lessonProgress.count({
        where: {
          userId,
          lesson: { courseId },
          completed: true,
        },
      }),
    ])

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { completed, total, percentage }
  }

  /**
   * Get progress for specific lesson
   */
  async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
    return this.getCached(`lesson:${userId}:${lessonId}`, 300, () =>
      this.prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      })
    )
  }

  /**
   * Get all lessons progress for a user
   */
  async getUserLessonsProgress(userId: string): Promise<LessonProgress[]> {
    return this.getCached(`user:${userId}:all`, 600, () =>
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { courseId: true } } },
        orderBy: { lastWatched: 'desc' },
      })
    )
  }

  /**
   * Batch mark lessons as complete
   */
  async markLessonsCompleted(userId: string, lessonIds: string[]): Promise<number> {
    const result = await this.prisma.lessonProgress.updateMany({
      where: { userId, lessonId: { in: lessonIds } },
      data: { completed: true, lastWatched: new Date() },
    })

    // Invalidate user cache
    await this.invalidateCache(`summary:${userId}`)

    return result.count
  }

  /**
   * Reset user progress (admin only)
   */
  async resetUserProgress(userId: string): Promise<number> {
    const result = await this.prisma.lessonProgress.deleteMany({
      where: { userId },
    })

    // Invalidate all user progress caches
    await this.invalidateCachePattern(`*${userId}*`)

    return result.count
  }

  /**
   * Get top performing students
   */
  async getTopStudents(limit: number = 10) {
    const result = await this.prisma.lessonProgress.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { watchTime: true },
      where: { completed: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    })

    return result
  }
}
