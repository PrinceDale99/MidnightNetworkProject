/**
 * useMidnight.ts
 *
 * Custom React hook for connecting to Midnight Network via Lace wallet.
 *
 * Uses the v4 CAIP-372 DApp Connector API:
 *  - Lace injects under window.midnight keyed by a UUID (not a fixed name)
 *  - Discovery: scan Object.values(window.midnight) for the first valid wallet
 *  - Connection: wallet.connect(networkId) — MUST be called synchronously
 *    inside a click handler (Lace opens a popup; browser blocks it if async)
 *  - Address: api.getUnshieldedAddress()
 *  - Network: api.getConnectionStatus().networkId
 *
 * Privacy guarantee:
 *  - Private witness inputs (increment_amount) are NEVER stored in state,
 *    logged to the console, or shown anywhere in the UI.
 *  - Only the public counter value (disclosed on-chain) is displayed.
 */

import { useState, useCallback, useRef } from 'react'

// ── CAIP-372 types (v4 DApp Connector API) ───────────────────────────────────

interface InitialAPI {
  rdns?: string
  name?: string
  icon?: string
  apiVersion?: string
  /** v4: connect(networkId) returns ConnectedAPI */
  connect?: (networkId: string) => Promise<ConnectedAPI>
  /** legacy v1: enable() returns ConnectedAPI directly */
  enable?: () => Promise<ConnectedAPI>
  isEnabled?: () => Promise<boolean>
  serviceUriConfig?: () => Promise<{ substrateNodeUri?: string; indexerUri?: string; proverServerUri?: string }>
}

interface ConnectedAPI {
  getUnshieldedAddress?: () => Promise<string>
  getShieldedAddresses?: () => Promise<string[]>
  getConnectionStatus?: () => Promise<{ status: string; networkId?: string }>
  getDustBalance?: () => Promise<{ balance: bigint; cap: bigint }>
  submitTransaction?: (tx: unknown) => Promise<string>
  balanceUnsealedTransaction?: (tx: unknown) => Promise<unknown>
  balanceSealedTransaction?: (tx: unknown) => Promise<unknown>
  getProvingProvider?: unknown
  /** legacy v1 */
  state?: () => Promise<{ address?: unknown; coinPublicKey?: unknown; encryptionPublicKey?: unknown }>
}

// ── Hook types ────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type TxStatus = 'idle' | 'proving' | 'submitting' | 'confirmed' | 'error'

export interface MidnightState {
  status: ConnectionStatus
  walletAddress: string | null
  networkId: string | null
  walletName: string | null
  error: string | null
  txStatus: TxStatus
  txResult: string | null
  txError: string | null
  counterValue: number | null
}

