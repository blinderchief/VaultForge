"use client";

import { useCallback, useEffect, useState } from "react";

interface IrreversibleWarningProps {
  /** What the user must type to confirm (e.g. "LIQUIDATE") */
  confirmText: string;
  /** Dialog title */
  title: string;
  /** Explanation shown in the modal body */
  description: string;
  /** Called when user confirms after the delay */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the modal is open */
  open: boolean;
}

/**
 * Wrapper: renders nothing when closed. When `open` becomes true the inner
 * component mounts fresh, naturally resetting typed/countdown state without
 * any setState-in-effect.
 */
export default function IrreversibleWarning(props: IrreversibleWarningProps) {
  if (!props.open) return null;
  return <IrreversibleWarningContent {...props} />;
}

function IrreversibleWarningContent({
  confirmText,
  title,
  description,
  onConfirm,
  onCancel,
}: IrreversibleWarningProps) {
  const [typed, setTyped] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Derive enabled from countdown — no separate state needed
  const enabled = countdown <= 0;

  // Countdown timer (setState only inside setTimeout callback, not synchronously)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const canConfirm = enabled && typed === confirmText;

  const handleConfirm = useCallback(() => {
    if (canConfirm) onConfirm();
  }, [canConfirm, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="glass-card w-full max-w-md p-6" style={{ borderColor: "var(--vf-red)" }}>
        {/* Red header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vf-red/20">
            <svg
              className="h-5 w-5 text-vf-red"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3 className="font-[var(--font-syne)] text-lg font-bold text-vf-red">
            {title}
          </h3>
        </div>

        <p className="mb-4 text-sm text-vf-text-muted">{description}</p>

        {/* Type to confirm */}
        <label className="mb-1 block text-xs text-vf-text-muted">
          Type <span className="font-mono font-bold text-vf-red">{confirmText}</span> to
          confirm
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="mb-4 w-full rounded border border-vf-border bg-vf-base px-3 py-2 font-mono text-sm text-vf-text outline-none focus:border-vf-red"
          autoFocus
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded border border-vf-border px-4 py-2 text-sm text-vf-text-muted transition-colors hover:border-vf-text-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              background: canConfirm ? "var(--vf-red)" : "var(--vf-surface-2)",
              color: canConfirm ? "#fff" : "var(--vf-text-muted)",
            }}
          >
            {enabled
              ? `Confirm`
              : `Wait ${countdown}s…`}
          </button>
        </div>
      </div>
    </div>
  );
}
