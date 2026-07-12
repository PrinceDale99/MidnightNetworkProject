/**
 * CircuitCall.tsx
 *
 * ZK circuit call UI for the ZK-Whistleblower counter contract.
 *
 * Calls the `increment` circuit on the deployed Midnight contract.
 *
 * PRIVACY DESIGN:
 *  - The increment_amount witness is a PRIVATE input resolved by the Lace
 *    wallet and local proof server. It is NEVER shown in the UI, stored in
 *    component state, or logged anywhere in this file.
 *  - Only the NEW counter value (publicly disclosed on-chain via disclose())
 *    is shown after a successful transaction.
 *  - The label "Proved without revealing your input" is always visible.
 *
 * Flow: Connect wallet → Click "Submit Report" → Lace prompts for approval
 *       → ZK proof generated locally → TX submitted → New count shown
 */

import React from 'react'
import type { TxStatus } from '../hooks/useMidnight'

interface CircuitCallProps {
  isWalletConnected: boolean
  txStatus: TxStatus
  txResult: string | null
  txError: string | null
  counterValue: number | null
  onCallCircuit: () => void
}

/** Maps TxStatus to a human-readable step label */
function statusLabel(status: TxStatus): string {
  switch (status) {
    case 'proving':
      return 'Generating ZK proof locally…'
    case 'submitting':
      return 'Submitting transaction to Midnight…'
    case 'confirmed':
      return 'Transaction confirmed on-chain'
    case 'error':
      return 'Transaction failed'
    default:
      return ''
  }
}

/** Progress step indicator */
function StepIndicator({ status }: { status: TxStatus }) {
  const steps: { key: TxStatus | 'idle'; label: string }[] = [
    { key: 'proving', label: 'ZK Proof' },
    { key: 'submitting', label: 'Submit' },
    { key: 'confirmed', label: 'Confirmed' },
  ]

  const activeIndex =
    status === 'proving' ? 0 :
    status === 'submitting' ? 1 :
    status === 'confirmed' ? 2 : -1

  if (status === 'idle' || status === 'error') return null

  return (
    <div style={stepStyles.container} aria-label="Transaction progress">
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div style={stepStyles.step}>
            <div style={stepStyles.dot(i, activeIndex)} aria-hidden="true">
              {i < activeIndex ? '✓' : i + 1}
            </div>
            <span style={stepStyles.label(i, activeIndex)}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={stepStyles.line(i, activeIndex)} aria-hidden="true" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const stepStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '12px 0',
  },
  step: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
  },
  dot: (i: number, active: number) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    background:
      i < active ? '#00ff88' :
      i === active ? 'rgba(0, 255, 136, 0.2)' :
      '#1e2330',
    color:
      i < active ? '#0a0c10' :
      i === active ? '#00ff88' :
      '#4a5568',
    border: i === active ? '1px solid #00ff88' : '1px solid transparent',
    boxShadow: i === active ? '0 0 8px rgba(0, 255, 136, 0.3)' : 'none',
    transition: 'all 0.3s ease',
  }),
  label: (i: number, active: number) => ({
    fontSize: '10px',
    color: i <= active ? '#8892a4' : '#4a5568',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
  }),
  line: (i: number, active: number) => ({
    flex: 1,
    height: '1px',
    background: i < active ? '#00ff88' : '#1e2330',
    transition: 'background 0.3s ease',
    maxWidth: '40px',
    marginBottom: '20px',
  }),
}

// ── Main component ────────────────────────────────────────────────────────────

