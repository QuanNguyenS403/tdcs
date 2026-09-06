/**
 * GET /api/v1/progress
 * Get user's overall progress summary
 */

import { NextRequest } from 'next/server'
import { withGetApi } from '@/lib/api/handler'
import { progressRepository, userRepository } from '@/lib/container'
import logger from '@/lib/logger'

export const GET = withGetApi(
  async (req, context) => {
    const userId = context.session!.user.id

    logger.info({ userId }, 'Fetching user progress summary')

    const [summary, stats] = await Promise.all([
      progressRepository.getUserCompletionSummary(userId),
      userRepository.getUserStats(userId),
    ])

    return {
      summary: {
        total: summary.total,
        completed: summary.completed,
        inProgress: summary.inProgress,
        percentage: summary.percentage,
      },
      stats: {
        totalLessons: stats.totalLessons,
        completedLessons: stats.completedLessons,
        enrolledCourses: stats.enrolledCourses,
      },
    }
  },
  { requireAuth: true }
)
