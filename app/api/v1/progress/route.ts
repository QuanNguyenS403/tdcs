/**
 * POST /api/v1/progress
 * Update lesson progress
 */

import { NextRequest } from 'next/server'
import { withPostApi } from '@/lib/api/handler'
import { UpdateProgressSchema } from '@/lib/validations/progress.schema'
import { progressRepository } from '@/lib/container'
import { eventBus } from '@/lib/events/event-bus'
import logger from '@/lib/logger'

export const POST = withPostApi(
  async (req, context) => {
    const userId = context.session!.user.id
    const input = UpdateProgressSchema.parse(context.body)

    logger.info(
      { userId, lessonId: input.lessonId },
      'Updating lesson progress'
    )

    const progress = await progressRepository.upsertProgress(
      userId,
      input.lessonId,
      {
        watchTimeDelta: input.watchTimeDelta,
        lastPosition: input.lastPosition,
        completed: input.completed,
      }
    )

    // Emit progress event for tracking
    const summary = await progressRepository.getUserCompletionSummary(userId)
    if (summary.percentage > 0 && summary.percentage % 10 === 0) {
      await eventBus.emit('progress.milestone', {
        userId,
        percentage: summary.percentage,
      })
    }

    return {
      lessonId: progress.lessonId,
      watchTime: progress.watchTime,
      lastPosition: progress.lastPosition,
      completed: progress.completed,
      lastWatched: progress.lastWatched,
    }
  },
  UpdateProgressSchema,
  { requireAuth: true, rateLimit: { max: 60, window: 60 } }
)
