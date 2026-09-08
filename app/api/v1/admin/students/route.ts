/**
 * GET /api/v1/admin/students
 * List all students with filters (admin only)
 */

import { NextRequest } from 'next/server'
import { withGetApi } from '@/lib/api/handler'
import { userRepository } from '@/lib/container'
import { ListStudentsSchema } from '@/lib/validations/admin.schema'
import logger from '@/lib/logger'

export const GET = withGetApi(
  async (req, context) => {
    const url = new URL(req.url)
    const input = ListStudentsSchema.parse({
      plan: url.searchParams.get('plan'),
      search: url.searchParams.get('search'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    })

    logger.info(
      { admin: context.session?.user?.id, plan: input.plan },
      'Admin: Fetching student list'
    )

    const [students, total] = await Promise.all([
      userRepository.getStudentList({
        plan: input.plan,
        search: input.search,
        offset: input.offset,
        limit: input.limit,
      }),
      userRepository.getStudentCount({
        plan: input.plan,
        search: input.search,
      }),
    ])

    return {
      students,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total,
      },
    }
  },
  {
    requireAuth: true,
    requireRole: ['ADMIN'],
    rateLimit: { max: 30, window: 60 },
  }
)
