/**
 * Validation schemas for Progress tracking
 */

import { z } from 'zod'

export const UpdateProgressSchema = z.object({
  lessonId: z.string().cuid('Invalid lesson ID'),
  watchTimeDelta: z
    .number()
    .int()
    .min(0)
    .max(300)
    .optional()
    .describe('Watch time delta in seconds (max 5 minutes)'),
  lastPosition: z
    .number()
    .min(0)
    .optional()
    .describe('Last video position in seconds'),
  completed: z.boolean().optional().describe('Mark lesson as completed'),
})

export const GetProgressSchema = z.object({
  courseId: z.string().cuid().optional().describe('Filter by course'),
})

export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>
export type GetProgressInput = z.infer<typeof GetProgressSchema>
