import { z } from 'zod'

const isPhone = (val: string) => /^(?:\+84|0)[35789]\d{8}$/.test(val.replace(/[\s.-]/g, ''))
const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

export const ConsultationSchema = z.object({
  name: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự').max(120, 'Họ và tên không quá 120 ký tự'),
  contact: z.string().trim().refine(
    (val) => isPhone(val) || isEmail(val),
    { message: 'Vui lòng cung cấp email hợp lệ hoặc số điện thoại di động Việt Nam' }
  ),
  branch: z.enum(['cot_song', 'yoga', 'chua_biet']),
  goal: z.string().trim().min(10, 'Mục tiêu tối thiểu 10 ký tự').max(1000, 'Mục tiêu không quá 1000 ký tự'),
  experience: z.string().trim().max(500).optional(),
  preferredFormat: z.string().trim().max(120).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Bạn cần đồng ý với chính sách tư vấn để gửi thông tin' }),
  }),
})

export type ConsultationInput = z.infer<typeof ConsultationSchema>
