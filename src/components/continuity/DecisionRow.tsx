"use client";

import { Plus, Minus, RotateCcw, Ban } from "lucide-react";
import type { PackDecision } from "@/types/continuity";
import { ACCENT } from "@/lib/accent";
import { kindMeta } from "@/lib/packKinds";
import { cx } from "@/lib/cx";
import { KindIcon } from "@/components/continuity/KindIcon";

export function DecisionRow({
  decision,
  onInclude,
  onExclude,
  onClear,
}: {
  decision: PackDecision;
  onInclude: () => void;
  onExclude: () => void;
  onClear: () => void;
}) {
  const { pack, state, reason } = decision;
  const accent = ACCENT[kindMeta(pack.kind).accent];
  const active = state === "active";
  const unavailable = state === "unavailable";

  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded border px-3 py-2.5 transition-colors",
        active ? "border-rule bg-surface" : "border-transparent",
        state === "available" && "bg-surface-sunk/60",
        state === "excluded" && "bg-surface-sunk/40",
        unavailable && "opacity-55",
      )}
    >
      <KindIcon
        kind={pack.kind}
        size={15}
        className={active ? accent.text : "text-ink-faint"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "truncate text-[13px] font-medium",
              state === "excluded" ? "text-ink-faint line-through" : "text-ink",
            )}
          >
            {pack.name}
          </span>
        </div>
        <p className="mt-0.5 truncate text-2xs text-ink-faint">{reason}</p>
      </div>

      {active && (
        <RowButton label="Remove from this task" onClick={onExclude}>
          <Minus size={13} /> Remove
        </RowButton>
      )}
      {state === "available" && (
        <RowButton label="Add to this task" emphasis onClick={onInclude}>
          <Plus size={13} /> Add
        </RowButton>
      )}
      {state === "excluded" && (
        <RowButton label="Restore to this task" onClick={onClear}>
          <RotateCcw size={12} /> Restore
        </RowButton>
      )}
      {unavailable && (
        <span className="inline-flex items-center gap-1 text-2xs font-medium text-ink-faint">
          <Ban size={12} /> Off-scope
        </span>
      )}
    </div>
  );
}

function RowButton({
  label,
  emphasis,
  onClick,
  children,
}: {
  label: string;
  emphasis?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-2xs font-medium transition-colors",
        emphasis
          ? "bg-signal text-white hover:bg-signal-ink"
          : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
