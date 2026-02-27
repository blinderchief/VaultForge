"use client";

import { useState } from "react";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { n: 1, label: "Connect" },
  { n: 2, label: "Configure" },
  { n: 3, label: "Deposit" },
  { n: 4, label: "Confirm" },
] as const;

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {STEPS.map(({ n, label }) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors"
            style={{
              background: n <= current ? "var(--vf-cyan)" : "var(--vf-surface-2)",
              color: n <= current ? "var(--vf-base)" : "var(--vf-text-muted)",
            }}
          >
            {n}
          </div>
          <span
            className="hidden font-mono text-xs sm:inline"
            style={{
              color: n <= current ? "var(--vf-text)" : "var(--vf-text-muted)",
            }}
          >
            {label}
          </span>
          {n < 4 && (
            <div
              className="h-px w-8"
              style={{
                background: n < current ? "var(--vf-cyan)" : "var(--vf-surface-2)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StepConnect({ onNext }: { onNext: () => void }) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Connect Wallet
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Connect your wallet to create a non-custodial vault on opBNB.
      </p>
      <button
        onClick={onNext}
        className="rounded border border-vf-cyan px-6 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10"
      >
        Connect Wallet
      </button>
    </div>
  );
}

function StepConfigure({
  chainId,
  setChainId,
  onNext,
  onBack,
}: {
  chainId: number;
  setChainId: (id: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Configure Vault
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Choose your target chain for the vault.
      </p>

      <label className="mb-1 block text-xs text-vf-text-muted">Network</label>
      <div className="mb-6 flex gap-3">
        {[
          { id: 5611, label: "opBNB Testnet" },
          { id: 56, label: "BSC Mainnet" },
        ].map((chain) => (
          <button
            key={chain.id}
            onClick={() => setChainId(chain.id)}
            className="rounded border px-4 py-2 font-mono text-xs transition-colors"
            style={{
              borderColor: chainId === chain.id ? "var(--vf-cyan)" : "var(--vf-border)",
              color: chainId === chain.id ? "var(--vf-cyan)" : "var(--vf-text-muted)",
              background: chainId === chain.id ? "rgba(0,245,255,0.05)" : "transparent",
            }}
          >
            {chain.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded border border-vf-border px-4 py-2 font-mono text-xs text-vf-text-muted transition-colors hover:border-vf-text-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StepDeposit({
  tokenAddress,
  setTokenAddress,
  amount,
  setAmount,
  onNext,
  onBack,
}: {
  tokenAddress: string;
  setTokenAddress: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Deposit Collateral
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Choose the token and amount to deposit as collateral.
      </p>

      <label className="mb-1 block text-xs text-vf-text-muted">Token Address</label>
      <input
        type="text"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="0x..."
        className="mb-4 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
      />

      <label className="mb-1 block text-xs text-vf-text-muted">Amount</label>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="mb-6 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
      />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded border border-vf-border px-4 py-2 font-mono text-xs text-vf-text-muted transition-colors hover:border-vf-text-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!tokenAddress || !amount}
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StepConfirm({
  chainId,
  tokenAddress,
  amount,
  onBack,
}: {
  chainId: number;
  tokenAddress: string;
  amount: string;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleCreate = () => {
    setSubmitting(true);
    // In production: call VaultFactory.createVault() on-chain, then POST /vault/create
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 2000);
  };

  if (done) {
    return (
      <div className="glass-card flex flex-col items-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vf-green/20">
          <svg className="h-8 w-8 text-vf-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold text-vf-green">
          Vault Created
        </h2>
        <a
          href="/dashboard"
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-xs text-vf-cyan transition-colors hover:bg-vf-cyan/10"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Review &amp; Confirm
      </h2>

      <div className="mb-6 space-y-2 rounded border border-vf-border bg-vf-base p-4">
        <div className="flex justify-between text-xs">
          <span className="text-vf-text-muted">Network</span>
          <span className="font-mono text-vf-text">
            {chainId === 5611 ? "opBNB Testnet" : "BSC Mainnet"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-vf-text-muted">Token</span>
          <span className="font-mono text-vf-text">
            {tokenAddress.slice(0, 6)}…{tokenAddress.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-vf-text-muted">Amount</span>
          <span className="font-mono text-vf-text">{amount}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="rounded border border-vf-border px-4 py-2 font-mono text-xs text-vf-text-muted transition-colors hover:border-vf-text-muted disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="flex-1 rounded px-6 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-50"
          style={{
            background: "var(--vf-cyan)",
            color: "var(--vf-base)",
          }}
        >
          {submitting ? "Creating…" : "Create Vault"}
        </button>
      </div>
    </div>
  );
}

export default function VaultCreatePage() {
  const [step, setStep] = useState<Step>(1);
  const [chainId, setChainId] = useState(5611);
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-vf-base p-6">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 font-[family-name:var(--font-syne)] text-2xl font-bold text-vf-text">
          Create Vault
        </h1>
        <p className="mb-6 font-mono text-xs text-vf-text-muted">
          Deploy a non-custodial ZK-private collateral vault
        </p>

        <StepIndicator current={step} />

        {step === 1 && <StepConnect onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepConfigure
            chainId={chainId}
            setChainId={setChainId}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepDeposit
            tokenAddress={tokenAddress}
            setTokenAddress={setTokenAddress}
            amount={amount}
            setAmount={setAmount}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepConfirm
            chainId={chainId}
            tokenAddress={tokenAddress}
            amount={amount}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}
