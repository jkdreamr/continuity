"use client";

import { X } from "lucide-react";
import type { DocumentBrief, DocumentKind } from "@/types/continuity";
import { cx } from "@/lib/cx";

const KIND_LABEL: Record<DocumentKind, string> = {
  manager_email: "Formal email",
  investor_follow_up: "Investor follow-up",
  memo: "Update / memo",
  post: "Post",
  reply: "Reply",
  other: "Note",
};

/** Task-local document brief as editable chips. Medium confidence asks lightly. */
export function DocumentBriefBar({
  brief,
  onChange,
  onAccept,
  onDismiss,
}: {
  brief: DocumentBrief | undefined;
  onChange: (brief: DocumentBrief) => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (!brief || brief.confidence === "low") return null;

  if (brief.confidence === "medium") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-ink-muted">{KIND_LABEL[brief.kind]}?</span>
        <button type="button" onClick={onAccept} className="rounded-full bg-signal px-2 py-0.5 text-2xs font-semibold text-white hover:bg-signal-ink">
          Use
        </button>
        <button type="button" onClick={onDismiss} className="rounded-full px-2 py-0.5 text-2xs font-medium text-ink-muted hover:bg-surface-sunk">
          Ignore
        </button>
      </div>
    );
  }

  const chips: { key: string; label: string; clear: () => void }[] = [
    { key: "kind", label: KIND_LABEL[brief.kind], clear: () => onChange({ ...brief, kind: "other" }) },
  ];
  if (brief.relationship)
    chips.push({ key: "rel", label: `To: ${brief.relationship}`, clear: () => onChange({ ...brief, relationship: undefined, audience: undefined }) });
  if (brief.tone?.length)
    chips.push({ key: "tone", label: `Tone: ${brief.tone.join(" + ")}`, clear: () => onChange({ ...brief, tone: undefined }) });
  if (brief.goal) chips.push({ key: "goal", label: `Ask: ${brief.goal}`, clear: () => onChange({ ...brief, goal: undefined }) });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className={cx(
            "inline-flex items-center gap-1 rounded-full border border-rule bg-surface px-2 py-0.5 text-2xs font-medium text-ink-muted",
          )}
        >
          {c.label}
          <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} className="text-ink-faint hover:text-rust">
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

export { KIND_LABEL };
