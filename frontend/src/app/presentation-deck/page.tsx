"use client";

import Link from "next/link";

/* ── Slide wrapper ──────────────────────────────────────────────── */
function Slide({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="relative z-10 mx-auto max-w-5xl px-6 py-12 sm:py-16"
    >
      {children}
    </section>
  );
}

function Divider() {
  return (
    <div className="relative z-10 mx-auto h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-vf-border to-transparent" />
  );
}

/* ── Stat card ──────────────────────────────────────────────────── */
function StatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-1 p-4 text-center">
      <span className="font-mono text-xl font-bold text-vf-cyan sm:text-2xl">
        {value}
      </span>
      <span className="text-sm font-semibold text-vf-text">{label}</span>
      {sub && (
        <span className="font-mono text-[11px] text-vf-text-muted">{sub}</span>
      )}
    </div>
  );
}

/* ── Compare row ────────────────────────────────────────────────── */
function CompareRow({
  feature,
  vaultforge,
  venus,
  aave,
}: {
  feature: string;
  vaultforge: string;
  venus: string;
  aave: string;
}) {
  return (
    <tr className="border-b border-vf-border text-sm">
      <td className="py-3 pr-4 font-semibold text-vf-text">{feature}</td>
      <td className="py-3 px-4 text-center font-mono text-vf-cyan">
        {vaultforge}
      </td>
      <td className="py-3 px-4 text-center font-mono text-vf-text-muted">
        {venus}
      </td>
      <td className="py-3 pl-4 text-center font-mono text-vf-text-muted">
        {aave}
      </td>
    </tr>
  );
}

