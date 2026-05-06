import { useState } from 'react'
import Onboarding from './pages/Onboarding'
import PRVerifier from './pages/PRVerifier'

type TabId = 'onboarding' | 'pr-verifier'

const tabs = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'pr-verifier', label: 'PR Verifier' },
] as const

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('onboarding')

  return (
    <div className="min-h-screen bg-(--paper) text-(--ink)">
      <main className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-10 pt-8 md:px-6">
        <header className="mb-8 rounded-xl border border-(--rule) bg-(--cream)/80 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--accent-mid)">
            LFDT Mentorship PoC
          </p>
          <h1 className="mt-2 font-(--serif) text-2xl text-(--accent) md:text-3xl">
            Hiero Contributor Identity Verification
          </h1>
          <p className="mt-3 text-sm text-[rgb(68,68,68)]">
            Simulated contributor identity onboarding and PR verification using Netlify
            Functions, JWTs, and OpenPGP signature checks.
          </p>
        </header>

        <div className="mb-6 flex rounded-lg border border-(--rule) bg-(--cream) p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-(--accent-mid) text-(--paper)'
                  : 'text-(--accent) hover:bg-(--accent-light)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'onboarding' ? <Onboarding /> : <PRVerifier />}
      </main>

      <footer className="border-t border-(--rule) bg-(--cream)/70 px-4 py-6 text-xs text-[rgb(85,85,85)] md:px-6">
        <div className="mx-auto max-w-5xl">
          This is a proof-of-concept demonstration for the LFDT Hiero Contributor Identity
          Verification mentorship project. It simulates the OID4VCI credential issuance and
          Hedera DID anchoring flows that would be implemented in the full system using Heka
          Identity Platform and the Hedera Consensus Service. No real DIDs are created on
          Hedera in this demo.
        </div>
      </footer>
    </div>
  )
}

export default App
