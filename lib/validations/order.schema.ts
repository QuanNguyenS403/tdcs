/**
 * Validation schemas for Order operations
 */

import { z } from 'zod'

export const CreateOrderSchema = z.object({
  packageCode: z.enum(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']).describe('Academy package code'),
})

export const GetOrderSchema = z.object({
  status: z
    .enum(['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
    .optional()
    .describe('Filter by order status'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type GetOrderInput = z.infer<typeof GetOrderSchema>
