"use client";

import { Lightbulb } from "lucide-react";
import type { MemoryProposal } from "@/types/continuity";
import { Button } from "@/components/ui/Button";

export function ProposalCard({
  proposal,
  onAccept,
  onEdit,
  onDismiss,
}: {
  proposal: MemoryProposal;
  onAccept: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface p-4 shadow-card">
      <div className="flex items-center gap-1.5">
        <Lightbulb size={12} className="text-green" strokeWidth={2} />
        <span className="eyebrow text-green-ink">Suggested from your saved choices</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-ink">{proposal.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{proposal.detail}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={onAccept}>
          {proposal.actionLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit instead
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
