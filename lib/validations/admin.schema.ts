/**
 * Validation schemas for Admin operations
 */

import { z } from 'zod'

export const ManualUpgradeSchema = z.object({
  planType: z
    .enum(['BASIC', 'PRO', 'EXPERT'])
    .describe('Target plan type'),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason must not exceed 200 characters')
    .describe('Reason for manual upgrade'),
})

export const ManualVerifyOrderSchema = z.object({
  bankTransactionId: z
    .string()
    .describe('Bank transaction ID for verification'),
  notes: z
    .string()
    .max(500)
    .optional()
    .describe('Admin notes'),
})

export const ExportStudentsSchema = z.object({
  format: z
    .enum(['xlsx', 'csv', 'json'])
    .default('xlsx')
    .describe('Export format'),
  plan: z
    .enum(['ALL', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'BASIC', 'PRO', 'EXPERT'])
    .default('ALL')
    .describe('Filter by plan'),
  search: z
    .string()
    .max(100)
    .optional()
    .describe('Search by name or email'),
})

export const ListStudentsSchema = z.object({
  plan: z
    .enum(['ALL', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'BASIC', 'PRO', 'EXPERT'])
    .default('ALL')
    .optional(),
  search: z.string().max(100).optional(),
  limit: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? 20 : Number(val)),
    z.number().int().min(1).max(100).default(20)
  ),
  offset: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? 0 : Number(val)),
    z.number().int().min(0).default(0)
  ),
})

export type ManualUpgradeInput = z.infer<typeof ManualUpgradeSchema>
export type ManualVerifyOrderInput = z.infer<typeof ManualVerifyOrderSchema>
export type ExportStudentsInput = z.infer<typeof ExportStudentsSchema>
export type ListStudentsInput = z.infer<typeof ListStudentsSchema>
