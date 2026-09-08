/**
 * POST /api/webhook/bank
 * Bank transaction webhook from Casso
 * 
 * Secure webhook handling with fail-closed configuration checks,
 * multi-version signature verification (HMAC SHA-256 for V2, secure-token for V1),
 * and durable transaction ledger processing.
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { orderRepository, userRepository } from '@/lib/container'
import { PaymentService } from '@/lib/services/payment.service'
import { eventBus } from '@/lib/events/event-bus'
import { jsonError, jsonResponse, successResponse } from '@/lib/api/response'
import logger from '@/lib/logger'

interface RawTransaction {
  id: string | number
  amount: number
  senderName?: string
  description: string
  transactionDate?: string
  when?: string
}

/**
 * Timing-safe signature verification
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false

  // 1. Check HMAC SHA-256 (Casso Webhook V2 / x-casso-signature / x-signature)
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const expectedHmac = Buffer.from(hash, 'utf8')
  const receivedSig = Buffer.from(signature, 'utf8')

  if (expectedHmac.length === receivedSig.length && crypto.timingSafeEqual(expectedHmac, receivedSig)) {
    return true
  }

  // 2. Fallback: check static secure-token (Casso Webhook V1)
  const expectedToken = Buffer.from(secret, 'utf8')
  if (expectedToken.length === receivedSig.length && crypto.timingSafeEqual(expectedToken, receivedSig)) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    logger.info('Bank webhook received')

    // 1. Fail-closed secret check: never allow webhook processing if secret is unconfigured
    const webhookSecret = process.env.CASSO_WEBHOOK_SECRET
    if (!webhookSecret || webhookSecret.trim() === '') {
      logger.error('CASSO_WEBHOOK_SECRET is not configured. Rejecting request fail-closed.')
      return jsonError('CONFIG_ERROR', 'Webhook secret is not configured on server', 500)
    }

    // 2. Read signature from headers (check V2 header, legacy header, and secure-token)
    const signature =
      req.headers.get('x-casso-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('secure-token') ||
      ''

    const body = await req.text()

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      logger.error({ hasSignature: Boolean(signature) }, 'Invalid or missing webhook signature')
      return jsonError('INVALID_SIGNATURE', 'Signature verification failed', 401)
    }

    // 3. Parse payload safely (supporting both { data: [...] } and raw array [...])
    let transactions: RawTransaction[] = []
    try {
      const parsed = JSON.parse(body)
      if (Array.isArray(parsed)) {
        transactions = parsed
      } else if (Array.isArray(parsed.data)) {
        transactions = parsed.data
      } else if (parsed.data && typeof parsed.data === 'object') {
        transactions = [parsed.data]
      }
    } catch (parseError) {
      logger.error({ parseError }, 'Failed to parse webhook JSON body')
      return jsonError('INVALID_PAYLOAD', 'Malformed JSON payload', 400)
    }

    // 4. Process each transaction with payment service
    const paymentService = new PaymentService(orderRepository, userRepository, eventBus)
    const results = []

    for (const txn of transactions) {
      try {
        const txnDateStr = txn.transactionDate || txn.when || new Date().toISOString()
        const result = await paymentService.processWebhookTransaction({
          transactionId: String(txn.id),
          amount: txn.amount,
          senderName: txn.senderName || '',
          description: txn.description || '',
          transactionDate: new Date(txnDateStr),
        })

        results.push({ transactionId: String(txn.id), status: result.status, message: result.message })
        logger.info({ txnId: txn.id, status: result.status }, 'Transaction processed in webhook')
      } catch (error) {
        logger.error({ error, txnId: txn.id }, 'Failed to process individual transaction')
        results.push({ transactionId: String(txn.id), status: 'ERROR', message: (error as Error).message })
      }
    }

    return jsonResponse(
      successResponse({ processed: results.length, results }),
      200
    )
  } catch (error) {
    logger.error({ error }, 'Webhook server error')
    return jsonError('WEBHOOK_ERROR', 'Failed to process webhook', 500)
  }
}
