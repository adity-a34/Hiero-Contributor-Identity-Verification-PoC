import type { GitHubProfile, OAuthStatus } from '../types'

type StepGitHubProps = {
  profile: GitHubProfile | null
  oauthStatus: OAuthStatus
}

function StepGitHub({ profile, oauthStatus }: StepGitHubProps) {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const origin = import.meta.env.VITE_APP_URL || window.location.origin
  const oauthUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId || '')}` +
    `&redirect_uri=${encodeURIComponent(origin)}` +
    `&scope=read:user%20read:gpg_key`

  return (
    <article className="rounded-xl border border-(--rule) bg-(--cream) p-5">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--accent-mid)">Step 1</p>
        <h2 className="font-(--serif) text-xl text-(--accent)">Connect GitHub</h2>
      </header>

      {oauthStatus.loading && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-(--rule) bg-(--paper) px-4 py-3 text-sm text-[rgb(68,68,68)]">
          <span className="inline-block animate-spin select-none" aria-hidden="true">⟳</span>
          <span>Completing GitHub OAuth, please wait...</span>
        </div>
      )}

      {oauthStatus.error && (
        <div className="mb-4 rounded-lg border border-(--red-soft) bg-[#f6e1e1] px-4 py-3 text-sm text-(--red-soft)">
          <p className="font-semibold">OAuth failed</p>
          <p className="mt-1 font-mono text-xs">{oauthStatus.error}</p>
          <p className="mt-2 text-xs text-[rgb(120,120,120)]">
            OAuth codes are single-use. Please click "Connect GitHub" again to start a new flow.
          </p>
        </div>
      )}

      {!profile && !oauthStatus.loading && (
        <>
          <p className="mb-4 text-sm text-[rgb(68,68,68)]">
            Connect your GitHub account to fetch your contributor profile and public GPG keys.
          </p>
          {!clientId ? (
            <div className="rounded-lg border border-(--gold) bg-(--gold-light) px-4 py-3 text-xs text-(--gold)">
              <p className="font-semibold">Setup required</p>
              <p className="mt-1">
                <code className="rounded bg-(--paper) px-1">VITE_GITHUB_CLIENT_ID</code> is not set.
                Set your environment variables in the Netlify dashboard or local <code className="rounded bg-(--paper) px-1">.env</code> file.
              </p>
            </div>
          ) : (
            <a
              href={oauthUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-(--accent-mid) px-4 py-2 text-sm font-semibold text-(--paper) transition hover:bg-(--accent)"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connect GitHub
            </a>
          )}
        </>
      )}

      {profile && (
        <div className="rounded-lg border border-(--green) bg-(--green-light) p-4">
          <div className="flex items-center gap-3">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.github_login}
                className="h-10 w-10 rounded-full border border-(--green)"
              />
            )}
            <div>
              <p className="font-semibold text-(--green)">GitHub Connected</p>
              <p className="text-sm text-(--ink)">@{profile.github_login}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-[rgb(85,85,85)]">
            <span>GitHub ID: <span className="text-(--ink)">{profile.github_id}</span></span>
            <span>GPG keys: <span className="text-(--ink)">{profile.gpg_keys?.length ?? 0}</span></span>
          </div>
          {(profile.gpg_keys?.length ?? 0) === 0 && (
            <p className="mt-3 text-xs text-(--gold)">
              No public GPG keys found on your GitHub profile. Add one at{' '}
              <a href="https://github.com/settings/keys" target="_blank" rel="noreferrer" className="underline">
                github.com/settings/keys
              </a>{' '}
              and reconnect.
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export default StepGitHub
