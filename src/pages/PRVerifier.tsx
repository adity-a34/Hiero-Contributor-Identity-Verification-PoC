import { useState } from 'react'
import type { FormEvent } from 'react'
import type { VerificationResult, VerificationStatus } from '../types'

const statusConfig = {
  verified: {
    border: 'border-(--green)',
    bg: 'bg-(--green-light)',
    text: 'text-(--green)',
    icon: '✓',
    label: 'hiero/identity - Identity verified via ContributorCredential',
  },
  unverified: {
    border: 'border-(--red-soft)',
    bg: 'bg-[#f6e1e1]',
    text: 'text-(--red-soft)',
    icon: '✗',
    label: 'hiero/identity - No verified identity found for this PR author',
  },
  invalid: {
    border: 'border-(--gold)',
    bg: 'bg-(--gold-light)',
    text: 'text-(--gold)',
    icon: '⚠',
    label: 'hiero/identity - Credential invalid or mismatch',
  },
} as const

function PRVerifier() {
  const [prUrl, setPrUrl] = useState('')
  const [credentialJwt, setCredentialJwt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/.netlify/functions/verify-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pr_url: prUrl.trim(),
          credential_jwt: credentialJwt.trim() || undefined,
        }),
      })
      const text = await response.text()
      let data: VerificationResult | { error?: string }
      try { data = JSON.parse(text) } catch {
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.slice(0, 120)}`)
      }
      if (!response.ok) {
        const errorMessage = 'error' in data ? data.error : undefined
        throw new Error(errorMessage || `Request failed (${response.status})`)
      }
      setResult(data as VerificationResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? (statusConfig[result.status as VerificationStatus] ?? statusConfig.invalid) : null

  return (
    <section className="space-y-5">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-(--rule) bg-(--cream) p-5"
      >
        <div>
          <h2 className="font-(--serif) text-xl text-(--accent)">
            PR Verification Simulator
          </h2>
          <p className="mt-1 text-sm text-[rgb(85,85,85)]">
            Simulates the GitHub App status check: fetches the PR author from GitHub and
            validates their ContributorCredential JWT.
          </p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-(--accent)">GitHub PR URL</span>
          <input
            className="w-full rounded-lg border border-(--rule) bg-(--paper) px-3 py-2 text-(--ink) outline-none focus:ring focus:ring-(--accent-mid)"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/hiero-ledger/heka-identity-platform/pull/131"
            required
          />
          <p className="text-xs text-[rgb(120,120,120)]">Must be a public repository PR.</p>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-(--accent)">
            ContributorCredential JWT{' '}
            <span className="text-[rgb(120,120,120)]">(optional, omit to test unverified state)</span>
          </span>
          <textarea
            className="h-32 w-full rounded-lg border border-(--rule) bg-(--paper) px-3 py-2 font-mono text-xs text-(--ink) outline-none focus:ring focus:ring-(--accent-mid)"
            value={credentialJwt}
            onChange={(e) => setCredentialJwt(e.target.value)}
            placeholder="Paste the credential JWT from the Onboarding tab"
            spellCheck={false}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-(--accent-mid) px-5 py-2 text-sm font-semibold text-(--paper) transition hover:bg-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Run Verification Check'}
        </button>

        {error && (
          <div className="rounded-lg border border-(--red-soft) bg-[#f6e1e1] px-3 py-2 text-xs text-(--red-soft)">
            {error}
          </div>
        )}
      </form>

      {result && cfg && (
        <article className="space-y-4 rounded-xl border border-(--rule) bg-(--cream) p-5">
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${cfg.border} ${cfg.bg} ${cfg.text}`}>
            <span className="text-base font-bold">{cfg.icon}</span>
            <span>{cfg.label}</span>
          </div>

          {result.reason && (
            <p className="text-xs text-(--gold)">{result.reason}</p>
          )}

          <div className="grid gap-2 rounded-lg border border-(--rule) bg-(--paper) p-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs text-[rgb(120,120,120)]">PR Author</p>
              <p className="font-semibold text-(--ink)">@{result.pr_author}</p>
            </div>
            {result.pr_title && (
              <div className="md:col-span-2">
                <p className="text-xs text-[rgb(120,120,120)]">PR Title</p>
                <p className="text-[rgb(68,68,68)]">{result.pr_title}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[rgb(120,120,120)]">DID</p>
              <p className="font-mono text-xs text-(--accent) break-all">
                {result.credential_claims?.did || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgb(120,120,120)]">GPG Fingerprint</p>
              <p className="font-mono text-xs text-(--accent) break-all">
                {result.credential_claims?.gpg_fingerprint || 'N/A'}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-[rgb(120,120,120)]">Issued by</p>
              <p className="font-mono text-xs text-(--accent)">
                {result.credential_claims?.issuer || 'did:hedera:testnet:SIMULATED_ISSUER'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgb(120,120,120)]">Checked at</p>
              <p className="text-xs text-[rgb(68,68,68)]">{new Date(result.checked_at).toLocaleString()}</p>
            </div>
            {result.credential_claims?.issued_at && (
              <div>
                <p className="text-xs text-[rgb(120,120,120)]">Credential issued</p>
                <p className="text-xs text-[rgb(68,68,68)]">
                  {new Date(result.credential_claims.issued_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-[rgb(120,120,120)]">
            In the full system, the GitHub App receives this as a pull_request webhook and
            posts the result automatically via the GitHub Checks API. This demo simulates
            that verification result.
          </p>
        </article>
      )}
    </section>
  )
}

export default PRVerifier
