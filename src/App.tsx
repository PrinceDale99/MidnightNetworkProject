/**
 * App.tsx — ZK-Whistleblower
 *
 * Decentralized anonymous fraud and ESG violation reporting platform
 * powered by Zero-Knowledge proofs on Midnight Network.
 *
 * The entire app is a single-page React application that:
 *  1. Connects to the user's Lace wallet (Midnight DApp connector)
 *  2. Calls the `increment` circuit on the deployed counter contract
 *  3. Shows only the public result — private inputs are NEVER displayed
 */

import React from 'react'
import { WalletConnect } from './components/WalletConnect'
import { CircuitCall } from './components/CircuitCall'
import { useMidnight } from './hooks/useMidnight'
import './App.css'

export default function App() {
  const midnight = useMidnight()

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">⬡</span>
            <div className="logo-text">
              <span className="logo-name">ZK-Whistleblower</span>
              <span className="logo-network">Midnight Network</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-status" aria-label={`Network status: ${midnight.status}`}>
              <span className={`status-dot ${midnight.status}`} aria-hidden="true" />
              <span className="status-label">
                {midnight.status === 'connected'
                  ? 'Connected'
                  : midnight.status === 'connecting'
                  ? 'Connecting…'
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-badge" aria-label="Powered by Zero-Knowledge proofs">
          <span aria-hidden="true">🔒</span> Zero-Knowledge Proofs
        </div>
        <h1 id="hero-title" className="hero-title">
          Report Fraud.<br />
          <span className="hero-accent">Stay Anonymous.</span>
        </h1>
        <p className="hero-desc">
          A decentralized platform for employees to report internal fraud and ESG violations
          and claim financial bounties — completely anonymously. Powered by Midnight Network's
          ZK capabilities, your identity and credentials are cryptographically protected.
        </p>
      </section>

      {/* ── Main content ── */}
      <main className="main-content" aria-label="Main application">
        <div className="content-grid">
          {/* Left: Wallet + Privacy info */}
          <div className="left-col">
            {/* Wallet connection */}
            <WalletConnect
              status={midnight.status}
              walletAddress={midnight.walletAddress}
              walletName={midnight.walletName}
              networkId={midnight.networkId}
              error={midnight.error}
              onConnect={midnight.connect}
              onDisconnect={midnight.disconnect}
            />

            {/* Privacy model card */}
            <div className="privacy-card" aria-label="Privacy model explanation">
              <h3 className="card-title">
                <span aria-hidden="true">🔍</span> What's On-Chain vs Private
              </h3>
              <div className="privacy-row public">
                <span className="privacy-badge public-badge">PUBLIC</span>
                <div className="privacy-items">
                  <p>Counter value (total reports filed)</p>
                  <p>Report operation count</p>
                  <p>Owner credential hash</p>
                </div>
              </div>
              <div className="privacy-row private">
                <span className="privacy-badge private-badge">PRIVATE</span>
                <div className="privacy-items">
                  <p>Your identity and wallet address</p>
                  <p>Report amount / severity input</p>
                  <p>Your raw credential secret</p>
                </div>
              </div>
              <div className="privacy-row proved">
                <span className="privacy-badge proved-badge">ZK PROVED</span>
                <div className="privacy-items">
                  <p>You are a verified credential holder</p>
                  <p>Your input is in valid range [1–100]</p>
                  <p>You know the owner secret (for resets)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Circuit call */}
          <div className="right-col">
            <CircuitCall
              isWalletConnected={midnight.status === 'connected'}
              txStatus={midnight.txStatus}
              txResult={midnight.txResult}
              txError={midnight.txError}
              counterValue={midnight.counterValue}
              onCallCircuit={midnight.callIncrement}
            />

            {/* How it works */}
            <div className="how-it-works" aria-label="How it works steps">
              <h3 className="card-title">
                <span aria-hidden="true">⚙</span> How It Works
              </h3>
              <ol className="steps-list" aria-label="Steps to submit a report">
                <li className="step-item">
                  <span className="step-num" aria-hidden="true">1</span>
                  <div>
                    <strong>Connect Lace wallet</strong>
                    <p>Midnight DApp connector authenticates you without revealing identity</p>
                  </div>
                </li>
                <li className="step-item">
                  <span className="step-num" aria-hidden="true">2</span>
                  <div>
                    <strong>ZK proof generated locally</strong>
                    <p>Your credential and report input are proved valid inside your browser — never sent to any server</p>
                  </div>
                </li>
                <li className="step-item">
                  <span className="step-num" aria-hidden="true">3</span>
                  <div>
                    <strong>Anonymous report submitted</strong>
                    <p>Only the proof and public counter update land on-chain. Your identity stays private.</p>
                  </div>
                </li>
                <li className="step-item">
                  <span className="step-num" aria-hidden="true">4</span>
                  <div>
                    <strong>Bounty routed anonymously</strong>
                    <p>Verified reports trigger bounty payouts to a fresh wallet — untraceable by corporations</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-inner">
          <p>
            Built on{' '}
            <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
              Midnight Network
            </a>{' '}
            · Contract:{' '}
            <code className="footer-address" title="Deployed contract address">
              113506ad...3809
            </code>{' '}
            (Preview)
          </p>
          <p className="footer-note">
            Midnight Builder Challenge — Level 2 ·{' '}
            <a
              href="https://github.com/PrinceDale99/MidnightNetworkProject"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
