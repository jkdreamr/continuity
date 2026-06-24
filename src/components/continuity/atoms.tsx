import type { ContextPack } from "@/types/continuity";
import { ACCENT } from "@/lib/accent";
import { kindMeta } from "@/lib/packKinds";
import { ACTIVATION_LABEL, PRIORITY_LABEL, SCOPE_LABEL } from "@/lib/labels";
import { cx } from "@/lib/cx";
import { KindIcon } from "@/components/continuity/KindIcon";

/** Kind tag with icon + accent. */
export function KindBadge({ pack, className }: { pack: ContextPack; className?: string }) {
  const meta = kindMeta(pack.kind);
  const accent = ACCENT[meta.accent];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium",
        accent.soft,
        className,
      )}
    >
      <KindIcon kind={pack.kind} size={11} />
      {meta.noun}
    </span>
  );
}

export function ActivationBadge({ pack }: { pack: ContextPack }) {
  const on = pack.activation === "always_on";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 text-2xs font-medium",
        on ? "text-green-ink" : "text-ink-faint",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", on ? "bg-green" : "bg-rule")} />
      {ACTIVATION_LABEL[pack.activation]}
    </span>
  );
}

export function MetaLine({ pack }: { pack: ContextPack }) {
  return (
    <span className="text-2xs text-ink-faint">
      {SCOPE_LABEL[pack.mode]} · {PRIORITY_LABEL[pack.priority]}
    </span>
  );
}

/** Tiny tag pill. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-surface-sunk px-1.5 py-0.5 text-2xs text-ink-muted">
      {children}
    </span>
  );
}
