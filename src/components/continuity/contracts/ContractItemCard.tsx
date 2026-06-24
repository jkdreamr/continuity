import { Lock, Check, X } from "lucide-react";
import type { ContractItem } from "@/types/continuity";
import { ACCENT } from "@/lib/accent";
import { cx } from "@/lib/cx";
import { contractKindMeta, APPLY_POLICY_LABEL } from "@/lib/contracts/contractMeta";

/**
 * One inspectable contract item — kind, the statement, its confidence, how it
 * may be applied, and whether it's sensitive. Optional accept/reject actions let
 * a proposed item be promoted to active or dismissed.
 */
export function ContractItemCard({
  item,
  onAccept,
  onReject,
  className,
}: {
  item: ContractItem;
  onAccept?: () => void;
  onReject?: () => void;
  className?: string;
}) {
  const meta = contractKindMeta(item.kind);
  const accent = ACCENT[meta.accent];
  const sensitive = item.sensitivity !== "normal";

  return (
    <div className={cx("rounded-md border border-rule bg-surface px-3 py-2.5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cx(
            "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[0.08em]",
            accent.soft,
          )}
        >
          {meta.noun}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-2xs text-ink-faint">
          {sensitive && (
            <span className="inline-flex items-center gap-0.5 text-rust-ink" title="Sensitive — never auto-applied">
              <Lock size={10} /> sensitive
            </span>
          )}
          {item.confidence} · {APPLY_POLICY_LABEL[item.applyPolicy] ?? item.applyPolicy}
        </span>
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{item.statement}</p>

      {(onAccept || onReject) && (
        <div className="mt-2 flex items-center gap-1.5">
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs font-medium text-green-ink hover:bg-green-soft"
            >
              <Check size={12} /> Save to contract
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink"
            >
              <X size={12} /> Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
