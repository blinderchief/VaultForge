"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { VAULT_FACTORY_ABI, VAULT_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { getVaultAddressFromTxHash } from "@/lib/viem";
import { ZKProofStatus } from "@/components/vault/ZKProofStatus";
import { generateCollateralProof } from "@/lib/zk";
import { api } from "@/lib/api";

/* ── Minimal ERC-20 ABI for approve() ────────────────────────────── */
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/* ── Types ────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

type TxStatus =
  | "idle"
  | "deploying"
  | "deploy_confirming"
  | "deploy_done"
  | "approving"
  | "approve_confirming"
  | "depositing"
  | "deposit_confirming"
  | "saving"
  | "done"
  | "error";

const STEPS = [
  { n: 1, label: "Connect" },
  { n: 2, label: "Configure" },
  { n: 3, label: "Deposit" },
  { n: 4, label: "Confirm" },
] as const;

const EXPLORER = "https://opbnb-testnet.bscscan.com";

/* ── Step Indicator ───────────────────────────────────────────────── */
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

/* ── Step 1: Connect ──────────────────────────────────────────────── */
function StepConnect({ onNext }: { onNext: () => void }) {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();

  const connected = ready && authenticated && !!address;

  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Connect Wallet
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Connect your wallet to create a non-custodial vault on opBNB.
      </p>

      {connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded border border-green-500/30 bg-green-950/20 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="font-mono text-sm text-green-400">
              {address!.slice(0, 6)}…{address!.slice(-4)}
            </span>
          </div>
          <button
            onClick={onNext}
            className="rounded border border-vf-cyan px-6 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10"
          >
            Continue
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          disabled={!ready}
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10 disabled:opacity-50"
        >
          {ready ? "Connect Wallet" : "Loading…"}
        </button>
      )}
    </div>
  );
}

