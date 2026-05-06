import crypto from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import * as openpgp from 'openpgp'

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

type VerifyBody = {
  challenge_jwt?: string
  signed_message?: string
  public_key_armor?: string
  github_id?: string
  github_login?: string
}

const simulatedDid = (github_id: string, gpgFingerprint: string) => {
  const hash = crypto
    .createHash('sha256')
    .update(`${github_id}:${gpgFingerprint}`)
    .digest('base64url')
  return `did:key:poc-${hash.slice(0, 32)}`
}

const normalizeArmoredKey = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
    return trimmed
  }
  return `-----BEGIN PGP PUBLIC KEY BLOCK-----\n\n${trimmed}\n-----END PGP PUBLIC KEY BLOCK-----`
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    let body: VerifyBody = {}
    try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON body' }) }

    const { challenge_jwt, signed_message, public_key_armor, github_id, github_login } = body

    if (!challenge_jwt || !signed_message || !public_key_armor || !github_id || !github_login) {
      return json(400, { error: 'Missing required fields: challenge_jwt, signed_message, public_key_armor, github_id, github_login' })
    }

    const challengeSecret = process.env.CHALLENGE_SECRET
    const vcSecret = process.env.VC_SIGNING_SECRET
    if (!challengeSecret || !vcSecret) {
      return json(500, { error: 'Missing server secrets (CHALLENGE_SECRET or VC_SIGNING_SECRET)' })
    }

    let payload: Record<string, unknown>
    try {
      const result = await jwtVerify(challenge_jwt, new TextEncoder().encode(challengeSecret), {
        issuer: 'hiero-poc-challenge',
      })
      payload = result.payload as Record<string, unknown>
    } catch (e) {
      return json(400, {
        error: 'Challenge JWT invalid or expired. Please generate a new challenge.',
        detail: e instanceof Error ? e.message : 'Unknown verification error',
      })
    }

    if (String(payload.github_id) !== String(github_id)) {
      return json(400, { error: 'Challenge github_id mismatch' })
    }

    let message
    try {
      message = await openpgp.readCleartextMessage({ cleartextMessage: signed_message.trim() })
    } catch (e) {
      return json(400, {
        error: 'Could not parse signed message. Paste the full PGP clearsigned block including headers.',
        detail: e instanceof Error ? e.message : 'Unknown parse error',
      })
    }

    let verificationKey
    try {
      const armoredKey = normalizeArmoredKey(public_key_armor)
      verificationKey = await openpgp.readKey({ armoredKey })
    } catch (e) {
      return json(400, {
        error: 'Could not parse GPG public key.',
        detail: e instanceof Error ? e.message : 'Unknown key parse error',
      })
    }

    const verificationResult = await openpgp.verify({
      message,
      verificationKeys: [verificationKey],
    })
    const sig = verificationResult.signatures[0]
    if (!sig) return json(400, { error: 'No signature found in signed message' })
    try {
      await sig.verified
    } catch (e) {
      return json(400, {
        error: 'GPG signature verification failed. Did you sign with the matching private key?',
        detail: e instanceof Error ? e.message : 'Unknown signature error',
      })
    }

    const signedText = message.getText().trim()
    if (signedText !== String(payload.nonce)) {
      return json(400, {
        error: 'Signed text does not match the challenge nonce.',
        expected: String(payload.nonce),
        got: signedText,
      })
    }

    const gpgFingerprint = verificationKey.getFingerprint().toUpperCase()
    const did = simulatedDid(github_id, gpgFingerprint)
    const issuedAt = new Date().toISOString()
    const expSeconds = Math.floor((Date.now() + 180 * 24 * 60 * 60 * 1000) / 1000)

    const claims = {
      type: 'ContributorCredential',
      github_id: String(github_id),
      github_login: String(github_login),
      gpg_fingerprint: gpgFingerprint,
      did,
      issued_at: issuedAt,
      issuer: 'did:hedera:testnet:SIMULATED_ISSUER',
    }

    const credentialJwt = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expSeconds)
      .setIssuer('hiero-poc-issuer')
      .sign(new TextEncoder().encode(vcSecret))

    return json(200, { credential_jwt: credentialJwt, did, gpg_fingerprint: gpgFingerprint })
  } catch (error) {
    return json(500, {
      error: 'Unexpected gpg-verify failure',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
