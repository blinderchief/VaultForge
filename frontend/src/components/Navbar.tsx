'use client'

import Link from 'next/link'
import { WalletButton } from '@/components/wallet/WalletButton'

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        VaultForge
      </Link>
      <div className="navbar-links">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/vault/create">Create Vault</Link>
      </div>
      <WalletButton />
    </nav>
  )
}
