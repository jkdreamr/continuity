"use client";

import type { ContextContract, ContractItem, ContractItemKind } from "@/types/continuity";
import { Drawer } from "@/components/ui/Drawer";
import { contractKindMeta } from "@/lib/contracts/contractMeta";
import { ContractItemCard } from "@/components/continuity/contracts/ContractItemCard";

/**
 * Inspectable view of a Context Contract — the structured truths the work is
 * accountable to, grouped by kind. Proposed items can be accepted (made active)
 * or dismissed. Nothing here was collected silently; every item traces to text
 * the user wrote, pasted, imported, or approved.
 */

const KIND_ORDER: ContractItemKind[] = [
  "decision",
  "commitment",
  "constraint",
  "approved_fact",
  "relationship_note",
  "tone_rule",
  "open_question",
];

export function ContextContractDrawer({
  open,
  onClose,
  contract,
  onUpdateItem,
}: {
  open: boolean;
  onClose: () => void;
  contract: ContextContract | null;
  onUpdateItem?: (itemId: string, patch: Partial<ContractItem>) => void;
}) {
  const items = (contract?.items ?? []).filter((i) => i.status !== "rejected");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Context contract"
      description="The decisions, commitments, and guardrails this work must preserve."
    >
      <div className="space-y-6">
        {items.length === 0 && (
          <p className="text-[13px] text-ink-muted">
            Nothing here yet. Continuity proposes contract items from what you write, paste, import,
            or approve — never from anything collected silently.
          </p>
        )}

        {KIND_ORDER.map((kind) => {
          const group = items.filter((i) => i.kind === kind);
          if (!group.length) return null;
          return (
            <section key={kind} className="space-y-2">
              <h3 className="eyebrow">{contractKindMeta(kind).noun}</h3>
              {group.map((item) => {
                const proposed = item.status === "proposed";
                return (
                  <ContractItemCard
                    key={item.id}
                    item={item}
                    onAccept={proposed && onUpdateItem ? () => onUpdateItem(item.id, { status: "active" }) : undefined}
                    onReject={onUpdateItem ? () => onUpdateItem(item.id, { status: "rejected" }) : undefined}
                  />
                );
              })}
            </section>
          );
        })}

        <p className="border-t border-rule pt-3 text-2xs leading-relaxed text-ink-faint">
          Continuity learns only from what you write, paste, import, or approve. Sensitive items are
          never auto-applied, and nothing leaves your device unless you send it.
        </p>
      </div>
    </Drawer>
  );
}
