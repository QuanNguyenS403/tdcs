/**
 * GET /api/v1/modules/:id
 * Get course content (lesson list)
 */

import { NextRequest } from 'next/server'
import { ApiContext, withGetApi } from '../../../../../lib/api/handler'
import { lessonRepository } from '../../../../../lib/container'
import { NotFoundError } from '../../../../../lib/errors/business.error'
import logger from '../../../../../lib/logger'

type LessonResponse = {
  id: string
  title: string
  order: number
  duration: number | null
  description: string | null
  access?: boolean
  progress?: null
}

export const GET = withGetApi(
  async (_req: NextRequest, context: ApiContext) => {
    const courseId = context.params?.id
    const userId = context.session?.user?.id

    if (!courseId) {
      throw new NotFoundError('Course', 'unknown')
    }

    logger.info({ courseId, userId }, 'Fetching course content')

    // Get lessons for course
    const lessons = await lessonRepository.getCourseContent(courseId, false)
    if (lessons.length === 0) {
      throw new NotFoundError('Course', courseId)
    }

    // Get progress if authenticated
    const previewLessons: LessonResponse[] = lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      duration: lesson.duration,
      description: lesson.description,
    }))

    let lessonsWithProgress: LessonResponse[] = previewLessons

    let hasAccess = false

    if (userId) {
      hasAccess = await lessonRepository.canUserAccessCourse(userId, courseId)

      lessonsWithProgress = await Promise.all(
        lessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          duration: lesson.duration,
          description: lesson.description,
          access: hasAccess,
          progress: null,
        }))
      )
    }

    return {
      courseId,
      access: userId ? hasAccess : false,
      lessons: lessonsWithProgress,
      stats: {
        total: lessons.length,
        completed: 0,
      },
    }
  },
  { requireAuth: false } // Allow public access for preview
)
