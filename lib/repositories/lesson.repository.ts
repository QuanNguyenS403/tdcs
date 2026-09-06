import { PrismaClient, Lesson, Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { BaseRepository } from './base.repository'

export interface CreateLessonDTO {
  courseId: string
  title: string
  description?: string
  videoUrl: string
  order: number
  duration?: number
  isPublished?: boolean
}

export interface UpdateLessonDTO {
  title?: string
  description?: string
  videoUrl?: string
  order?: number
  duration?: number
  isPublished?: boolean
}

export class LessonRepository extends BaseRepository<Lesson, CreateLessonDTO, UpdateLessonDTO> {
  constructor(prisma: PrismaClient, redis: Redis) {
    super(prisma, redis, 'lesson')
  }

  async findById(id: string): Promise<Lesson | null> {
    return this.getCached(`id:${id}`, 600, () =>
      this.prisma.lesson.findUnique({
        where: { id },
        include: { course: true },
      })
    )
  }

  async create(data: CreateLessonDTO): Promise<Lesson> {
    const lesson = await this.prisma.lesson.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        order: data.order,
        duration: data.duration,
        isPublished: data.isPublished ?? false,
      },
      include: { course: true },
    })

    // Invalidate course lessons cache
    await this.invalidateCache(`course:${data.courseId}`)

    return lesson
  }

  async update(id: string, data: UpdateLessonDTO): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } })
    if (!lesson) throw new Error(`Lesson ${id} not found`)

    const updated = await this.prisma.lesson.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        order: data.order,
        duration: data.duration,
        isPublished: data.isPublished,
      },
      include: { course: true },
    })

    // Invalidate caches
    await this.invalidateCache(`id:${id}`, `course:${lesson.courseId}`)

    return updated
  }

  async delete(id: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } })
    if (!lesson) throw new Error(`Lesson ${id} not found`)

    await this.prisma.lesson.delete({ where: { id } })

    // Invalidate caches
    await this.invalidateCache(`id:${id}`, `course:${lesson.courseId}`)
  }

  /**
   * Get all lessons for a course
   */
  async getCourseContent(courseId: string, includeUnpublished = false): Promise<Lesson[]> {
    return this.getCached(`course:${courseId}`, 600, () =>
      this.prisma.lesson.findMany({
        where: {
          courseId,
          isPublished: includeUnpublished ? undefined : true,
        },
        orderBy: { order: 'asc' },
      })
    )
  }

  /**
   * Content entitlement is evaluated by the database so expiry and legal gates
   * cannot be bypassed by a second API path.
   */
  async canUserAccessCourse(userId: string, courseId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<Array<{ can_access: boolean }>>(
      Prisma.sql`SELECT academy_can_access_course(${userId}::uuid, ${courseId}::uuid) AS can_access`
    )

    return result[0]?.can_access === true
  }

  /**
   * Get lesson by course and order (for sequential access)
   */
  async getByOrder(courseId: string, order: number): Promise<Lesson | null> {
    return this.getCached(`course:${courseId}:order:${order}`, 600, () =>
      this.prisma.lesson.findFirst({
        where: { courseId, order, isPublished: true },
      })
    )
  }

  /**
   * Get next lesson in sequence
   */
  async getNextLesson(courseId: string, currentOrder: number): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({
      where: {
        courseId,
        order: { gt: currentOrder },
        isPublished: true,
      },
      orderBy: { order: 'asc' },
    })
  }

  /**
   * Get previous lesson in sequence
   */
  async getPreviousLesson(courseId: string, currentOrder: number): Promise<Lesson | null> {
    return this.prisma.lesson.findFirst({
      where: {
        courseId,
        order: { lt: currentOrder },
        isPublished: true,
      },
      orderBy: { order: 'desc' },
    })
  }

  /**
   * Search lessons by title or description
   */
  async search(
    query: string,
    courseId?: string,
    limit: number = 20
  ): Promise<Lesson[]> {
    const where: Prisma.LessonWhereInput = {
      isPublished: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (courseId) {
      where.courseId = courseId
    }

    return this.prisma.lesson.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get lessons with progress info for user
   */
  async getLessonsWithProgress(courseId: string, userId: string) {
    return this.prisma.lesson.findMany({
      where: { courseId, isPublished: true },
      orderBy: { order: 'asc' },
      include: {
        progress: {
          where: { userId },
          select: {
            completed: true,
            watchTime: true,
            lastPosition: true,
            lastWatched: true,
          },
        },
      },
    })
  }

  /**
   * Bulk publish lessons
   */
  async publishLessons(lessonIds: string[]): Promise<number> {
    const result = await this.prisma.lesson.updateMany({
      where: { id: { in: lessonIds } },
      data: { isPublished: true },
    })

    // Invalidate course caches
    await this.invalidateCachePattern('course:*')

    return result.count
  }

  /**
   * Get course statistics
   */
  async getCourseStats(courseId: string) {
    const [totalLessons, publishedLessons, totalDuration] = await Promise.all([
      this.prisma.lesson.count({ where: { courseId } }),
      this.prisma.lesson.count({ where: { courseId, isPublished: true } }),
      this.prisma.lesson.aggregate({
        where: { courseId },
        _sum: { duration: true },
      }),
    ])

    return {
      totalLessons,
      publishedLessons,
      totalDuration: totalDuration._sum.duration || 0,
    }
  }
}