export function CircuitCall({
  isWalletConnected,
  txStatus,
  txResult,
  txError,
  counterValue,
  onCallCircuit,
}: CircuitCallProps) {
  const isLoading = txStatus === 'proving' || txStatus === 'submitting'
  const isConfirmed = txStatus === 'confirmed'
  const isError = txStatus === 'error'

  return (
    <div style={styles.container}>
      {/* Section header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Submit Anonymous Report</h2>
          <p style={styles.subtitle}>
            File a fraud or ESG violation report. Your identity stays private.
          </p>
        </div>
        <div style={styles.zkBadge} aria-label="Zero-knowledge proof">
          <span style={styles.zkIcon}>🔒</span>
          <span>ZK Proof</span>
        </div>
      </div>

      {/* Privacy notice — always visible */}
      <div style={styles.privacyNotice} role="note" aria-label="Privacy guarantee">
        <span style={styles.privacyIcon} aria-hidden="true">🛡</span>
        <div>
          <p style={styles.privacyTitle}>Proved without revealing your input</p>
          <p style={styles.privacyDesc}>
            A zero-knowledge proof verifies your credentials and report on-chain.
            Your identity, report content, and credential details are never
            exposed — only the proof that they are valid.
          </p>
        </div>
      </div>

      {/* Contract info */}
      <div style={styles.contractInfo}>
        <span style={styles.contractLabel}>Contract</span>
        <code style={styles.contractAddress} title="Deployed contract address">
          113506...3809
        </code>
        <span style={styles.networkTag}>Preview</span>
      </div>

      {/* Step indicator (only shown during tx) */}
      <StepIndicator status={txStatus} />

      {/* Loading status text */}
      {isLoading && (
        <div style={styles.statusRow} aria-live="polite" aria-busy="true">
          <span style={styles.loadingDot} aria-hidden="true" />
          <span style={styles.statusText}>{statusLabel(txStatus)}</span>
        </div>
      )}

      {/* Success result */}
      {isConfirmed && txResult && (
        <div style={styles.resultBox} role="status" aria-live="polite">
          <div style={styles.resultHeader}>
            <span style={styles.checkIcon} aria-hidden="true">✓</span>
            <span style={styles.resultTitle}>Report submitted on-chain</span>
          </div>
          {counterValue !== null && (
            <div style={styles.resultValue}>
              <span style={styles.resultLabel}>Reports filed (public counter)</span>
              <span style={styles.resultNumber} aria-label={`Counter value: ${counterValue}`}>
                {counterValue}
              </span>
            </div>
          )}
          <p style={styles.resultNote}>
            🔒 Your increment amount was proved privately — it was never revealed on-chain or in this UI.
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && txError && (
        <div style={styles.errorBox} role="alert" aria-live="assertive">
          <span style={styles.errorIcon} aria-hidden="true">✗</span>
          <div>
            <p style={styles.errorTitle}>Transaction failed</p>
            <p style={styles.errorText}>{txError}</p>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        style={styles.actionBtn(isLoading, !isWalletConnected)}
        onClick={onCallCircuit}
        disabled={isLoading || !isWalletConnected}
        aria-label={
          !isWalletConnected
            ? 'Connect wallet to submit report'
            : isLoading
            ? statusLabel(txStatus)
            : 'Submit anonymous report via ZK proof'
        }
        aria-busy={isLoading}
        aria-disabled={!isWalletConnected}
      >
        {isLoading ? (
          <>
            <span style={styles.btnSpinner} aria-hidden="true" />
            {txStatus === 'proving' ? 'Generating Proof…' : 'Submitting…'}
          </>
        ) : !isWalletConnected ? (
          'Connect Wallet First'
        ) : isConfirmed ? (
          'Submit Another Report'
        ) : (
          <>
            <span aria-hidden="true">⬡</span>
            Submit Anonymous Report
          </>
        )}
      </button>

      {!isWalletConnected && (
        <p style={styles.disabledHint}>Connect your Lace wallet above to submit</p>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    background: '#111318',
    border: '1px solid #1e2330',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#e8eaf0',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8892a4',
    lineHeight: 1.4,
  },
  zkBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#00ff88',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
  zkIcon: {
    fontSize: '12px',
  },
  privacyNotice: {
    display: 'flex',
    gap: '12px',
    background: 'rgba(0, 255, 136, 0.04)',
    border: '1px solid rgba(0, 255, 136, 0.12)',
    borderRadius: '10px',
    padding: '14px 16px',
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: '20px',
    flexShrink: 0,
    marginTop: '1px',
  },
  privacyTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#00ff88',
    marginBottom: '4px',
  },
  privacyDesc: {
    fontSize: '12px',
    color: '#8892a4',
    lineHeight: 1.5,
  },
  contractInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#0d0f14',
    border: '1px solid #1e2330',
    borderRadius: '8px',
    padding: '8px 14px',
  },
  contractLabel: {
    fontSize: '11px',
    color: '#4a5568',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  contractAddress: {
    fontSize: '12px',
    color: '#8892a4',
    fontFamily: "'JetBrains Mono', monospace",
    flex: 1,
  },
  networkTag: {
    fontSize: '10px',
    color: '#4f9eff',
    background: 'rgba(79, 158, 255, 0.1)',
    border: '1px solid rgba(79, 158, 255, 0.2)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#00ff88',
    boxShadow: '0 0 6px #00ff88',
    animation: 'pulse 1s ease-in-out infinite',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '13px',
    color: '#00ff88',
    fontWeight: 500,
  },
  resultBox: {
    background: 'rgba(0, 255, 136, 0.05)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#00ff88',
    color: '#0a0c10',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 900,
    flexShrink: 0,
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#00ff88',
  },
  resultValue: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0d0f14',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  resultLabel: {
    fontSize: '12px',
    color: '#8892a4',
  },
  resultNumber: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#e8eaf0',
    fontFamily: "'JetBrains Mono', monospace",
  },
  resultNote: {
    fontSize: '12px',
    color: '#4a5568',
    lineHeight: 1.4,
  },
  errorBox: {
    display: 'flex',
    gap: '10px',
    background: 'rgba(255, 79, 79, 0.06)',
    border: '1px solid rgba(255, 79, 79, 0.2)',
    borderRadius: '10px',
    padding: '14px 16px',
    alignItems: 'flex-start',
  },
  errorIcon: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#ff4f4f',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 900,
    flexShrink: 0,
  },
  errorTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ff4f4f',
    marginBottom: '4px',
  },
  errorText: {
    fontSize: '12px',
    color: '#ff9999',
    lineHeight: 1.4,
  },
  actionBtn: (loading: boolean, disabled: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 20px',
    background:
      disabled
        ? '#1e2330'
        : loading
        ? 'rgba(0, 255, 136, 0.08)'
        : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    color:
      disabled
        ? '#4a5568'
        : loading
        ? '#00ff88'
        : '#0a0c10',
    border:
      disabled
        ? '1px solid #1e2330'
        : loading
        ? '1px solid rgba(0, 255, 136, 0.3)'
        : 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
    opacity: 1,
    transition: 'all 0.2s ease',
  }),
  btnSpinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0, 255, 136, 0.3)',
    borderTopColor: '#00ff88',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  disabledHint: {
    fontSize: '12px',
    color: '#4a5568',
    textAlign: 'center' as const,
  },
}
