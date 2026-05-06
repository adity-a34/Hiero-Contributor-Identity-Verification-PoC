export type OAuthStatus = {
  loading: boolean
  error: string
}

export type GitHubKey = {
  id: string | number
  key_id: string
  name?: string | null
  raw_key?: string
  public_key?: string
}

export type GitHubProfile = {
  github_id: string
  github_login: string
  name?: string
  avatar_url?: string
  gpg_keys?: GitHubKey[]
}

export type CredentialClaims = {
  type?: string
  github_id?: string
  github_login?: string
  gpg_fingerprint?: string
  did?: string
  issued_at?: string
  issuer?: string
  exp?: number
}

export type IssuedCredential = {
  credential_jwt: string
  did?: string
  gpg_fingerprint?: string
}

export type ChallengeData = {
  challenge_jwt: string
  nonce: string
  expires_at: string
}

export type VerificationStatus = 'verified' | 'unverified' | 'invalid'

export type VerificationResult = {
  status: VerificationStatus
  pr_author: string
  pr_title?: string
  checked_at: string
  reason?: string
  credential_claims?: CredentialClaims
}
