"use client";

import { PenLine, Wrench } from "lucide-react";
import type { Mode } from "@/types/continuity";
import { cx } from "@/lib/cx";

export function ModeSwitch({
  mode,
  onChange,
  size = "md",
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="inline-flex items-center gap-0.5 rounded-md border border-rule bg-surface-sunk p-0.5"
    >
      <Segment active={mode === "writing"} onClick={() => onChange("writing")} size={size}>
        <PenLine size={14} /> Writing
      </Segment>
      <Segment active={mode === "build"} onClick={() => onChange("build")} size={size}>
        <Wrench size={14} /> Build
        <span className={cx("ml-1 rounded-sm bg-rust-soft px-1 py-0.5 text-2xs font-semibold text-rust-ink", mode === "build" ? "" : "")}>
          Beta
        </span>
      </Segment>
    </div>
  );
}

function Segment({
  active,
  onClick,
  size,
  children,
}: {
  active: boolean;
  onClick: () => void;
  size: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded font-medium transition-colors",
        size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm",
        active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
