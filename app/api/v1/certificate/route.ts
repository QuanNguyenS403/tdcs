/**
 * POST /api/v1/certificate
 * Request certificate (only EXPERT plan users)
 */

import { jsonError } from '@/lib/api/response'

/**
 * Certificate issuance stays disabled until real completion criteria,
 * certificate persistence, and public verification are implemented.
 */
export async function POST() {
  return jsonError(
    'CERTIFICATE_NOT_AVAILABLE',
    'Chức năng cấp chứng nhận chưa được mở.',
    501
  )
}
