import axios from 'axios'
import crypto from 'crypto'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface PaystackTransaction {
  reference: string
  status: string // 'success' | 'failed' | 'abandoned' | ...
  amount: number // kobo
  currency: string
  channel?: string
  paid_at?: string | null
}

const secretKey = () => {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

const client = () =>
  axios.create({
    baseURL: PAYSTACK_BASE_URL,
    timeout: 20000,
    headers: { Authorization: `Bearer ${secretKey()}` },
  })

export const paystack = {
  isConfigured: () => Boolean(process.env.PAYSTACK_SECRET_KEY),

  async initializeTransaction(params: {
    email: string
    amountKobo: number
    reference: string
    callbackUrl: string
    metadata?: Record<string, unknown>
  }): Promise<{ authorization_url: string; reference: string }> {
    const res = await client().post('/transaction/initialize', {
      email: params.email,
      amount: params.amountKobo,
      currency: 'NGN',
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    })
    return res.data.data
  },

  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    const res = await client().get(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    )
    return res.data.data
  },

  // Paystack signs webhook bodies with HMAC SHA512 of the secret key
  isValidSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false
    const expected = crypto
      .createHmac('sha512', secretKey())
      .update(rawBody)
      .digest('hex')
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  },
}
