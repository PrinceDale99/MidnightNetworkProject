# ZK-Whistleblower

> A decentralized anonymous fraud and ESG violation reporting platform powered by Zero-Knowledge proofs on Midnight Network.

## Live Demo

[PLACEHOLDER — paste Vercel/Netlify URL after deploying frontend]

## Contract Address

| Network  | Address                                                          |
|----------|------------------------------------------------------------------|
| Preview  | 113506ad58111449d58e29b91a68b77683058b3e40b0c1d866631e4d7f683809 |
| Preprod  | [PASTE ADDRESS AFTER DEPLOY]                                     |

## What This Does

ZK-Whistleblower is a decentralized platform that enables employees to anonymously report internal corporate fraud or ESG (Environmental, Social, Governance) violations and claim financial bounties — without ever revealing their identity.

The frontend connects to the user's Lace wallet via the Midnight DApp connector, calls the `increment` circuit on the deployed counter contract, generates a ZK proof locally inside the browser, and submits the proven transaction on-chain. The public counter tracks total reports filed; the caller's identity and report details are never exposed.

Circuits available:
- **`increment`** — Files an anonymous report (private amount, 1–100). Only the new total is published on-chain.
- **`increment_public`** — Opt-in variant where the caller also discloses the increment amount.
- **`reset`** — Owner-only reset via ZK ownership proof. Raw secret never revealed.

## Privacy Model

- **PUBLIC** (on-chain, visible to anyone):
  - `round` — total number of report operations performed
  - `count` — current public counter value (Uint<64>)
  - `owner` — `persistentHash` of the owner's secret (Bytes<32>)
  - The new counter value after each increment (via `disclose(count)`)

- **PRIVATE** (private witness, never on-chain):
  - `increment_amount()` — the exact report severity / amount input
  - `caller_secret()` — the owner's raw 32-byte secret key

- **What the user PROVES without revealing:**
  - That their increment amount is in the valid range [1, 100] — ZK circuit constraint
  - That `persistentHash(caller_secret) == owner` — proving ownership without leaking the secret
  - That they are a valid credential holder — without disclosing identity, department, or wallet

## Privacy Claim

An on-chain observer sees: the new counter value, the proof that the transaction was valid, and the owner hash.

An on-chain observer **cannot** see: the caller's identity, wallet address, the exact increment amount, or any report content. The ZK proof guarantees validity without revealing inputs. Even if the corporation monitors the blockchain, they cannot link a transaction to a specific employee.

## Tech Stack

- [Midnight Network](https://midnight.network/) — privacy-preserving blockchain
- [Compact](https://docs.midnight.network/compact) — ZK smart contract language (v0.23)
- [Midnight.js SDK](https://docs.midnight.network/sdks/official/midnight-js) — DApp connector API
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — frontend
- [Lace Wallet](https://www.lace.io/) — Midnight DApp connector
- Node.js v22, Docker, TypeScript, Jest

## Prerequisites

- [Node.js v22+](https://nodejs.org/) — `node --version`
- [Lace wallet](https://www.lace.io/) browser extension with Midnight DApp connector enabled
- Docker (for the proof server when running locally)
- `compactc` v0.31.1 — [download](https://github.com/LFDT-Minokawa/compact/releases/tag/compactc-v0.31.1)
  - Windows: use WSL Ubuntu with `x86_64-unknown-linux-musl` binary

## Run Locally

```bash
# Clone
git clone https://github.com/PrinceDale99/MidnightNetworkProject.git
cd MidnightNetworkProject

# Install dependencies
npm install

# Start the frontend dev server
npm run dev
# Open http://localhost:5173
```

## Compile Contract

```bash
# Requires compactc in PATH (see Prerequisites)
npm run compile
# or: compactc contracts/counter.compact managed
```

Expected output:
```
Compiling 3 circuits:
  circuit "increment" (k=9, rows=213)
  circuit "increment_public" (k=9, rows=213)
  circuit "reset" (k=13, rows=2281)
Overall progress [====================] 3/3
```

## Run Tests

```bash
npm run test:run
# 10 tests passing — circuit logic, state transitions, privacy guarantees
```

## Run Proof Server

```bash
docker run -p 6300:6300 midnightnetwork/proof-server
```

## Deploy Frontend

**Vercel (recommended):**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Both configs (`vercel.json` and `netlify.toml`) are included in the repo.

## Demo Video

[PLACEHOLDER — add link after recording]

## Initial Idea

**ZK-Whistleblower** — A decentralized anti-corruption and corporate auditing platform that enables employees to securely report internal fraud or environmental (ESG) violations and claim financial bounties completely anonymously.

By utilizing Midnight's Zero-Knowledge capabilities, a worker can use a privately issued cryptographic credential to prove they are a verified employee of the organization — without revealing their name, department, or wallet address. The platform evaluates submitted evidence via encrypted state, and if the violation is verified, it automatically routes a financial bounty to the whistleblower's fresh wallet — ensuring corporations cannot trace the payout.

This protects whistleblowers from retaliation while incentivizing systemic transparency at scale.

## Screenshots

**Successful compile output (circuits listed)**

![Compile output showing 3 circuits](public/CircuitsList.png)

**Contract deployed with address**

![Contract deployed successfully with address](public/CompileSuccess.png)

---

Built for **Midnight Builder Challenge — Level 1 & 2** on [Rise In](https://www.risein.com/).
