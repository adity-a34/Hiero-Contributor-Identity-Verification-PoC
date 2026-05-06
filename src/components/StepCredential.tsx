import { useMemo, useState } from 'react'
import type { CredentialClaims, IssuedCredential } from '../types'

function decodeJwt(token: string): CredentialClaims | null {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

type FieldProps = {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}

function Field({ label, value, mono = false }: FieldProps) {
  return (
    <div>
      <p className="text-xs text-[rgb(120,120,120)]">{label}</p>
      <p className={`mt-0.5 break-all text-(--ink) ${mono ? 'font-mono text-xs text-(--accent)' : 'text-sm'}`}>
        {value || '-'}
      </p>
    </div>
  )
}

type StepCredentialProps = {
  credential: IssuedCredential
}

function StepCredential({ credential }: StepCredentialProps) {
  const [copied, setCopied] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const claims = useMemo(() => decodeJwt(credential.credential_jwt), [credential.credential_jwt])

  const copy = async () => {
    await navigator.clipboard.writeText(credential.credential_jwt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresAt = claims?.exp
    ? new Date(claims.exp * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <article className="rounded-xl border border-(--green) bg-(--green-light)/35 p-5">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--green)">
            Step 3 - Complete
          </p>
          <h2 className="mt-0.5 font-(--serif) text-xl text-(--accent)">
            Contributor Credential Issued
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--green) bg-(--green-light) px-3 py-1 text-xs font-medium text-(--green)">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.8l-4.2 4.2a1 1 0 01-1.4 0l-1.8-1.8a1 1 0 111.4-1.4l1.1 1.1 3.5-3.5a1 1 0 011.4 1.4z" />
          </svg>
          Identity Verified
        </span>
      </header>

      <div className="rounded-xl border border-(--rule) bg-(--paper) p-4">
        <div className="mb-4 flex items-center gap-3 border-b border-(--rule) pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--accent-mid) bg-(--accent-light) text-(--accent-mid)">
            <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-(--accent)">ContributorCredential</p>
            <p className="font-mono text-xs text-[rgb(120,120,120)]">
              {claims?.type || 'ContributorCredential'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="GitHub Login" value={`@${claims?.github_login}`} />
          <Field label="GitHub ID" value={claims?.github_id} />
          <Field label="DID" value={credential.did || claims?.did} mono />
          <Field label="GPG Fingerprint" value={credential.gpg_fingerprint || claims?.gpg_fingerprint} mono />
          <Field label="Simulated Issuer DID" value={claims?.issuer} mono />
          <Field label="Issued At" value={claims?.issued_at ? new Date(claims.issued_at).toLocaleString() : null} />
          {expiresAt && <Field label="Expires" value={expiresAt} />}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-(--rule) bg-(--cream) px-4 py-3 text-xs text-[rgb(85,85,85)]">
        <p className="font-semibold text-(--accent)">What this simulates</p>
        <p className="mt-1">
          In the full system, this credential is issued via <strong className="text-(--ink)">OID4VCI</strong> by
          the Heka Identity Service and anchored to a real <strong className="text-(--ink)">did:hedera</strong> DID
          on the Hedera Consensus Service. The GPG key and GitHub identity are stored as verifiable claims in the
          SD-JWT VC. This PoC uses a signed JWT to demonstrate the same verification logic.
        </p>
      </div>

      <details
        open={rawOpen}
        onToggle={(e) => setRawOpen(e.currentTarget.open)}
        className="mt-4 rounded-lg border border-(--rule) bg-(--paper)"
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm text-[rgb(85,85,85)] hover:text-(--ink)">
          {rawOpen ? 'Hide' : 'Show'} raw credential JWT
        </summary>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all px-4 pb-4 pt-2 font-mono text-xs text-(--accent)">
          {credential.credential_jwt}
        </pre>
      </details>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-(--accent-mid) px-4 py-2 text-sm font-semibold text-(--paper) transition hover:bg-(--accent)"
        >
          {copied ? '✓ Copied!' : 'Copy Credential JWT'}
        </button>
        <p className="text-xs text-[rgb(120,120,120)]">
          Paste this into the PR Verifier tab to test verification.
        </p>
      </div>
    </article>
  )
}

export default StepCredential
