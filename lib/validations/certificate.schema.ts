/**
 * Validation schemas for Certificate operations
 */

import { z } from 'zod'

export const IssueCertificateSchema = z.object({
  // No input required - based on user's progress
})

export const GetCertificateSchema = z.object({
  format: z
    .enum(['json', 'pdf'])
    .default('json')
    .optional()
    .describe('Return format'),
})

export const VerifyCertificateSchema = z.object({
  certCode: z
    .string()
    .regex(/^CSE-\d{4}-[A-Z0-9]{8}$/, 'Invalid certificate code format')
    .describe('Certificate code'),
})

export type IssueCertificateInput = z.infer<typeof IssueCertificateSchema>
export type GetCertificateInput = z.infer<typeof GetCertificateSchema>
export type VerifyCertificateInput = z.infer<typeof VerifyCertificateSchema>
