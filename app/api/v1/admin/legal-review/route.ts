import { withPostApi } from '@/lib/api/handler'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const ConfirmLegalReviewSchema = z.object({
  packageId: z.string().uuid(),
  confirmation: z.literal('Tôi xác nhận đã hoàn tất rà soát pháp lý cho chương trình này'),
})

export const POST = withPostApi(
  async (_req, context) => {
    const { packageId, confirmation } = ConfirmLegalReviewSchema.parse(context.body)
    const { data, error } = await createSupabaseServiceClient().rpc(
      'confirm_package_legal_review',
      {
        requested_package_id: packageId,
        confirmation,
      }
    )

    if (error) {
      throw error
    }

    return data
  },
  ConfirmLegalReviewSchema,
  { requireAuth: true, requireRole: ['ADMIN'] }
)