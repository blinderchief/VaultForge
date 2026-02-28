'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WalletButton } from '@/components/wallet/WalletButton'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        VaultForge
      </Link>

      {/* Desktop links */}
      <div className="navbar-links hidden md:flex">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/vault/create">Create Vault</Link>
        <Link href="/presentation-deck">Pitch</Link>
      </div>

      <div className="hidden md:block">
        <WalletButton />
      </div>

      {/* Mobile hamburger */}
      <button
        className="flex md:hidden flex-col gap-[5px] p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`block h-[2px] w-5 bg-vf-text transition-all duration-200 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
        <span className={`block h-[2px] w-5 bg-vf-text transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block h-[2px] w-5 bg-vf-text transition-all duration-200 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-[64px] left-0 right-0 z-50 flex flex-col gap-4 border-b border-vf-border bg-vf-base/95 px-6 py-6 backdrop-blur md:hidden">
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm text-vf-text-muted transition-colors hover:text-vf-text">
            Dashboard
          </Link>
          <Link href="/vault/create" onClick={() => setMenuOpen(false)} className="text-sm text-vf-text-muted transition-colors hover:text-vf-text">
            Create Vault
          </Link>
          <Link href="/presentation-deck" onClick={() => setMenuOpen(false)} className="text-sm text-vf-text-muted transition-colors hover:text-vf-text">
            Pitch
          </Link>
          <div className="pt-2">
            <WalletButton />
          </div>
        </div>
      )}
    </nav>
  )
}
