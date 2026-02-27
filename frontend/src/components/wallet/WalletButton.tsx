'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useSwitchChain } from 'wagmi'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function WalletButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { address, chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const didRedirect = useRef(false)

  // Auto-redirect on wallet connect: existing user → dashboard, new user → create vault
  useEffect(() => {
    if (!ready || !authenticated || !address || didRedirect.current) return
    // Only redirect from the landing page
    if (pathname !== '/') return

    didRedirect.current = true
    api.vaultsByWallet(address)
      .then((data) => {
        if (data.vaults.length > 0) {
          router.push('/dashboard')
        } else {
          router.push('/vault/create')
        }
      })
      .catch(() => {
        // Backend unavailable — default to dashboard
        router.push('/dashboard')
      })
  }, [ready, authenticated, address, pathname, router])

  if (!ready) {
    return (
      <button disabled className="wallet-btn opacity-50">
        <span className="animate-pulse">Loading...</span>
      </button>
    )
  }

  if (!authenticated) {
    return (
      <button onClick={login} className="wallet-btn-primary">
        Connect Wallet
      </button>
    )
  }

  // Wrong network — must switch to opBNB
  if (chain?.id !== 5611) {
    return (
      <button
        onClick={() => switchChain({ chainId: 5611 })}
        className="wallet-btn-warning"
      >
        ⚠ Switch to opBNB Testnet
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="wallet-btn-connected"
      >
        <span className="green-dot" />
        <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <span className="chain-badge">opBNB</span>
      </button>

      {showMenu && (
        <div className="wallet-dropdown">
          <button
            onClick={() => {
              navigator.clipboard.writeText(address || '')
              toast.success('Address copied')
              setShowMenu(false)
            }}
          >
            Copy Address
          </button>
          <a
            href={`https://testnet.opbnbscan.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on opBNBScan ↗
          </a>
          <button
            onClick={() => {
              logout()
              setShowMenu(false)
            }}
            className="text-red-400"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
