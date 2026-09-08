import { withPostApi } from '@/lib/api/handler'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const ConsultationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(5).max(160),
  branch: z.enum(['cot_song', 'yoga', 'chua_biet']),
  goal: z.string().trim().min(10).max(1000),
  experience: z.string().trim().max(500).optional(),
  preferredFormat: z.string().trim().max(120).optional(),
  consent: z.literal(true),
})

export const POST = withPostApi(
  async (_request, context) => {
    const input = ConsultationSchema.parse(context.body)
    const lead = await prisma.lead.create({ data: input })

    return { leadId: lead.id, status: lead.status }
  },
  ConsultationSchema,
  { rateLimit: { max: 5, window: 3600 } }
)