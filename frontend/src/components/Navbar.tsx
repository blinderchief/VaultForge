"use client";

import ConnectButton from "@/components/ConnectButton";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-vf-border bg-vf-base/80 px-6 py-3 backdrop-blur-md">
      <Link
        href="/"
        className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text"
      >
        VaultForge<span className="text-vf-cyan">.</span>
      </Link>
      <ConnectButton />
    </nav>
  );
}
