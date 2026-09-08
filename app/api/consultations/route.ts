import { withPostApi } from '@/lib/api/handler'
import prisma from '@/lib/prisma'
import { ConsultationSchema } from '@/lib/validations/consultation.schema'

export const POST = withPostApi(
  async (_request, context) => {
    const input = ConsultationSchema.parse(context.body)
    const lead = await prisma.lead.create({ data: input })

    return { leadId: lead.id, status: lead.status }
  },
  ConsultationSchema,
  { rateLimit: { max: 5, window: 3600 } }
)