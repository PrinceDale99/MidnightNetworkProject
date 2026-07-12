/**
 * WalletConnect.tsx
 *
 * Wallet connect / disconnect UI component for ZK-Whistleblower.
 *
 * Shows:
 *  - Connect button → triggers Lace wallet connection
 *  - Connected state with wallet address (truncated for readability)
 *  - Disconnect button
 *  - Error states: not installed, user rejected, wrong network
 *  - Network badge (must be Midnight TestNet)
 */

import React from 'react'
import type { ConnectionStatus } from '../hooks/useMidnight'

interface WalletConnectProps {
  status: ConnectionStatus
  walletAddress: string | null
  networkId: string | null
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
}

/** Truncates a long address for display: mn_addr_pre...abc123 */
function truncateAddress(addr: string): string {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 14)}...${addr.slice(-6)}`
}

export function WalletConnect({
  status,
  walletAddress,
  networkId,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isError = status === 'error'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.indicator(isConnected)} aria-label={isConnected ? 'Connected' : 'Disconnected'} />
        <span style={styles.label}>
          {isConnected ? 'Wallet Connected' : 'Wallet'}
        </span>
        {isConnected && networkId && (
          <span style={styles.networkBadge}>{networkId}</span>
        )}
      </div>

      {/* Connected state */}
      {isConnected && walletAddress && (
        <div style={styles.addressRow}>
          <span style={styles.addressLabel}>Address</span>
          <code
            style={styles.address}
            title={walletAddress}
            aria-label={`Wallet address: ${walletAddress}`}
          >
            {truncateAddress(walletAddress)}
          </code>
        </div>
      )}

      {/* Error message */}
      {isError && error && (
        <div style={styles.errorBox} role="alert" aria-live="polite">
          <span style={styles.errorIcon}>⚠</span>
          <span style={styles.errorText}>{error}</span>
          {error.includes('lace.io') && (
            <a
              href="https://www.lace.io/"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.errorLink}
            >
              Install Lace →
            </a>
          )}
        </div>
      )}

      {/* Action button */}
      {isConnected ? (
        <button
          style={styles.disconnectBtn}
          onClick={onDisconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      ) : (
        <button
          style={styles.connectBtn(isConnecting)}
          onClick={onConnect}
          disabled={isConnecting}
          aria-label={isConnecting ? 'Connecting to wallet...' : 'Connect Lace wallet'}
          aria-busy={isConnecting}
        >
          {isConnecting ? (
            <>
              <span style={styles.spinner} aria-hidden="true" /> Connecting…
            </>
          ) : (
            <>
              <span style={styles.laceIcon} aria-hidden="true">⬡</span>
              Connect Lace Wallet
            </>
          )}
        </button>
      )}

      {/* Not installed hint */}
      {!isConnected && !isConnecting && status === 'disconnected' && (
        <p style={styles.hint}>
          Requires{' '}
          <a href="https://www.lace.io/" target="_blank" rel="noopener noreferrer">
            Lace wallet
          </a>{' '}
          with Midnight DApp connector enabled
        </p>
      )}
    </div>
  )
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const styles = {
  container: {
    background: '#111318',
    border: '1px solid #1e2330',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    minWidth: '280px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  indicator: (connected: boolean) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: connected ? '#00ff88' : '#4a5568',
    boxShadow: connected ? '0 0 6px #00ff88' : 'none',
    flexShrink: 0,
  }),
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#8892a4',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flex: 1,
  },
  networkBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#4f9eff',
    background: 'rgba(79, 158, 255, 0.1)',
    border: '1px solid rgba(79, 158, 255, 0.2)',
    borderRadius: '4px',
    padding: '2px 6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#0d0f14',
    border: '1px solid #1e2330',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  addressLabel: {
    fontSize: '12px',
    color: '#4a5568',
    fontWeight: 500,
    flexShrink: 0,
  },
  address: {
    fontSize: '13px',
    color: '#00ff88',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    flex: 1,
    textAlign: 'right' as const,
    wordBreak: 'break-all' as const,
  },
  errorBox: {
    background: 'rgba(255, 79, 79, 0.08)',
    border: '1px solid rgba(255, 79, 79, 0.25)',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  errorIcon: {
    fontSize: '14px',
    color: '#ff4f4f',
  },
  errorText: {
    fontSize: '13px',
    color: '#ff9999',
    lineHeight: 1.4,
  },
  errorLink: {
    fontSize: '12px',
    color: '#4f9eff',
    textDecoration: 'none',
    fontWeight: 600,
  },
  connectBtn: (loading: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 20px',
    background: loading
      ? 'rgba(0, 255, 136, 0.08)'
      : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    color: loading ? '#00ff88' : '#0a0c10',
    border: loading ? '1px solid rgba(0, 255, 136, 0.3)' : 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease',
  }),
  disconnectBtn: {
    width: '100%',
    padding: '10px 20px',
    background: 'transparent',
    color: '#8892a4',
    border: '1px solid #1e2330',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  laceIcon: {
    fontSize: '16px',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0, 255, 136, 0.3)',
    borderTopColor: '#00ff88',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  hint: {
    fontSize: '12px',
    color: '#4a5568',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
}