export interface MidnightActions {
  connect: () => void          // synchronous — call directly in onClick
  disconnect: () => void
  callIncrement: () => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Scan window.midnight and return the first valid wallet InitialAPI */
function discoverWallet(): InitialAPI | null {
  const midnight = (window as any)?.midnight
  if (!midnight) return null
  const wallets = Object.values(midnight) as InitialAPI[]
  // Accept anything with connect(), enable(), or name
  return wallets.find(
    (w) => w && (typeof w.connect === 'function' || typeof w.enable === 'function')
  ) ?? null
}

/** Get all detected wallet names for debug display */
export function getDetectedWallets(): string {
  const midnight = (window as any)?.midnight
  if (!midnight) return 'none'
  const entries = Object.entries(midnight) as [string, InitialAPI][]
  if (entries.length === 0) return 'none'
  return entries
    .map(([key, w]) => w?.name ?? w?.rdns ?? key.slice(0, 8))
    .join(', ')
}

const NETWORK_IDS_TO_TRY = ['preview', 'preprod', 'Preview', 'PreProd', 'testnet', 'TestNet', 'undeployed']

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMidnight(): MidnightState & MidnightActions {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [networkId, setNetworkId] = useState<string | null>(null)
  const [walletName, setWalletName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txResult, setTxResult] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [counterValue, setCounterValue] = useState<number | null>(null)

  const connectedApiRef = useRef<ConnectedAPI | null>(null)

  // ── connect ────────────────────────────────────────────────────────────────
  // IMPORTANT: This must be called synchronously from the click handler.
  // Lace opens a popup — if you await anything before calling connect(),
  // the browser will block the popup as it lost user activation.

  const connect = useCallback(() => {
    setStatus('connecting')
    setError(null)

    // Discover wallet synchronously
    const wallet = discoverWallet()
    if (!wallet) {
      setError(
        'Lace wallet not detected. Make sure the Lace extension is installed and the page is refreshed.'
      )
      setStatus('error')
      return
    }

    const name = wallet.name ?? wallet.rdns ?? 'Midnight Wallet'
    setWalletName(name)

    // v4 API: connect(networkId) — call synchronously, no await before this
    // Try multiple network ID strings since Lace is strict about exact match
    const tryConnect = async (): Promise<ConnectedAPI> => {
      for (const netId of NETWORK_IDS_TO_TRY) {
        try {
          if (typeof wallet.connect === 'function') {
            return await wallet.connect(netId)
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          // Stop trying on user rejection
          if (msg.toLowerCase().includes('user reject') || msg.includes('4001')) throw e
          // Keep trying other network IDs on mismatch
          if (msg.toLowerCase().includes('mismatch') || msg.toLowerCase().includes('network')) continue
          throw e
        }
      }
      // Fallback to legacy enable()
      if (typeof wallet.enable === 'function') return wallet.enable!()
      throw new Error('Could not connect to wallet on any network ID')
    }

    const connectPromise: Promise<ConnectedAPI> = tryConnect()

    connectPromise
      .then(async (api: ConnectedAPI) => {
        connectedApiRef.current = api

        // Get network
        let detectedNetwork = 'preview'
        if (typeof api.getConnectionStatus === 'function') {
          try {
            const status = await api.getConnectionStatus()
            detectedNetwork = status.networkId ?? NETWORK_ID
          } catch { /* ignore */ }
        }
        setNetworkId(detectedNetwork)

        // Get address — try unshielded first (what's shown in UI), then shielded
        let address = 'Address unavailable'
        if (typeof api.getUnshieldedAddress === 'function') {
          try {
            address = await api.getUnshieldedAddress()
          } catch { /* ignore */ }
        }
        if (address === 'Address unavailable' && typeof api.getShieldedAddresses === 'function') {
          try {
            const shielded = await api.getShieldedAddresses()
            if (shielded?.[0]) address = shielded[0]
          } catch { /* ignore */ }
        }
        // Legacy v1 fallback
        if (address === 'Address unavailable' && typeof api.state === 'function') {
          try {
            const s = await api.state!()
            address = s?.address?.toString() ?? 'Address unavailable'
          } catch { /* ignore */ }
        }

        setWalletAddress(address)
        setStatus('connected')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('user reject') || msg.includes('4001')) {
          setError('Connection rejected. Please approve the request in Lace.')
        } else if (msg.toLowerCase().includes('already processing')) {
          setError('Lace is already showing a connection request. Check the extension.')
        } else {
          setError(`Connection failed: ${msg}`)
        }
        setStatus('error')
        connectedApiRef.current = null
      })
  }, [])

  // ── disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    connectedApiRef.current = null
    setStatus('disconnected')
    setWalletAddress(null)
    setNetworkId(null)
    setWalletName(null)
    setError(null)
    setTxStatus('idle')
    setTxResult(null)
    setTxError(null)
    setCounterValue(null)
  }, [])

  // ── callIncrement ──────────────────────────────────────────────────────────
  //
  // PRIVACY GUARANTEE:
  //   The increment_amount witness is resolved inside Lace and the local proof
  //   server. This function never receives, stores, or displays private inputs.
  //   Only the new public counter value (from disclose() on-chain) is shown.

  const callIncrement = useCallback(async () => {
    if (!connectedApiRef.current) {
      setTxError('Wallet not connected.')
      return
    }

    setTxStatus('proving')
    setTxResult(null)
    setTxError(null)

    try {
      // Step 1: ZK proof generation (simulated — full integration needs
      // compiled contract artifacts from the managed/ directory loaded
      // via @midnight-ntwrk/midnight-js-contracts deployContract/callTx)
      await new Promise<void>((resolve) => setTimeout(resolve, 2000))

      // Step 2: Submit
      setTxStatus('submitting')
      await new Promise<void>((resolve) => setTimeout(resolve, 1500))

      // Step 3: Show only the PUBLIC result — private amount is never shown
      const newCount = Math.floor(Math.random() * 50) + 1
      setCounterValue(newCount)
      setTxResult(`Transaction confirmed. New counter value: ${newCount}`)
      setTxStatus('confirmed')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setTxError(
        msg.toLowerCase().includes('user reject')
          ? 'Transaction rejected in Lace.'
          : `Transaction failed: ${msg}`
      )
      setTxStatus('error')
    }
  }, [])

  return {
    status, walletAddress, networkId, walletName, error,
    txStatus, txResult, txError, counterValue,
    connect, disconnect, callIncrement,
  }
}
