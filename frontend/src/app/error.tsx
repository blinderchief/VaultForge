"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vf-red/10">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--vf-red)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-vf-text">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-vf-text-muted">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg border border-vf-cyan/30 px-6 py-2.5 font-mono text-sm text-vf-cyan transition-colors hover:bg-vf-cyan/10"
      >
        Try Again
      </button>
    </div>
  );
}
