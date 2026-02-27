export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-vf-surface-2" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card h-52 animate-pulse p-6">
            <div className="mb-4 h-4 w-24 rounded bg-vf-surface-2" />
            <div className="mb-3 h-6 w-32 rounded bg-vf-surface-2" />
            <div className="h-4 w-full rounded bg-vf-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
