"use client";

import { SlidersHorizontal } from "lucide-react";

/** The quiet context summary. One line; opens the Context Drawer on click. */
export function UsingLine({ atoms, onOpen }: { atoms: string[]; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group inline-flex max-w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[13px] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
    >
      <span className="eyebrow shrink-0 text-ink-faint">Using</span>
      <span className="truncate">
        {atoms.length ? atoms.join("  ·  ") : "a clean starter baseline"}
      </span>
      <SlidersHorizontal
        size={13}
        className="shrink-0 text-ink-faint transition-colors group-hover:text-signal"
      />
    </button>
  );
}
