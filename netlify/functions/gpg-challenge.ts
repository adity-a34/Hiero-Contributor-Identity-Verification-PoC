import crypto from 'node:crypto'
import { SignJWT } from 'jose'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

const json = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
})

type NetlifyEvent = {
  httpMethod: string
  body: string | null
}

type NetlifyResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

type ChallengeBody = {
  github_id?: string
}

const jsonResponse = (statusCode: number, body: Record<string, unknown>): NetlifyResponse =>
  json(statusCode, body)

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    let body: ChallengeBody = {}
    try { body = JSON.parse(event.body || '{}') as ChallengeBody } catch { return jsonResponse(400, { error: 'Invalid JSON body' }) }

    const { github_id } = body
    if (!github_id) return jsonResponse(400, { error: 'github_id is required' })

    const secret = process.env.CHALLENGE_SECRET
    if (!secret) return jsonResponse(500, { error: 'Missing CHALLENGE_SECRET env var' })

    const nonce = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const challengeJwt = await new SignJWT({ nonce, github_id: String(github_id) })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .setIssuer('hiero-poc-challenge')
      .sign(new TextEncoder().encode(secret))

    return jsonResponse(200, {
      challenge_jwt: challengeJwt,
      nonce,
      expires_at: expiresAt,
    })
  } catch (error) {
    return jsonResponse(500, {
      error: 'Unexpected gpg-challenge failure',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
