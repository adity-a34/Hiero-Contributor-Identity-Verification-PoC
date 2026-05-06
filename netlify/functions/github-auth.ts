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

type GitHubTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

type GitHubUser = {
  id: number | string
  login: string
  name?: string
  avatar_url?: string
}

const jsonResponse = (statusCode: number, body: Record<string, unknown>): NetlifyResponse =>
  json(statusCode, body)

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    let body: { code?: string } = {}
    try { body = JSON.parse(event.body || '{}') as { code?: string } } catch { return jsonResponse(400, { error: 'Invalid JSON body' }) }

    const { code } = body
    if (!code) return jsonResponse(400, { error: 'Missing OAuth code' })

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return jsonResponse(500, { error: 'Missing GitHub OAuth environment variables on server' })
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    })

    if (!tokenRes.ok) {
      return jsonResponse(502, { error: 'GitHub token endpoint returned error', status: tokenRes.status })
    }

    const tokenData = await tokenRes.json() as GitHubTokenResponse

    if (tokenData.error) {
      return jsonResponse(400, {
        error: 'GitHub OAuth failed',
        detail: tokenData.error_description || tokenData.error,
      })
    }

    if (!tokenData.access_token) {
      return jsonResponse(400, { error: 'No access_token in GitHub response', raw: tokenData })
    }

    const authHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hiero-identity-poc',
    }

    const [userRes, keysRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers: authHeaders }),
      fetch('https://api.github.com/user/gpg_keys', { headers: authHeaders }),
    ])

    if (!userRes.ok) {
      return jsonResponse(userRes.status, { error: 'Unable to fetch GitHub user profile' })
    }

    const user = await userRes.json() as GitHubUser
    const gpgKeys = keysRes.ok ? await keysRes.json() : []

    return jsonResponse(200, {
      github_id: String(user.id),
      github_login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      gpg_keys: Array.isArray(gpgKeys) ? gpgKeys : [],
    })
  } catch (error) {
    return jsonResponse(500, {
      error: 'Unexpected github-auth failure',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
