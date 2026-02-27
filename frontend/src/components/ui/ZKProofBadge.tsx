interface ZKProofBadgeProps {
  status: "verified" | "pending" | "failed";
  circuit?: string;
}

const statusConfig = {
  verified: {
    label: "ZK Verified",
    bg: "bg-vf-green/10",
    text: "text-vf-green",
    dot: "bg-vf-green",
  },
  pending: {
    label: "Proving…",
    bg: "bg-vf-amber/10",
    text: "text-vf-amber",
    dot: "bg-vf-amber",
  },
  failed: {
    label: "Proof Failed",
    bg: "bg-vf-red/10",
    text: "text-vf-red",
    dot: "bg-vf-red",
  },
} as const;

export default function ZKProofBadge({ status, circuit }: ZKProofBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono ${cfg.bg} ${cfg.text}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot} ${
          status === "pending" ? "animate-pulse" : ""
        }`}
      />
      {cfg.label}
      {circuit && (
        <span className="text-vf-text-muted">• {circuit}</span>
      )}
    </span>
  );
}