/* ── Step 2: Configure ────────────────────────────────────────────── */
function StepConfigure({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Configure Vault
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Your vault will be deployed on opBNB Testnet (Chain 5611).
      </p>

      <div className="mb-6 flex gap-3">
        <div
          className="rounded border px-4 py-2 font-mono text-xs"
          style={{
            borderColor: "var(--vf-cyan)",
            color: "var(--vf-cyan)",
            background: "rgba(0,245,255,0.05)",
          }}
        >
          opBNB Testnet
        </div>
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

/* ── Step 3: Deposit info ─────────────────────────────────────────── */
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
  const depositAmountUSD = parseFloat(amount) || 0;

  const { data: optimization, isLoading: isOptimizing } = useQuery({
    queryKey: ["optimize-ltv", depositAmountUSD],
    queryFn: () =>
      api.optimizeLTV("preview", [
        { symbol: "BNB", value_usd: depositAmountUSD, volatility: 0.45 },
      ]),
    enabled: depositAmountUSD > 10,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className="glass-card p-6">
      <h2 className="mb-2 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Deposit Collateral
      </h2>
      <p className="mb-6 text-sm text-vf-text-muted">
        Choose the ERC-20 token and amount to deposit as collateral.
      </p>

      <label className="mb-1 block text-xs text-vf-text-muted">
        Token Address (ERC-20)
      </label>
      <input
        type="text"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="0x..."
        className="mb-4 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
      />

      <label className="mb-1 block text-xs text-vf-text-muted">
        Amount (token units, 18 decimals)
      </label>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="mb-4 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-cyan"
      />

      {/* LTV Optimization result */}
      {optimization && (
        <div className="mb-4 rounded border border-cyan-500/20 bg-cyan-950/10 p-4">
          <p className="mb-2 text-xs font-bold text-cyan-400">
            AI LTV Optimization
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-vf-text-muted">VaultForge Dynamic LTV</span>
              <span className="font-mono font-bold text-cyan-400">
                {(optimization.suggested_ltv_bps / 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-vf-text-muted">Venus / Aave Static LTV</span>
              <span className="font-mono text-gray-400">150%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vf-text-muted">Expected CVaR</span>
              <span className="font-mono text-vf-text">
                {(optimization.expected_cvar * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-vf-text-muted">Converged</span>
              <span className={`font-mono ${optimization.converged ? "text-green-400" : "text-yellow-400"}`}>
                {optimization.converged ? "Yes" : "No"}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-vf-text-muted">
            Computed in {optimization.elapsed_ms.toFixed(0)}ms via CVaR
            portfolio optimization
          </p>
        </div>
      )}
      {isOptimizing && depositAmountUSD > 10 && (
        <div className="mb-4 flex items-center gap-2 rounded border border-cyan-500/20 bg-cyan-950/10 p-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-xs text-cyan-400">
            Running portfolio optimization…
          </span>
        </div>
      )}

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

/* ── Step 4: Confirm — real on-chain transactions ─────────────────── */
function StepConfirm({
  tokenAddress,
  amount,
  onBack,
}: {
  tokenAddress: string;
  amount: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { address } = useAccount();

  /* ── TX 1: Deploy vault via VaultFactory ──────────────────────── */
  const {
    writeContract: writeDeploy,
    data: deployHash,
    isPending: deployPending,
    error: deployError,
  } = useWriteContract();

  const {
    isLoading: deployConfirming,
    isSuccess: deploySuccess,
  } = useWaitForTransactionReceipt({ hash: deployHash });

  /* ── TX 2: ERC-20 approve ─────────────────────────────────────── */
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
  } = useWriteContract();

  const {
    isLoading: approveConfirming,
    isSuccess: approveSuccess,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  /* ── TX 3: Deposit into vault ─────────────────────────────────── */
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: depositPending,
    error: depositError,
  } = useWriteContract();

  const {
    isLoading: depositConfirming,
    isSuccess: depositSuccess,
  } = useWaitForTransactionReceipt({ hash: depositHash });

  /* ── Local state ──────────────────────────────────────────────── */
  const [status, setStatus] = useState<TxStatus>("idle");
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [zkStatus, setZkStatus] = useState<"idle" | "generating" | "verified" | "error">("idle");
  const [zkProofHash, setZkProofHash] = useState<string>();
  const [zkElapsed, setZkElapsed] = useState<number>();

  const token = tokenAddress as `0x${string}`;
  const amountWei = (() => {
    try { return parseUnits(amount || "0", 18); }
    catch { return BigInt(0); }
  })();

  /* ── Kick off TX 1: deploy ────────────────────────────────────── */
  const handleCreate = () => {
    if (!address) return toast.error("Wallet not connected");
    if (!tokenAddress) return toast.error("Enter a token address");
    if (amountWei <= BigInt(0)) return toast.error("Enter a deposit amount");

    setStatus("deploying");
    setErrorMsg("");

    writeDeploy({
      address: CONTRACT_ADDRESSES.VaultFactory,
      abi: VAULT_FACTORY_ABI,
      functionName: "deployVault",
      args: [address],
    });
  };

  /* ── When deploy hash arrives → confirming ────────────────────── */
  useEffect(() => {
    if (deployHash && status === "deploying") {
      setStatus("deploy_confirming");
      toast.info("Deploy TX submitted — waiting for confirmation…");
    }
  }, [deployHash, status]);

  /* ── When deploy confirmed → get vault address → approve ──────── */
  useEffect(() => {
    if (!deploySuccess || !deployHash || status === "deploy_done") return;

    setStatus("deploy_done");

    (async () => {
      try {
        const addr = await getVaultAddressFromTxHash(deployHash);
        setVaultAddress(addr);
        toast.success(`Vault deployed at ${addr.slice(0, 10)}…`);

        // Now approve the vault to spend the token
        setStatus("approving");
        writeApprove({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [addr, amountWei],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setStatus("error");
        setErrorMsg(msg);
        toast.error("Failed to read vault address: " + msg);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploySuccess]);

  /* ── When approve hash arrives → confirming ───────────────────── */
  useEffect(() => {
    if (approveHash && status === "approving") {
      setStatus("approve_confirming");
    }
  }, [approveHash, status]);

  /* ── When approve confirmed → deposit ─────────────────────────── */
  useEffect(() => {
    if (!approveSuccess || !vaultAddress || status === "depositing") return;

    setStatus("depositing");
    toast.info("Approval confirmed — now depositing…");

    writeDeposit({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [token, amountWei],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  /* ── When deposit hash arrives → confirming ───────────────────── */
  useEffect(() => {
    if (depositHash && status === "depositing") {
      setStatus("deposit_confirming");
    }
  }, [depositHash, status]);

  /* ── When deposit confirmed → generate ZK proof → done ────────── */
  useEffect(() => {
    if (!depositSuccess || status === "done" || status === "saving") return;

    setStatus("saving");

    (async () => {
      // Generate real ZK proof to demonstrate circuit works
      try {
        setZkStatus("generating");
        const amountUsd = parseFloat(amount || "0");
        const result = await generateCollateralProof(
          [{ symbol: "TOKEN", amountUsd }],
          amountUsd > 0 ? amountUsd * 0.5 : 1, // threshold = 50% of value
        );
        setZkStatus("verified");
        setZkProofHash(result.proofHash);
        setZkElapsed(result.elapsedMs);
      } catch {
        setZkStatus("error");
      }

      setStatus("done");
      toast.success("Vault created and funded! 🎉");

      // Redirect to dashboard after a short delay
      setTimeout(() => router.push("/dashboard"), 3000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess]);

  /* ── Watch for errors from any hook ───────────────────────────── */
  useEffect(() => {
    const err = deployError || approveError || depositError;
    if (err && status !== "error" && status !== "done") {
      setStatus("error");
      setErrorMsg(err.message?.split("\n")[0] || "Transaction rejected");
      toast.error("Transaction failed");
    }
  }, [deployError, approveError, depositError, status]);

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 font-[family-name:var(--font-syne)] text-lg font-bold text-vf-text">
        Review &amp; Confirm
      </h2>

      {/* Summary card */}
      <div className="mb-6 space-y-2 rounded border border-vf-border bg-vf-base p-4">
        <Row label="Network" value="opBNB Testnet" />
        <Row
          label="Token"
          value={`${tokenAddress.slice(0, 6)}…${tokenAddress.slice(-4)}`}
        />
        <Row label="Amount" value={amount} />
        <Row label="Transactions needed" value="3 (Deploy → Approve → Deposit)" highlight />
      </div>

      {/* Irreversible warning */}
      {status === "idle" && (
        <div className="mb-4 rounded border border-red-500/20 bg-red-950/10 p-3">
          <p className="text-sm font-medium text-red-400">⚠ This action is irreversible</p>
          <p className="mt-1 text-xs text-gray-400">
            Deploying a vault and depositing assets to a smart contract cannot be undone.
          </p>
        </div>
      )}

      {/* ZK Proof Status */}
      {(zkStatus !== "idle" || status === "done") && (
        <div className="mb-4">
          <ZKProofStatus
            status={zkStatus}
            proofHash={zkProofHash}
            elapsedMs={zkElapsed}
          />
        </div>
      )}

      {/* Transaction progress */}
      <div className="mb-6 space-y-3">
        <TxStep
          label="1. Deploy Vault"
          state={
            status === "idle" ? "pending"
              : status === "deploying" || status === "deploy_confirming" ? "active"
              : "done"
          }
          isPending={deployPending}
          isConfirming={deployConfirming}
          hash={deployHash}
          show={status !== "idle"}
        />
        <TxStep
          label="2. Approve Token"
          state={
            ["idle", "deploying", "deploy_confirming", "deploy_done"].includes(status) && status !== "deploy_done"
              ? "pending"
              : status === "deploy_done" || status === "approving" || status === "approve_confirming"
              ? "active"
              : "done"
          }
          isPending={approvePending}
          isConfirming={approveConfirming}
          hash={approveHash}
          show={!["idle", "deploying", "deploy_confirming"].includes(status)}
        />
        <TxStep
          label="3. Deposit Collateral"
          state={
            ["idle", "deploying", "deploy_confirming", "deploy_done", "approving", "approve_confirming"].includes(status)
              ? "pending"
              : status === "depositing" || status === "deposit_confirming"
              ? "active"
              : "done"
          }
          isPending={depositPending}
          isConfirming={depositConfirming}
          hash={depositHash}
          show={!["idle", "deploying", "deploy_confirming", "deploy_done", "approving", "approve_confirming"].includes(status)}
        />
      </div>

      {/* Vault address */}
      {vaultAddress && (
        <div className="mb-4 rounded border border-cyan-500/20 bg-cyan-950/10 p-3">
          <p className="text-xs text-gray-400">Vault Address</p>
          <a
            href={`${EXPLORER}/address/${vaultAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-cyan-400 hover:underline"
          >
            {vaultAddress}
          </a>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mb-4 rounded border border-red-500/30 bg-red-950/20 p-4">
          <p className="text-sm font-medium text-red-400">Transaction failed</p>
          <p className="mt-1 text-xs text-gray-400">{errorMsg}</p>
          <button
            onClick={() => {
              setStatus("idle");
              setErrorMsg("");
            }}
            className="mt-3 rounded border border-red-500/30 px-4 py-1.5 font-mono text-xs text-red-400 hover:bg-red-500/10"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Done state */}
      {status === "done" && (
        <div className="rounded border border-green-500/30 bg-green-950/20 p-4 text-center">
          <p className="text-lg font-bold text-green-400">Vault Created ✓</p>
          <p className="mt-1 text-sm text-gray-400">Redirecting to dashboard…</p>
          <div className="mt-3 flex justify-center gap-4">
            {deployHash && (
              <a
                href={`${EXPLORER}/tx/${deployHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-cyan-400 hover:underline"
              >
                Deploy TX ↗
              </a>
            )}
            {depositHash && (
              <a
                href={`${EXPLORER}/tx/${depositHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-cyan-400 hover:underline"
              >
                Deposit TX ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          disabled={status !== "idle" && status !== "error"}
          className="rounded border border-vf-border px-4 py-2 font-mono text-xs text-vf-text-muted transition-colors hover:border-vf-text-muted disabled:opacity-30"
        >
          Back
        </button>
        {status === "idle" && (
          <button
            onClick={handleCreate}
            className="flex-1 rounded px-6 py-2 font-mono text-sm font-bold transition-colors"
            style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
          >
            Create Vault — 3 Transactions
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-vf-text-muted">{label}</span>
      <span className={`font-mono ${highlight ? "text-yellow-400" : "text-vf-text"}`}>
        {value}
      </span>
    </div>
  );
}

function TxStep({
  label,
  state,
  isPending,
  isConfirming,
  hash,
  show,
}: {
  label: string;
  state: "pending" | "active" | "done";
  isPending: boolean;
  isConfirming: boolean;
  hash?: `0x${string}`;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-3">
      {state === "done" && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-xs text-green-400">
          ✓
        </span>
      )}
      {state === "active" && (
        <span className="flex h-6 w-6 items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </span>
      )}
      {state === "pending" && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs text-gray-500">
          ○
        </span>
      )}
      <div className="flex-1">
        <span
          className={`font-mono text-xs ${
            state === "done" ? "text-green-400" : state === "active" ? "text-cyan-400" : "text-gray-500"
          }`}
        >
          {label}
        </span>
        {state === "active" && isPending && (
          <span className="ml-2 text-xs text-gray-400">— confirm in wallet…</span>
        )}
        {state === "active" && isConfirming && (
          <span className="ml-2 text-xs text-gray-400">— confirming on-chain…</span>
        )}
      </div>
      {hash && (
        <a
          href={`${EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-cyan-400/60 hover:text-cyan-400"
        >
          {hash.slice(0, 10)}… ↗
        </a>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function VaultCreatePage() {
  const [step, setStep] = useState<Step>(1);
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
            tokenAddress={tokenAddress}
            amount={amount}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}
