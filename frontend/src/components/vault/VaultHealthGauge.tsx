"use client";

import { useEffect, useRef } from "react";

interface VaultHealthGaugeProps {
  /** Health score 0–100. 0 = liquidation, 100 = perfectly safe. */
  score: number;
  /** Diameter in pixels (default 160) */
  size?: number;
}

function scoreToColor(score: number): string {
  if (score >= 70) return "var(--vf-green)";
  if (score >= 40) return "var(--vf-amber)";
  return "var(--vf-red)";
}

export default function VaultHealthGauge({
  score,
  size = 160,
}: VaultHealthGaugeProps) {
  const pathRef = useRef<SVGCircleElement>(null);
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreToColor(clamped);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  // Arc: 270° sweep (¾ circle), starts from bottom-left
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * (clamped / 100);
  const dashOffset = arcLength - filledLength;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    // Animate from 0 to target
    el.style.transition = "none";
    el.style.strokeDashoffset = `${arcLength}`;
    // Force reflow
    el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1s ease-out";
    el.style.strokeDashoffset = `${dashOffset}`;
  }, [arcLength, dashOffset]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[135deg]"
      >
        {/* Background arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--vf-surface-2)"
          strokeWidth={8}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <circle
          ref={pathRef}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute flex flex-col items-center">
        <span
          className="font-mono text-3xl font-bold"
          style={{ color }}
        >
          {clamped}
        </span>
        <span className="text-xs text-vf-text-muted">Health</span>
      </div>
    </div>
  );
}
