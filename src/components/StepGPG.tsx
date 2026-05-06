import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ChallengeData, GitHubKey, GitHubProfile, IssuedCredential } from '../types'

type StepGPGProps = {
  profile: GitHubProfile
  selectedKey: string | null
  onSelectKey: (value: string | null) => void
  onCredentialIssued: (credential: IssuedCredential) => void
}

function StepGPG({ profile, selectedKey, onSelectKey, onCredentialIssued }: StepGPGProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [signedMessage, setSignedMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo<GitHubKey | undefined>(
    () => profile.gpg_keys?.find((key) => String(key.id) === String(selectedKey)),
    [profile.gpg_keys, selectedKey],
  )

  const handleKeySelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onSelectKey(value || null)
    setChallenge(null)
    setSignedMessage('')
    setError('')
  }

  const requestChallenge = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    setChallenge(null)
    try {
      const response = await fetch('/.netlify/functions/gpg-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_id: profile.github_id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create challenge')
      setChallenge(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create challenge')
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    if (!challenge || !selected || !signedMessage.trim()) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/.netlify/functions/gpg-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_jwt: challenge.challenge_jwt,
          signed_message: signedMessage,
          public_key_armor: selected.raw_key || selected.public_key,
          github_id: profile.github_id,
          github_login: profile.github_login,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      onCredentialIssued(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const signingCommand = challenge && selected
    ? `printf '%s' "${challenge.nonce}" | gpg --clearsign --local-user ${selected.key_id}`
    : ''

  const [cmdCopied, setCmdCopied] = useState(false)
  const copyCmd = async () => {
    await navigator.clipboard.writeText(signingCommand)
    setCmdCopied(true)
    setTimeout(() => setCmdCopied(false), 1500)
  }

  const noKeys = !profile.gpg_keys || profile.gpg_keys.length === 0

  return (
    <article className="rounded-xl border border-(--rule) bg-(--cream) p-5">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--accent-mid)">Step 2</p>
        <h2 className="font-(--serif) text-xl text-(--accent)">Link GPG Key</h2>
      </header>

      {noKeys ? (
        <div className="rounded-lg border border-(--gold) bg-(--gold-light) px-4 py-3 text-sm text-(--gold)">
          <p className="font-semibold">No GPG keys on your GitHub profile</p>
          <p className="mt-1 text-xs">
            Add a GPG key at{' '}
            <a href="https://github.com/settings/keys" target="_blank" rel="noreferrer" className="underline">
              github.com/settings/keys
            </a>{' '}
            then reconnect GitHub in Step 1.
          </p>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <label className="block space-y-2">
            <span className="text-(--accent)">Select public GPG key from your GitHub profile</span>
            <select
              className="w-full rounded-lg border border-(--rule) bg-(--paper) px-3 py-2 text-(--ink) focus:outline-none focus:ring focus:ring-(--accent-mid)"
              onChange={handleKeySelect}
              value={selectedKey || ''}
            >
              <option value="">Choose a key…</option>
              {(profile.gpg_keys ?? []).map((key) => (
                <option key={key.id} value={key.id}>
                  {key.key_id} {key.name ? `- ${key.name}` : ''}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!selected || loading}
            onClick={requestChallenge}
            className="rounded-lg bg-(--accent-mid) px-4 py-2 text-sm font-semibold text-(--paper) transition hover:bg-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && !challenge ? 'Generating…' : 'Generate Signing Challenge'}
          </button>

          {challenge && selected && (
            <div className="space-y-4 rounded-lg border border-(--rule) bg-(--paper) p-4">
              <div>
                <p className="mb-1 text-xs text-[rgb(120,120,120)]">
                  Challenge nonce (expires in 10 minutes):
                </p>
                <code className="block rounded bg-(--cream) px-3 py-2 font-mono text-xs text-(--green) break-all">
                  {challenge.nonce}
                </code>
              </div>

              <div>
                <p className="mb-1 text-xs text-[rgb(120,120,120)]">
                  Run this command in your terminal to sign the nonce:
                </p>
                <div className="flex items-start gap-2">
                  <pre className="flex-1 overflow-x-auto rounded bg-(--cream) p-3 font-mono text-xs text-(--accent) whitespace-pre-wrap break-all">
                    {signingCommand}
                  </pre>
                  <button
                    type="button"
                    onClick={copyCmd}
                    className="shrink-0 rounded bg-(--accent-light) px-2 py-1 text-xs text-(--accent) hover:bg-(--rule)"
                  >
                    {cmdCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[rgb(120,120,120)]">
                  Tip: if the above uses <code>echo</code>, use{' '}
                  <code className="text-(--accent-mid)">printf '%s'</code> to avoid a trailing newline that would break verification.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-(--accent)">Paste the full clearsigned output here:</span>
                <textarea
                  value={signedMessage}
                  onChange={(e) => setSignedMessage(e.target.value)}
                  className="h-44 w-full rounded-lg border border-(--rule) bg-(--paper) px-3 py-2 font-mono text-xs text-(--ink) focus:outline-none focus:ring focus:ring-(--accent-mid)"
                  placeholder="-----BEGIN PGP SIGNED MESSAGE-----&#10;Hash: SHA256&#10;&#10;(your nonce here)&#10;&#10;-----BEGIN PGP SIGNATURE-----&#10;...&#10;-----END PGP SIGNATURE-----"
                  spellCheck={false}
                />
              </label>

              <button
                type="button"
                onClick={verify}
                disabled={loading || !signedMessage.trim()}
                className="rounded-lg bg-(--green) px-4 py-2 text-sm font-semibold text-(--paper) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Verifying signature…' : 'Verify Signature and Issue Credential'}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-(--red-soft) bg-[#f6e1e1] px-3 py-2 text-xs text-(--red-soft)">
              {error}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default StepGPG
