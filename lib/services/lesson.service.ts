/**
 * Lesson Service
 * 
 * Responsibilities:
 * - Course content management
 * - Lesson retrieval with progress
 * - Sequential lesson navigation
 * - Search and filtering
 */

import { LessonRepository } from '@/lib/repositories/lesson.repository'
import { ProgressRepository } from '@/lib/repositories/progress.repository'
import { NotFoundError, ValidationError } from '@/lib/errors/business.error'
import logger from '@/lib/logger'

export class LessonService {
  constructor(
    private lessonRepo: LessonRepository,
    private progressRepo: ProgressRepository
  ) {}

  /**
   * Get course content with user progress
   */
  async getCourseWithProgress(courseId: string, userId: string) {
    logger.info({ courseId, userId }, 'Getting course with progress')

    const lessons = await this.lessonRepo.getLessonsWithProgress(courseId, userId)
    
    if (lessons.length === 0) {
      throw new NotFoundError('Course', courseId)
    }

    // Calculate course completion
    const completed = lessons.filter(l => l.progress[0]?.completed).length
    const percentage =
      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0

    return {
      courseId,
      totalLessons: lessons.length,
      completedLessons: completed,
      completionPercentage: percentage,
      lessons: lessons.map(l => ({
        id: l.id,
        title: l.title,
        order: l.order,
        duration: l.duration,
        progress: l.progress[0] || null,
      })),
    }
  }

  /**
   * Get single lesson with progress
   */
  async getLessonWithProgress(lessonId: string, userId: string) {
    logger.info({ lessonId, userId }, 'Getting lesson with progress')

    const lesson = await this.lessonRepo.findById(lessonId)
    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId)
    }

    const progress = await this.progressRepo.getLessonProgress(userId, lessonId)

    return {
      ...lesson,
      progress,
    }
  }

  /**
   * Get previous and next lessons for navigation
   */
  async getAdjacentLessons(courseId: string, currentOrder: number) {
    logger.debug({ courseId, currentOrder }, 'Getting adjacent lessons')

    const [prev, next] = await Promise.all([
      this.lessonRepo.getPreviousLesson(courseId, currentOrder),
      this.lessonRepo.getNextLesson(courseId, currentOrder),
    ])

    return { previous: prev, next }
  }

  /**
   * Search lessons
   */
  async searchLessons(query: string, courseId?: string, limit?: number) {
    logger.info({ query, courseId, limit }, 'Searching lessons')

    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty')
    }

    return this.lessonRepo.search(query, courseId, limit)
  }

  /**
   * Get course statistics
   */
  async getCourseStats(courseId: string) {
    logger.info({ courseId }, 'Getting course stats')
    return this.lessonRepo.getCourseStats(courseId)
  }
}
