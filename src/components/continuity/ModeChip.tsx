"use client";

import { PenLine, Wrench } from "lucide-react";
import type { Mode } from "@/types/continuity";
import { cx } from "@/lib/cx";

/** A small, reversible mode indicator. Inferred by default; click to flip. */
export function ModeChip({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const build = mode === "build";
  return (
    <button
      type="button"
      onClick={() => onChange(build ? "writing" : "build")}
      aria-label={`Mode: ${build ? "Build Beta" : "Writing"}. Click to switch.`}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors",
        build
          ? "border-rust/30 bg-rust-soft text-rust-ink hover:bg-rust-soft/70"
          : "border-signal/30 bg-signal-soft text-signal-ink hover:bg-signal-soft/70",
      )}
    >
      {build ? <Wrench size={13} /> : <PenLine size={13} />}
      {build ? "Build" : "Writing"}
      {build && <span className="rounded-sm bg-rust/15 px-1 text-2xs font-semibold">Beta</span>}
    </button>
  );
}
