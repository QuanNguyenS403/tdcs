/**
 * Validation schemas for Order operations
 */

import { z } from 'zod'

export const CreateOrderSchema = z.object({
  planType: z.enum(['BASIC', 'PRO', 'EXPERT']).describe('Plan type to purchase'),
})

export const GetOrderSchema = z.object({
  status: z
    .enum(['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
    .optional()
    .describe('Filter by order status'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type GetOrderInput = z.infer<typeof GetOrderSchema>
