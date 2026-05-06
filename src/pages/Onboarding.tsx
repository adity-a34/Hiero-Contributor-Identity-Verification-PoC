import { useEffect, useMemo, useRef, useState } from 'react'
import StepGitHub from '../components/StepGitHub'
import StepGPG from '../components/StepGPG'
import StepCredential from '../components/StepCredential'
import type { GitHubProfile, IssuedCredential, OAuthStatus } from '../types'

const stepLabels = ['Connect GitHub', 'Link GPG Key', 'Contributor Credential']

function getInitialOAuthStatus() {
  if (typeof window === 'undefined') return { loading: false, error: '' }
  const code = new URL(window.location.href).searchParams.get('code')
  return code ? { loading: true, error: '' } : { loading: false, error: '' }
}

function Onboarding() {
  const [profile, setProfile] = useState<GitHubProfile | null>(null)
  const [credential, setCredential] = useState<IssuedCredential | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>(getInitialOAuthStatus)
  const exchangedRef = useRef(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (!code || exchangedRef.current) return
    exchangedRef.current = true

    const run = async () => {
      setOauthStatus({ loading: true, error: '' })
      try {
        const response = await fetch('/.netlify/functions/github-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await response.json() as Record<string, unknown>
        if (!response.ok) {
          const message =
            (typeof data.detail === 'string' && data.detail) ||
            (typeof data.details === 'string' && data.details) ||
            (typeof data.error === 'string' && data.error) ||
            'GitHub login failed'
          throw new Error(message)
        }
        setProfile(data as GitHubProfile)
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.pathname)
        setOauthStatus({ loading: false, error: '' })
      } catch (error) {
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.pathname)
        setOauthStatus({
          loading: false,
          error: error instanceof Error ? error.message : 'GitHub login failed',
        })
      }
    }

    run()
  }, [])

  const activeStep = useMemo(() => {
    if (credential) return 3
    if (profile) return 2
    return 1
  }, [profile, credential])

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-(--rule) bg-(--cream) p-4">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--gold)">Progress</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stepLabels.map((label, index) => {
            const step = index + 1
            const done = step < activeStep
            const current = step === activeStep
            return (
              <div
                key={label}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  done
                    ? 'border-(--green) bg-(--green-light) text-(--green)'
                    : current
                      ? 'border-(--accent-mid) bg-(--accent-light) text-(--accent-mid)'
                      : 'border-(--rule) text-[rgb(120,120,120)]'
                }`}
              >
                {done && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden="true">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
                Step {step}: {label}
              </div>
            )
          })}
        </div>
      </div>

      <StepGitHub profile={profile} oauthStatus={oauthStatus} />

      {profile && (
        <StepGPG
          profile={profile}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          onCredentialIssued={setCredential}
        />
      )}

      {credential && <StepCredential credential={credential} />}
    </section>
  )
}

export default Onboarding
