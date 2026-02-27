"use client";

import { useState } from "react";
import { WalletButton } from "@/components/wallet/WalletButton";
import Link from "next/link";

/* ── SVG Icons ────────────────────────────────────────────────────── */
function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconVault() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function IconBot() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function IconDatabase() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
function IconExternalLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ── Feature card ─────────────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card-hover group flex flex-col gap-4 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-vf-cyan/10 text-vf-cyan">
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-vf-text-muted">{description}</p>
    </div>
  );
}

/* ── Step card ────────────────────────────────────────────────────── */
function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card-hover relative flex flex-col items-center gap-4 p-8 text-center">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-vf-cyan font-mono text-sm font-bold text-vf-base">
        {step}
      </div>
      <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-vf-cyan/10 text-vf-cyan">
        {icon}
      </div>
      <h4 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
        {title}
      </h4>
      <p className="text-sm leading-relaxed text-vf-text-muted">{description}</p>
    </div>
  );
}

/* ── FAQ item ─────────────────────────────────────────────────────── */
function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-vf-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text pr-4">
          {question}
        </span>
        <span
          className={`shrink-0 text-vf-text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <IconChevronDown />
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-60 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-vf-text-muted">{answer}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-vf-base">
      {/* ── Grid background ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,245,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ══ HERO ═════════════════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
        {/* Radial glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-vf-cyan/[0.04] blur-[140px]" />

        <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-vf-cyan/20 bg-vf-surface/80 px-4 py-1.5 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-vf-green animate-pulse" />
          <span className="font-mono text-xs text-vf-cyan">
            Live on opBNB Testnet
          </span>
        </div>

        <h1 className="relative mb-6 max-w-2xl font-[family-name:var(--font-syne)] text-3xl font-bold leading-[1.15] tracking-tight text-vf-text sm:text-4xl md:text-5xl">
          Borrow against your assets.{" "}
          <span className="bg-gradient-to-r from-vf-cyan to-[#7B61FF] bg-clip-text text-transparent">
            Prove everything. Reveal nothing.
          </span>
        </h1>

        <p className="relative mb-10 max-w-xl text-base leading-relaxed text-vf-text-muted sm:text-lg">
          Non-custodial collateral vaults with zero-knowledge privacy.
          Deposit, prove, and borrow — your balances stay hidden on-chain.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/vault/create"
            className="group inline-flex items-center gap-2 rounded-lg px-8 py-3.5 font-mono text-sm font-bold transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.25)]"
            style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
          >
            Launch App
            <IconArrowRight />
          </Link>
          <a
            href="https://github.com/blinderchief/VaultForge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-vf-border px-8 py-3.5 font-mono text-sm text-vf-text transition-colors hover:border-vf-cyan/40 hover:text-vf-cyan"
          >
            <IconGitHub />
            View Source
          </a>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ FEATURES ═════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Core Features
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Privacy-first DeFi infrastructure
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          VaultForge combines zero-knowledge cryptography, non-custodial vaults, and AI-driven risk optimization into a single protocol.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<IconLock />}
            title="Zero-Knowledge Privacy"
            description="Prove your collateral ratio without revealing balances. Groth16 proofs generated in-browser — your data never leaves your device."
          />
          <FeatureCard
            icon={<IconVault />}
            title="Non-Custodial Vaults"
            description="Each user deploys their own vault contract. No pooled funds, no custodians. Only you control your deposits and borrows."
          />
          <FeatureCard
            icon={<IconBot />}
            title="AI-Optimized LTV"
            description="Autonomous agents analyze market conditions and optimize your Loan-to-Value ratio in real-time, reducing liquidation risk."
          />
          <FeatureCard
            icon={<IconShield />}
            title="Partial Seizure Only"
            description="Smart contracts enforce partial liquidation — never full seizure. Your collateral has immutable on-chain protection."
          />
          <FeatureCard
            icon={<IconClock />}
            title="48h Admin Timelock"
            description="All admin operations require a 48-hour timelock, giving users time to review changes and exit before they take effect."
          />
          <FeatureCard
            icon={<IconZap />}
            title="Powered by opBNB"
            description="Sub-cent gas fees and sub-second finality. Built on BNB Chain's optimistic rollup for maximal throughput."
          />
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          How It Works
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Three steps to private borrowing
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-center text-sm leading-relaxed text-vf-text-muted">
          From wallet connection to on-chain borrowing in under a minute.
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          <StepCard
            step={1}
            title="Create & Deposit"
            description="Deploy your personal vault contract and deposit BNB or ERC-20 tokens. Funds stay in your vault — fully non-custodial."
            icon={<IconVault />}
          />
          <StepCard
            step={2}
            title="Generate ZK Proof"
            description="Your browser generates a Groth16 proof that your collateral exceeds the borrow threshold — without revealing your balance."
            icon={<IconLock />}
          />
          <StepCard
            step={3}
            title="Borrow Privately"
            description="Submit the proof on-chain. The verifier contract validates it and releases your loan. No one sees your collateral details."
            icon={<IconCheck />}
          />
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ ARCHITECTURE & TRUST ═════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Architecture
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Open by design. Secure by default.
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          Every component is open-source, auditable, and verified on-chain.
        </p>

        {/* Stats grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Smart Contracts", value: "5", sub: "Solidity 0.8.28 · Foundry", icon: <IconCode /> },
            { label: "ZK Circuits", value: "3", sub: "Circom 2.x · Groth16", icon: <IconLock /> },
            { label: "Forge Tests", value: "53", sub: "100% passing", icon: <IconCheck /> },
            { label: "Backend Tests", value: "34", sub: "pytest · FastAPI", icon: <IconDatabase /> },
          ].map((item) => (
            <div key={item.label} className="glass-card flex flex-col items-center gap-2 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vf-cyan/10 text-vf-cyan">
                {item.icon}
              </div>
              <span className="font-mono text-3xl font-bold text-vf-cyan">
                {item.value}
              </span>
              <span className="text-sm font-semibold text-vf-text">
                {item.label}
              </span>
              <span className="font-mono text-xs text-vf-text-muted">
                {item.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Trust cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Fully Open Source",
              desc: "Every contract, circuit, and line of backend/frontend code is public on GitHub.",
              icon: <IconCode />,
            },
            {
              title: "Row-Level Security",
              desc: "RLS enforced on every Supabase table. Service keys never reach the browser.",
              icon: <IconDatabase />,
            },
            {
              title: "On-Chain Verification",
              desc: "ZK proofs verified by an immutable Groth16 verifier contract. No off-chain trust.",
              icon: <IconShield />,
            },
          ].map((item) => (
            <div key={item.title} className="glass-card-hover flex gap-4 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vf-cyan/10 text-vf-cyan">
                {item.icon}
              </div>
              <div>
                <h4 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold text-vf-text">
                  {item.title}
                </h4>
                <p className="text-xs leading-relaxed text-vf-text-muted">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ TECH STACK ═══════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Tech Stack
        </p>
        <h2 className="mb-14 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Built with production-grade tooling
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { name: "Solidity", detail: "v0.8.28" },
            { name: "Foundry", detail: "Testing & Deploy" },
            { name: "Circom 2.x", detail: "ZK Circuits" },
            { name: "snarkjs", detail: "Groth16 Prover" },
            { name: "Next.js 16", detail: "App Router" },
            { name: "FastAPI", detail: "Python 3.12" },
            { name: "Supabase", detail: "Postgres + RLS" },
            { name: "wagmi + viem", detail: "On-chain Reads/Writes" },
            { name: "Privy", detail: "Auth & Wallets" },
          ].map((tech) => (
            <div key={tech.name} className="glass-card px-4 py-3.5 text-center">
              <span className="block text-sm font-semibold text-vf-text">
                {tech.name}
              </span>
              <span className="block font-mono text-xs text-vf-text-muted">
                {tech.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-2xl px-6 py-24">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          FAQ
        </p>
        <h2 className="mb-12 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Frequently asked questions
        </h2>

        <div>
          <FAQItem
            question="What is VaultForge?"
            answer="VaultForge is a non-custodial, ZK-private collateral vault protocol on opBNB. Users deposit assets into personal smart-contract vaults, generate zero-knowledge proofs to verify their collateral ratio, and borrow against those assets — all without revealing their actual balance on-chain."
          />
          <FAQItem
            question="How does zero-knowledge privacy work?"
            answer="When you want to borrow, your browser generates a Groth16 proof using Circom circuits. This proof mathematically demonstrates that your collateral exceeds the required threshold, without disclosing the actual amount. The on-chain verifier contract confirms the proof — no trusted third party required."
          />
          <FAQItem
            question="Is VaultForge custodial?"
            answer="No. Each user deploys their own vault smart contract via the VaultFactory. Your assets live in your personal vault — not in a shared pool. Only you can deposit, borrow, repay, and withdraw. The protocol never holds your funds."
          />
          <FAQItem
            question="What happens if my LTV gets too high?"
            answer="VaultForge's AI agents monitor LTV ratios in real-time and can trigger partial liquidations if collateral drops below safe thresholds. Critically, the smart contracts enforce partial seizure only — your entire collateral can never be fully liquidated in a single event."
          />
          <FAQItem
            question="Which networks does VaultForge support?"
            answer="VaultForge is currently deployed on opBNB Testnet (Chain ID 5611). opBNB offers sub-cent gas fees and fast finality, making ZK proof verification and vault operations extremely affordable."
          />
          <FAQItem
            question="Is the code open source?"
            answer="Yes. All smart contracts (Solidity), ZK circuits (Circom), backend (FastAPI), and frontend (Next.js) code is publicly available on GitHub. The contracts are verified on the opBNB block explorer."
          />
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />

      {/* ══ CTA ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center px-6 py-28 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-vf-cyan/[0.04] blur-[120px]" />

        <h2 className="relative mb-5 max-w-lg font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl md:text-5xl">
          Ready to forge your vault?
        </h2>
        <p className="relative mb-10 max-w-md text-base text-vf-text-muted">
          Connect your wallet and start borrowing privately on opBNB in under a minute.
        </p>
        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <WalletButton />
          <Link
            href="/vault/create"
            className="group inline-flex items-center gap-2 rounded-lg px-8 py-3.5 font-mono text-sm font-bold transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.25)]"
            style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
          >
            Get Started
            <IconArrowRight />
          </Link>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-vf-border bg-vf-surface/40 px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="font-mono text-lg font-bold text-vf-cyan">
              VaultForge
            </span>
            <p className="mt-2 text-xs leading-relaxed text-vf-text-muted">
              Non-custodial ZK-private collateral vault protocol on opBNB.
              Open source. Community-driven.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <h5 className="mb-3 font-mono text-xs font-semibold tracking-wider text-vf-text uppercase">
                Protocol
              </h5>
              <ul className="flex flex-col gap-2 text-xs text-vf-text-muted">
                <li>
                  <Link href="/vault/create" className="transition-colors hover:text-vf-text">
                    Create Vault
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition-colors hover:text-vf-text">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 font-mono text-xs font-semibold tracking-wider text-vf-text uppercase">
                Developers
              </h5>
              <ul className="flex flex-col gap-2 text-xs text-vf-text-muted">
                <li>
                  <a
                    href="https://github.com/blinderchief/VaultForge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-vf-text"
                  >
                    GitHub <IconExternalLink />
                  </a>
                </li>
                <li>
                  <a
                    href="https://opbnb-testnet.bscscan.com/address/0xD26ae761DEBE79Ca423A370C0085D75b26Ecaf28"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-vf-text"
                  >
                    Contracts <IconExternalLink />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mx-auto mt-10 flex max-w-5xl items-center justify-between border-t border-vf-border pt-6">
          <span className="font-mono text-xs text-vf-text-muted">
            Built for BNB Chain Hackathon 2025
          </span>
          <a
            href="https://github.com/blinderchief/VaultForge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vf-text-muted transition-colors hover:text-vf-text"
          >
            <IconGitHub />
          </a>
        </div>
      </footer>
    </div>
  );
}