/* ── Contract row ───────────────────────────────────────────────── */
function ContractRow({
  name,
  address,
}: {
  name: string;
  address: string;
}) {
  return (
    <tr className="border-b border-vf-border text-sm">
      <td className="py-2.5 pr-4 font-semibold text-vf-text">{name}</td>
      <td className="py-2.5 pl-4">
        <a
          href={`https://opbnb-testnet.bscscan.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-vf-cyan hover:underline break-all"
        >
          {address}
        </a>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function PresentationDeck() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-vf-base scroll-smooth">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,245,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ═══ SLIDE 1 — TITLE ═══════════════════════════════════════ */}
      <section className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-vf-cyan/[0.05] blur-[120px]" />

        <div className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-vf-cyan/20 bg-vf-surface/80 px-4 py-1.5 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-vf-green animate-pulse" />
          <span className="font-mono text-xs text-vf-cyan">
            BNB Chain × YZi Labs Hack Bengaluru 2026 — Smart Collateral Track
          </span>
        </div>

        <h1 className="relative mb-3 max-w-3xl font-[family-name:var(--font-syne)] text-3xl font-bold leading-[1.1] tracking-tight text-vf-text sm:text-4xl md:text-5xl">
          Vault
          <span className="bg-gradient-to-r from-vf-cyan to-[#7B61FF] bg-clip-text text-transparent">
            Forge
          </span>
        </h1>

        <p className="relative mb-3 max-w-2xl text-lg leading-relaxed text-vf-text sm:text-xl">
          Non-custodial ZK-private intelligent collateral vaults on opBNB
        </p>

        <p className="relative mb-6 max-w-xl text-sm leading-relaxed text-vf-text-muted">
          Deposit assets into personal vaults. Prove collateral with zero-knowledge proofs.
          Borrow privately while AI agents optimize your risk — all on BNB Chain&apos;s fastest L2.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://vaultforge-nu.vercel.app"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 font-mono text-sm font-bold transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.25)]"
            style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
          >
            Live Demo
          </Link>
          <a
            href="https://github.com/blinderchief/VaultForge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-vf-border px-8 py-3.5 font-mono text-sm text-vf-text transition-colors hover:border-vf-cyan/40 hover:text-vf-cyan"
          >
            GitHub
          </a>
        </div>
      </section>

      <Divider />

      {/* ═══ SLIDE 2 — THE PROBLEM ════════════════════════════════ */}
      <Slide id="problem">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          The Problem
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          DeFi lending is broken
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          Trillions in crypto assets sit idle because existing lending protocols are overcollateralized, fully public, and lack intelligent risk management.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="glass-card p-6">
            <span className="mb-2 block font-mono text-3xl font-bold text-vf-amber">
              150%+
            </span>
            <span className="mb-1 block text-sm font-semibold text-vf-text">
              Over-Collateralization
            </span>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              Aave and Venus require 150%+ collateral for every loan, locking up
              $1.50 for every $1 borrowed. Capital sits idle when it should be
              productive.
            </p>
          </div>
          <div className="glass-card p-6">
            <span className="mb-2 block font-mono text-3xl font-bold text-vf-red">
              0%
            </span>
            <span className="mb-1 block text-sm font-semibold text-vf-text">
              On-Chain Privacy
            </span>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              Every balance, deposit, and borrow is fully public. Competitors,
              bots, and bad actors can track your positions and front-run your
              strategies.
            </p>
          </div>
          <div className="glass-card p-6">
            <span className="mb-2 block font-mono text-3xl font-bold text-vf-red">
              100%
            </span>
            <span className="mb-1 block text-sm font-semibold text-vf-text">
              Full Liquidation Risk
            </span>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              In volatile markets, existing protocols can liquidate your
              entire position in one transaction. No partial protection,
              no AI-driven safety nets.
            </p>
          </div>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 3 — OUR SOLUTION ═══════════════════════════════ */}
      <Slide id="solution">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Our Solution
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Privacy + Intelligence + Safety
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          VaultForge combines zero-knowledge proofs, AI agents, and partial-only liquidation to create the next generation of collateral infrastructure on BNB Chain.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "ZK-Private Borrowing",
              desc: "Groth16 proofs verify your collateral exceeds the borrow threshold — without revealing your balance. Your data never leaves your device.",
              accent: "text-vf-cyan",
              tag: "Privacy",
            },
            {
              title: "Per-User Vaults",
              desc: "Each user deploys their own vault contract via VaultFactory (EIP-1167 clones). No pooled funds, no custodians. Only you control your assets.",
              accent: "text-vf-green",
              tag: "Non-Custodial",
            },
            {
              title: "AI-Optimized LTV",
              desc: "Autonomous agents analyze market conditions and optimize Loan-to-Value ratios from 150% down to 110–130%, freeing locked capital.",
              accent: "text-vf-cyan",
              tag: "Intelligence",
            },
            {
              title: "Partial Seizure Only",
              desc: "Smart contracts enforce partial liquidation — your entire collateral can never be seized in a single event. Immutable on-chain protection.",
              accent: "text-vf-green",
              tag: "Safety",
            },
            {
              title: "48h Admin Timelock",
              desc: "All admin operations require a 48-hour delay, giving users time to review changes and exit before they take effect.",
              accent: "text-vf-cyan",
              tag: "Governance",
            },
            {
              title: "opBNB L2 Speed",
              desc: "Sub-cent gas fees and sub-second finality on BNB Chain's optimistic rollup. ZK verification costs pennies, not dollars.",
              accent: "text-vf-green",
              tag: "Performance",
            },
          ].map((item) => (
            <div key={item.title} className="glass-card-hover p-6">
              <span
                className={`mb-3 inline-block rounded-full border border-current/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${item.accent}`}
              >
                {item.tag}
              </span>
              <h3 className="mb-2 font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-vf-text-muted">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 4 — MARKET OPPORTUNITY ═════════════════════════ */}
      <Slide id="market">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Market Opportunity
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Real numbers. Real demand.
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          DeFi lending is a $51B+ market growing rapidly — and BNB Chain is one of its biggest ecosystems. All data sourced from DeFiLlama and CoinGecko (June 2025).
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value="$51.6B"
            label="Global DeFi Lending TVL"
            sub="Source: DeFiLlama"
          />
          <StatCard
            value="$5.56B"
            label="BNB Chain TVL"
            sub="3rd largest L1"
          />
          <StatCard
            value="$1.27B"
            label="Venus Protocol TVL"
            sub="BSC's #1 lending protocol"
          />
          <StatCard
            value="$519M"
            label="Venus Total Borrowed"
            sub="Active loan demand on BSC"
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value="$611"
            label="BNB Price"
            sub="#4 crypto by market cap"
          />
          <StatCard
            value="$83.3B"
            label="BNB Market Cap"
            sub="136.36M circulating"
          />
          <StatCard
            value="2.59M"
            label="Daily Active Addresses"
            sub="BNB Chain ecosystem"
          />
          <StatCard
            value="$691M"
            label="Daily DEX Volume"
            sub="BNB Chain trading activity"
          />
        </div>

        <div className="mt-6 glass-card p-6">
          <h3 className="mb-3 font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
            Why this matters for VaultForge
          </h3>
          <ul className="space-y-2 text-sm text-vf-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vf-cyan" />
              <span>
                <strong className="text-vf-text">$519M borrowed on Venus alone</strong>{" "}
                — massive demand for lending on BSC, but with zero privacy and static LTV
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vf-cyan" />
              <span>
                <strong className="text-vf-text">2.59M daily active users</strong>{" "}
                — BNB Chain has one of the largest active user bases in crypto
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vf-cyan" />
              <span>
                <strong className="text-vf-text">No privacy-first lending protocol exists on BSC</strong>{" "}
                — VaultForge fills a clear gap with ZK proofs + AI-driven risk
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vf-cyan" />
              <span>
                <strong className="text-vf-text">Capturing even 0.1% of BSC lending TVL = $1.27M</strong>{" "}
                — with fee revenue from agent actions and premium features
              </span>
            </li>
          </ul>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 5 — HOW IT WORKS ══════════════════════════════ */}
      <Slide id="how">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          How It Works
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          From deposit to private borrow in 3 steps
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-sm leading-relaxed text-vf-text-muted">
          The full flow — from wallet connection to on-chain borrowing — in under a minute.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              step: 1,
              title: "Create & Deposit",
              desc: "Connect via Privy. VaultFactory deploys your personal vault (EIP-1167 clone). Deposit BNB or ERC-20 tokens — funds stay in YOUR contract.",
            },
            {
              step: 2,
              title: "Generate ZK Proof",
              desc: "Browser generates a Groth16 proof (Circom circuit) proving collateral ≥ threshold — without revealing your balance. Data never leaves your device.",
            },
            {
              step: 3,
              title: "Borrow Privately",
              desc: "Submit the proof on-chain. ZKVerifier validates it, AI agents optimize your LTV, and the vault releases your loan. No one sees your position.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="glass-card-hover relative flex flex-col items-center gap-4 p-8 text-center"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-vf-cyan font-mono text-sm font-bold text-vf-base">
                {item.step}
              </div>
              <h4 className="mt-2 font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
                {item.title}
              </h4>
              <p className="text-sm leading-relaxed text-vf-text-muted">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture diagram */}
        <div className="mt-8 glass-card overflow-hidden p-5 sm:p-6">
          <h3 className="mb-4 text-center font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
            Architecture Overview
          </h3>
          <div className="flex flex-col items-center gap-3 font-mono text-xs sm:text-sm">
            {/* Row 1 - Frontend */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-md border border-vf-cyan/30 bg-vf-cyan/10 px-3 py-1.5 text-vf-cyan">
                Next.js 16 + Privy + wagmi
              </span>
            </div>
            <span className="text-vf-text-muted">↓ wallet connect · ZK proof generation</span>

            {/* Row 2 - Backend */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-md border border-vf-green/30 bg-vf-green/10 px-3 py-1.5 text-vf-green">
                FastAPI + Agent Runner
              </span>
              <span className="rounded-md border border-vf-green/30 bg-vf-green/10 px-3 py-1.5 text-vf-green">
                Supabase (RLS)
              </span>
            </div>
            <span className="text-vf-text-muted">↓ LTV optimization · agent execution</span>

            {/* Row 3 - Contracts */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-md border border-vf-amber/30 bg-vf-amber/10 px-3 py-1.5 text-vf-amber">
                VaultFactory
              </span>
              <span className="rounded-md border border-vf-amber/30 bg-vf-amber/10 px-3 py-1.5 text-vf-amber">
                Vault
              </span>
              <span className="rounded-md border border-vf-amber/30 bg-vf-amber/10 px-3 py-1.5 text-vf-amber">
                ZKVerifier
              </span>
              <span className="rounded-md border border-vf-amber/30 bg-vf-amber/10 px-3 py-1.5 text-vf-amber">
                AgentRegistry
              </span>
              <span className="rounded-md border border-vf-amber/30 bg-vf-amber/10 px-3 py-1.5 text-vf-amber">
                LTVOracle
              </span>
            </div>
            <span className="text-vf-text-muted">↓ opBNB Testnet (Chain ID 5611)</span>

            {/* Row 4 - ZK */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-md border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1.5 text-[#7B61FF]">
                CollateralThreshold
              </span>
              <span className="rounded-md border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1.5 text-[#7B61FF]">
                LTVComputation
              </span>
              <span className="rounded-md border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-3 py-1.5 text-[#7B61FF]">
                ReputationScore
              </span>
            </div>
            <span className="text-vf-text-muted">Circom 2.x · Groth16 · snarkjs</span>
          </div>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 6 — COMPETITIVE EDGE ══════════════════════════ */}
      <Slide id="compare">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Competitive Edge
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          VaultForge vs. the status quo
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          Existing lending protocols are public, static, and overcollateralized. VaultForge introduces privacy, intelligence, and safety that no competitor offers.
        </p>

        <div className="glass-card overflow-x-auto p-1">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-vf-border text-sm">
                <th className="py-3 pr-4 text-left font-semibold text-vf-text-muted">
                  Feature
                </th>
                <th className="py-3 px-4 text-center font-semibold text-vf-cyan">
                  VaultForge
                </th>
                <th className="py-3 px-4 text-center font-semibold text-vf-text-muted">
                  Venus ($1.27B)
                </th>
                <th className="py-3 pl-4 text-center font-semibold text-vf-text-muted">
                  Aave ($25.9B)
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                feature="Privacy"
                vaultforge="ZK Proofs"
                venus="None"
                aave="None"
              />
              <CompareRow
                feature="Custody Model"
                vaultforge="Per-User Vault"
                venus="Shared Pool"
                aave="Shared Pool"
              />
              <CompareRow
                feature="LTV Optimization"
                vaultforge="AI Agents"
                venus="Static"
                aave="Static"
              />
              <CompareRow
                feature="Target LTV"
                vaultforge="110–130%"
                venus="150%+"
                aave="150%+"
              />
              <CompareRow
                feature="Liquidation Model"
                vaultforge="Partial Only"
                venus="Full Seizure"
                aave="Full Seizure"
              />
              <CompareRow
                feature="Admin Timelock"
                vaultforge="48 Hours"
                venus="Varies"
                aave="Varies"
              />
              <CompareRow
                feature="Chain"
                vaultforge="opBNB (L2)"
                venus="BSC (L1)"
                aave="Multi-chain"
              />
              <CompareRow
                feature="Gas Cost (Borrow)"
                vaultforge="< $0.01"
                venus="~$0.30"
                aave="~$2–5"
              />
            </tbody>
          </table>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 7 — VALUE CREATION & BUSINESS MODEL ═══════════ */}
      <Slide id="business">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Value Creation
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          How we capture value
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          Three revenue streams aligned with user and protocol success — no extractive fees, only value-add services.
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="glass-card-hover p-6">
            <span className="mb-3 block font-mono text-2xl font-bold text-vf-cyan">
              0.5%
            </span>
            <h3 className="mb-2 font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text">
              Agent Performance Fees
            </h3>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              AI agents charge a small fee on optimizations they perform.
              Agents stake BNB to participate — slashed for bad performance.
              Aligns incentives: agents only earn when they save you money.
            </p>
          </div>
          <div className="glass-card-hover p-6">
            <span className="mb-3 block font-mono text-2xl font-bold text-vf-cyan">
              0.1%
            </span>
            <h3 className="mb-2 font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text">
              BNPL Transaction Fees
            </h3>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              Intent-based Buy Now Pay Later transactions charge a minimal fee
              per settlement. Users spend against their vault collateral
              without selling — like a crypto credit card.
            </p>
          </div>
          <div className="glass-card-hover p-6">
            <span className="mb-3 block font-mono text-2xl font-bold text-vf-cyan">
              $29/mo
            </span>
            <h3 className="mb-2 font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text">
              Premium Tier
            </h3>
            <p className="text-xs leading-relaxed text-vf-text-muted">
              Advanced analytics, priority agent execution, custom LTV
              strategies, and API access. Targeted at power users and
              institutions managing large portfolios.
            </p>
          </div>
        </div>

        <div className="mt-6 glass-card p-6">
          <h3 className="mb-4 font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
            $FORGE Token (100M Fixed Supply)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { pct: "40%", use: "Community & Ecosystem" },
              { pct: "20%", use: "Team & Advisors (2yr vest)" },
              { pct: "20%", use: "Treasury & Development" },
              { pct: "20%", use: "Agent Staking Rewards" },
            ].map((t) => (
              <div key={t.use} className="text-center">
                <span className="block font-mono text-xl font-bold text-vf-cyan">
                  {t.pct}
                </span>
                <span className="text-xs text-vf-text-muted">{t.use}</span>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 8 — WHAT WE BUILT ════════════════════════════ */}
      <Slide id="built">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          What We Built
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Production-grade, fully working
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-vf-text-muted">
          Not a mockup or whitepaper — every component is built, tested, deployed, and verified on-chain.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value="5" label="Smart Contracts" sub="Solidity 0.8.28 · Foundry" />
          <StatCard value="3" label="ZK Circuits" sub="Circom 2.x · Groth16" />
          <StatCard value="53" label="Forge Tests" sub="100% passing" />
          <StatCard value="41" label="Backend Tests" sub="pytest · FastAPI" />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value="12" label="DB Migrations" sub="Supabase Postgres + RLS" />
          <StatCard value="7+" label="On-Chain Txs" sub="opBNB Testnet verified" />
          <StatCard value="3" label="Vault Clones" sub="Deployed via VaultFactory" />
          <StatCard value="0" label="Build Errors" sub="Clean TS + Solidity" />
        </div>

        {/* Tech stack */}
        <div className="mt-6">
          <h3 className="mb-4 text-center font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
            Tech Stack
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { name: "Solidity", detail: "v0.8.28" },
              { name: "Foundry", detail: "Testing & Deploy" },
              { name: "Circom 2.x", detail: "ZK Circuits" },
              { name: "snarkjs", detail: "Groth16 Prover" },
              { name: "Next.js 16", detail: "App Router" },
              { name: "FastAPI", detail: "Python 3.12" },
              { name: "Supabase", detail: "Postgres + RLS" },
              { name: "wagmi + viem", detail: "On-chain I/O" },
              { name: "Privy", detail: "Wallet Auth" },
              { name: "Docker", detail: "Full Stack" },
            ].map((tech) => (
              <div key={tech.name} className="glass-card px-3 py-2.5 text-center">
                <span className="block text-sm font-semibold text-vf-text">
                  {tech.name}
                </span>
                <span className="block font-mono text-[10px] text-vf-text-muted">
                  {tech.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 9 — DEPLOYED CONTRACTS ════════════════════════ */}
      <Slide id="contracts">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          On-Chain Proof
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Deployed & verified on opBNB Testnet
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-sm leading-relaxed text-vf-text-muted">
          All contracts are live and verifiable. Click any address to view on opBNBScan.
        </p>

        <div className="glass-card overflow-x-auto p-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vf-border text-sm">
                <th className="py-3 pr-4 text-left font-semibold text-vf-text-muted">
                  Contract
                </th>
                <th className="py-3 pl-4 text-left font-semibold text-vf-text-muted">
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              <ContractRow
                name="VaultFactory"
                address="0xb881fAf4e552780f65Ae8FC1053AD46134b71173"
              />
              <ContractRow
                name="Vault (Impl)"
                address="0x45095a5b07Cd7231c4f1B12837b427a9a94AF1C0"
              />
              <ContractRow
                name="ZKVerifier"
                address="0x2925896cABAd4c6B7c505495948F79b3e9308C54"
              />
              <ContractRow
                name="AgentRegistry"
                address="0xFB9D6eFE47a4b6175025C9Cd97b776B7e8d9916b"
              />
              <ContractRow
                name="LTVOracle"
                address="0x953386f1309b2BdA061d895aBddB17b9Db706744"
              />
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center font-mono text-xs text-vf-text-muted">
          Deployer:{" "}
          <a
            href="https://opbnb-testnet.bscscan.com/address/0x97950A98980a2Fc61ea7eb043bb7666845f77071"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vf-cyan hover:underline"
          >
            0x97950A98980a2Fc61ea7eb043bb7666845f77071
          </a>
        </p>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 10 — ROADMAP ══════════════════════════════════ */}
      <Slide id="roadmap">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Roadmap
        </p>
        <h2 className="mb-4 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          What&apos;s next
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-sm leading-relaxed text-vf-text-muted">
          VaultForge is a working MVP today. Here&apos;s the path to mainnet and beyond.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              phase: "Q3 2025",
              title: "Testnet MVP",
              items: [
                "5 contracts on opBNB",
                "3 ZK circuits compiled",
                "Full-stack working app",
                "53 + 41 tests passing",
              ],
              active: true,
            },
            {
              phase: "Q4 2025",
              title: "Audit & Beta",
              items: [
                "Smart contract audit",
                "Mainnet deployment (opBNB)",
                "Agent marketplace beta",
                "Multi-asset support",
              ],
              active: false,
            },
            {
              phase: "Q1 2026",
              title: "Mainnet Launch",
              items: [
                "$FORGE token launch",
                "BNPL integration",
                "Mobile-optimized UX",
                "Institutional onboarding",
              ],
              active: false,
            },
            {
              phase: "Q2 2026",
              title: "Scale",
              items: [
                "Cross-chain vaults",
                "Privacy relayer",
                "Prediction market collateral",
                "Governance DAO",
              ],
              active: false,
            },
          ].map((phase) => (
            <div
              key={phase.phase}
              className={`glass-card p-6 ${
                phase.active ? "border-vf-cyan/30" : ""
              }`}
            >
              <span
                className={`mb-1 block font-mono text-xs ${
                  phase.active ? "text-vf-cyan" : "text-vf-text-muted"
                }`}
              >
                {phase.phase}
              </span>
              <h3 className="mb-3 font-[family-name:var(--font-syne)] text-base font-semibold text-vf-text">
                {phase.title}
              </h3>
              <ul className="space-y-1.5">
                {phase.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-vf-text-muted"
                  >
                    <span
                      className={`mt-1 h-1 w-1 shrink-0 rounded-full ${
                        phase.active ? "bg-vf-cyan" : "bg-vf-text-muted"
                      }`}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              {phase.active && (
                <span className="mt-3 inline-block rounded-full bg-vf-cyan/10 px-2.5 py-0.5 font-mono text-[10px] text-vf-cyan">
                  Current
                </span>
              )}
            </div>
          ))}
        </div>
      </Slide>

      <Divider />

      {/* ═══ SLIDE 11 — TEAM & LINKS ═════════════════════════════ */}
      <Slide id="team">
        <p className="mb-3 text-center font-mono text-xs tracking-[0.2em] text-vf-cyan uppercase">
          Team
        </p>
        <h2 className="mb-8 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Built by
        </h2>

        <div className="mx-auto max-w-sm">
          <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vf-cyan/10 font-[family-name:var(--font-syne)] text-2xl font-bold text-vf-cyan">
              SK
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-vf-text">
                Suyash Kumar Singh
              </h3>
              <p className="text-sm text-vf-text-muted">
                Full-Stack · Smart Contracts · AI
              </p>
            </div>
            <a
              href="https://github.com/blinderchief"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-vf-cyan hover:underline"
            >
              @blinderchief
            </a>
          </div>
        </div>
      </Slide>

      <Divider />

      {/* ═══ FINAL CTA ═══════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center px-6 py-16 text-center">
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-vf-cyan/[0.04] blur-[120px]" />

        <h2 className="relative mb-5 max-w-lg font-[family-name:var(--font-syne)] text-3xl font-bold text-vf-text sm:text-4xl">
          Try it. It&apos;s live.
        </h2>
        <p className="relative mb-8 max-w-md text-sm text-vf-text-muted">
          VaultForge is deployed on opBNB Testnet with a working frontend, backend, and 5 verified smart contracts.
        </p>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link
            href="https://vaultforge-nu.vercel.app"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 font-mono text-sm font-bold transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.25)]"
            style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
          >
            Launch App
          </Link>
          <a
            href="https://github.com/blinderchief/VaultForge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-vf-border px-8 py-3.5 font-mono text-sm text-vf-text transition-colors hover:border-vf-cyan/40 hover:text-vf-cyan"
          >
            GitHub
          </a>
        </div>

        <p className="relative mt-8 font-mono text-xs text-vf-text-muted">
          Built for BNB Chain × YZi Labs Hack Bengaluru 2026 — Smart Collateral Track
        </p>
      </section>
    </div>
  );
}
