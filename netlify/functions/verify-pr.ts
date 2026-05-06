import { jwtVerify } from 'jose'

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

type VerifyPrRequest = {
  pr_url?: string
  credential_jwt?: string
}

type ParsedPrUrl = {
  owner: string
  repo: string
  pull_number: string
}

const parsePrUrl = (prUrl: string): ParsedPrUrl | null => {
  const clean = prUrl.split('?')[0].split('#')[0].replace(/\/$/, '')
  const match = clean.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/i)
  if (!match) return null
  return { owner: match[1], repo: match[2], pull_number: match[3] }
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    let body: VerifyPrRequest = {}
    try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON body' }) }

    const { pr_url, credential_jwt } = body
    if (!pr_url || typeof pr_url !== 'string' || !pr_url.trim()) {
      return json(400, { error: 'pr_url is required' })
    }

    const parsed = parsePrUrl(pr_url.trim())
    if (!parsed) {
      return json(400, { error: 'Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123' })
    }

    const prRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pull_number}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'hiero-identity-poc',
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      },
    )

    if (prRes.status === 404) {
      return json(404, { error: 'PR not found. Make sure the repository is public and the PR number is correct.' })
    }
    if (prRes.status === 403) {
      return json(403, { error: 'GitHub API rate limit hit. Try again in a moment.' })
    }
    if (!prRes.ok) {
      return json(prRes.status, { error: `GitHub API error: ${prRes.status} ${prRes.statusText}` })
    }

    const pr = await prRes.json()
    const prAuthor = pr.user?.login
    const checkedAt = new Date().toISOString()

    if (!credential_jwt || !credential_jwt.trim()) {
      return json(200, {
        status: 'unverified',
        pr_author: prAuthor,
        pr_title: pr.title,
        checked_at: checkedAt,
      })
    }

    const vcSecret = process.env.VC_SIGNING_SECRET
    if (!vcSecret) {
      return json(500, { error: 'Missing VC_SIGNING_SECRET env var' })
    }

    try {
      const { payload } = await jwtVerify(
        credential_jwt.trim(),
        new TextEncoder().encode(vcSecret),
        { issuer: 'hiero-poc-issuer' },
      )

      if (payload.type !== 'ContributorCredential') {
        return json(200, { status: 'invalid', pr_author: prAuthor, checked_at: checkedAt, reason: 'Not a ContributorCredential' })
      }

      const loginMatch = String(payload.github_login).toLowerCase() === String(prAuthor).toLowerCase()
      const notExpired = !payload.exp || payload.exp * 1000 > Date.now()
      const status = loginMatch && notExpired ? 'verified' : 'invalid'

      return json(200, {
        status,
        pr_author: prAuthor,
        pr_title: pr.title,
        credential_claims: payload,
        checked_at: checkedAt,
        ...(!loginMatch && { reason: `Credential is for @${payload.github_login}, but PR is by @${prAuthor}` }),
        ...(!notExpired && { reason: 'Credential has expired' }),
      })
    } catch (verifyError) {
      return json(200, {
        status: 'invalid',
        pr_author: prAuthor,
        pr_title: pr.title,
        checked_at: checkedAt,
        reason: 'JWT verification failed: ' + (verifyError instanceof Error ? verifyError.message : 'Unknown error'),
      })
    }
  } catch (error) {
    return json(500, {
      error: 'Unexpected verify-pr failure',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
