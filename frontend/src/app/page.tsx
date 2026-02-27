export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-vf-base p-6">
      <h1 className="mb-3 font-[family-name:var(--font-syne)] text-4xl font-bold text-vf-text">
        VaultForge
      </h1>
      <p className="mb-8 max-w-md text-center font-mono text-sm text-vf-text-muted">
        Non-custodial ZK-private intelligent collateral vaults on opBNB/BSC
      </p>
      <div className="flex gap-4">
        <a
          href="/dashboard"
          className="rounded border border-vf-cyan px-6 py-2 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10"
        >
          Dashboard
        </a>
        <a
          href="/vault/create"
          className="rounded px-6 py-2 font-mono text-sm font-bold"
          style={{ background: "var(--vf-cyan)", color: "var(--vf-base)" }}
        >
          Create Vault
        </a>
      </div>
    </div>
  );
}
