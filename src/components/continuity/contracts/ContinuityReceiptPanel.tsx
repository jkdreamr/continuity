import { Copy, FileText, Plus, AlertTriangle } from "lucide-react";
import type { ContinuityReceipt, ContractItem, ReceiptConflict } from "@/types/continuity";
import { cx } from "@/lib/cx";
import { contractKindMeta } from "@/lib/contracts/contractMeta";
import { ACCENT } from "@/lib/accent";
import { receiptToMarkdown } from "@/lib/contracts/generateContinuityReceipt";

/**
 * The Continuity Receipt, always five sections, in a fixed order:
 *   Context used · Commitments created · Assumptions made ·
 *   Potential contradictions · What should carry forward.
 * It makes a piece of AI work accountable to the contract: what it relied on,
 * what it newly created, and what is worth preserving.
 */

const SEVERITY: Record<ReceiptConflict["severity"], string> = {
  high: "bg-rust-soft text-rust-ink",
  medium: "bg-rust-soft/70 text-rust-ink",
  low: "bg-surface-sunk text-ink-muted",
};

function ItemLine({ item, onSave }: { item: ContractItem; onSave?: () => void }) {
  const meta = contractKindMeta(item.kind);
  const accent = ACCENT[meta.accent];
  return (
    <li className="flex items-start gap-2 py-1">
      <span className={cx("mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-2xs font-medium", accent.soft)}>
        {meta.noun}
      </span>
      <span className="flex-1 text-[13px] leading-relaxed text-ink">{item.statement}</span>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-signal hover:bg-signal-soft"
          title="Save to your contract"
        >
          <Plus size={11} /> Save
        </button>
      )}
    </li>
  );
}

function Section({
  title,
  count,
  children,
  emptyHint,
}: {
  title: string;
  count: number;
  children?: React.ReactNode;
  emptyHint: string;
}) {
  return (
    <section className="border-t border-rule px-3.5 py-3 first:border-t-0">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
        <span className="font-mono text-2xs text-ink-faint">{count}</span>
      </div>
      {count === 0 ? (
        <p className="mt-1 text-2xs text-ink-faint">{emptyHint}</p>
      ) : (
        <ul className="mt-1">{children}</ul>
      )}
    </section>
  );
}

export function ContinuityReceiptPanel({
  receipt,
  enriched,
  provider,
  onSaveCarryForward,
  className,
}: {
  receipt: ContinuityReceipt;
  enriched?: boolean;
  provider?: string;
  onSaveCarryForward?: (item: ContractItem) => void;
  className?: string;
}) {
  async function copy() {
    const md = receiptToMarkdown(receipt);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      /* clipboard blocked, no-op */
    }
  }

  return (
    <div className={cx("overflow-hidden rounded-lg border border-rule bg-surface shadow-card", className)}>
      <div className="flex items-center justify-between border-b border-rule px-3.5 py-2.5">
        <span className="eyebrow inline-flex items-center gap-1.5">
          <FileText size={12} /> Continuity receipt
          {enriched && provider && <span className="text-ink-faint">· enriched by {provider}</span>}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink"
        >
          <Copy size={12} /> Copy
        </button>
      </div>

      <Section title="Context used" count={receipt.contextUsed.length} emptyHint="No prior context applied.">
        {receipt.contextUsed.map((i) => (
          <ItemLine key={i.id} item={i} />
        ))}
      </Section>

      <Section title="Commitments created" count={receipt.commitmentsCreated.length} emptyHint="No new promises made.">
        {receipt.commitmentsCreated.map((i) => (
          <ItemLine key={i.id} item={i} onSave={onSaveCarryForward ? () => onSaveCarryForward(i) : undefined} />
        ))}
      </Section>

      <Section title="Assumptions made" count={receipt.assumptionsMade.length} emptyHint="Nothing asserted without backing.">
        {receipt.assumptionsMade.map((i) => (
          <ItemLine key={i.id} item={i} onSave={onSaveCarryForward ? () => onSaveCarryForward(i) : undefined} />
        ))}
      </Section>

      <Section
        title="Potential contradictions"
        count={receipt.contradictions.length}
        emptyHint="Nothing conflicts with your contract."
      >
        {receipt.contradictions.map((c) => (
          <li key={c.id} className="flex items-start gap-2 py-1">
            <span className={cx("mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-2xs font-medium capitalize", SEVERITY[c.severity])}>
              <AlertTriangle size={10} /> {c.severity}
            </span>
            <span className="flex-1 text-[13px] leading-relaxed text-ink">
              {c.statement}
              <span className="block text-2xs text-ink-muted">{c.rationale}</span>
            </span>
          </li>
        ))}
      </Section>

      <Section
        title="What should carry forward"
        count={receipt.carryForwardCandidates.length}
        emptyHint="Nothing durable to preserve from this."
      >
        {receipt.carryForwardCandidates.map((i) => (
          <ItemLine key={i.id} item={i} onSave={onSaveCarryForward ? () => onSaveCarryForward(i) : undefined} />
        ))}
      </Section>
    </div>
  );
}
