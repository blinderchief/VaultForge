export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-vf-cyan/20 border-t-vf-cyan" />
        <span className="font-mono text-sm text-vf-text-muted">Loading…</span>
      </div>
    </div>
  );
}
