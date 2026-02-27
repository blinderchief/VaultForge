"use client";

import { usePrivy } from "@privy-io/react-auth";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectButton({ className }: { className?: string }) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className={`rounded border border-vf-cyan/30 px-5 py-2 font-mono text-sm text-vf-text-muted ${className ?? ""}`}
      >
        Loading…
      </button>
    );
  }

  if (authenticated && user?.wallet?.address) {
    return (
      <button
        onClick={logout}
        className={`rounded border border-vf-cyan px-5 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10 ${className ?? ""}`}
      >
        {truncateAddress(user.wallet.address)}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className={`rounded border border-vf-cyan px-5 py-2 font-mono text-sm font-bold text-vf-cyan transition-colors hover:bg-vf-cyan/10 ${className ?? ""}`}
    >
      Connect Wallet
    </button>
  );
}
