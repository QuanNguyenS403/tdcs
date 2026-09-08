/**
 * Validation schemas for Lesson/Course content
 */

import { z } from 'zod'

export const GetLessonSchema = z.object({
  withProgress: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional()
    .describe('Include user progress data'),
})

export const GetCourseContentSchema = z.object({
  includeUnpublished: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional()
    .describe('Include unpublished lessons (admin only)'),
})

export const SearchLessonsSchema = z.object({
  q: z
    .string()
    .min(1, 'Search query required')
    .max(100)
    .describe('Search query'),
  courseId: z.string().uuid('Invalid course ID').optional().describe('Filter by course'),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .default('20'),
})

export type GetLessonInput = z.infer<typeof GetLessonSchema>
export type GetCourseContentInput = z.infer<typeof GetCourseContentSchema>
export type SearchLessonsInput = z.infer<typeof SearchLessonsSchema>
