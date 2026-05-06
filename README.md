# Hiero Contributor Identity Verification , PoC

Deployable proof-of-concept for the **LFDT Hiero Contributor Identity Verification** mentorship project ([LFX listing](https://mentorship.lfx.linuxfoundation.org/project/64c64daa-ffdb-4871-82f5-01c1bdc7fecc/)).

Demonstrates two core flows from the full project deliverables:

1. **Contributor Onboarding** , GitHub OAuth login, GPG key selection, cryptographic proof-of-ownership via clearsigned nonce, ContributorCredential JWT issuance
2. **PR Verification Simulator** , fetches a real GitHub PR, validates a ContributorCredential JWT against the PR author, renders a GitHub-style status check result

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | Netlify Functions (Node.js 18, ESM, esbuild bundler) |
| GPG verification | `openpgp` v6 |
| JWT signing/verification | `jose` v6 |
| Identity | Simulated `did:key:poc-*` (full system uses `did:hedera` via Heka Identity Platform) |

## Local Development

```bash
npm install
cp .env.example .env   # fill in your values (see Setup below)
netlify dev            # runs Vite + functions together on :8888
```

> Use `netlify dev` (requires [Netlify CLI](https://docs.netlify.com/cli/get-started/)), not `npm run dev`,
> so the `/.netlify/functions/*` routes resolve correctly.

## Netlify Deployment

### 1. Create a GitHub OAuth App

Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**:

| Field | Value |
|-------|-------|
| Application name | `Hiero Identity PoC` (or anything) |
| Homepage URL | `https://your-netlify-app.netlify.app` |
| **Authorization callback URL** | `https://your-netlify-app.netlify.app` ← **must be the root URL exactly** |

### 2. Set Environment Variables in Netlify

In your Netlify dashboard → **Site configuration → Environment variables**, add:

| Variable | Value |
|----------|-------|
| `GITHUB_CLIENT_ID` | From your OAuth App |
| `GITHUB_CLIENT_SECRET` | From your OAuth App |
| `CHALLENGE_SECRET` | Run `openssl rand -hex 32` |
| `VC_SIGNING_SECRET` | Run `openssl rand -hex 32` |
| `VITE_GITHUB_CLIENT_ID` | Same as `GITHUB_CLIENT_ID` |
| `VITE_APP_URL` | Your Netlify deployment URL |

### 3. Deploy

Connect the repo to Netlify. It auto-detects `netlify.toml` and builds with `npm run build`.

## What This PoC Intentionally Omits

| Full System Feature | PoC Simulation |
|--------------------|---------------|
| Real `did:hedera` creation on Hedera Consensus Service | Deterministic `did:key:poc-*` derived from github_id + GPG fingerprint |
| OID4VCI credential issuance protocol (Heka Identity Service) | Signed JWT with same claims structure |
| OID4VP presentation flow (Heka Wallet) | JWT pasted directly into PR Verifier |
| Linked VP in DID Document | N/A |
| GitHub App webhook + Checks API | Manual PR URL input; result displayed inline |

These capabilities are the core of the full mentorship project deliverables and are deliberately simulated here for Netlify portability.

## Disclaimer

This is a proof-of-concept for the LFDT Hiero Contributor Identity Verification mentorship project (#87). It simulates the OID4VCI credential issuance and Hedera DID anchoring flows that would be implemented in the full system using Heka Identity Platform and the Hedera Consensus Service. No real DIDs are created on Hedera in this demo.

![home_page of PoC](public/image.png)

### Step 1: Connect GitHub
![Connect GitHub OAuth redirect](public/image-1.png)

![OAuth completed](public/image-2.png)


### Step 2: Link GPG Key

![select the GPG key from the dropdown](public/image-3.png)

![Generate the signing challenge](public/image-4.png)

![On completion](public/image-5.png)


### PR verifier
![the PR Verifier page](public/image-7.png)
![Output for PR verifier](public/image-6.png)