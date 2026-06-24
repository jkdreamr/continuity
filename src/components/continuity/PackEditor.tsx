"use client";

import { useEffect, useState } from "react";
import type { ContextPack, PackActivation, PackKind, PackPriority, PackScope } from "@/types/continuity";
import { PACK_KINDS, kindMeta } from "@/lib/packKinds";
import { ACTIVATION_HELP, PRIORITY_HELP, SCOPE_LABEL } from "@/lib/labels";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { TextField, TextArea, Select, TagInput } from "@/components/ui/Field";

export type PackDraft = {
  name: string;
  kind: PackKind;
  mode: PackScope;
  summary: string;
  details: string;
  tags: string[];
  priority: PackPriority;
  activation: PackActivation;
};

function draftFrom(pack: ContextPack | null, kind: PackKind): PackDraft {
  if (pack) {
    const { name, kind: k, mode, summary, details, tags, priority, activation } = pack;
    return { name, kind: k, mode, summary, details, tags, priority, activation };
  }
  return {
    name: "",
    kind,
    mode: "both",
    summary: "",
    details: "",
    tags: [],
    priority: "preferred",
    activation: "suggested",
  };
}

function usageSentence(d: PackDraft): string {
  const scope = SCOPE_LABEL[d.mode];
  if (d.activation === "always_on") return `Included by default in ${scope} tasks.`;
  if (d.activation === "manual") return `Stays off until you add it to a ${scope} task.`;
  const tags = d.tags.length ? d.tags.join(", ") : "matching tags";
  return `Suggested in ${scope} tasks tagged ${tags}.`;
}

export function PackEditor({
  open,
  pack,
  initialKind = "voice",
  onClose,
  onSave,
}: {
  open: boolean;
  pack: ContextPack | null;
  initialKind?: PackKind;
  onClose: () => void;
  onSave: (values: PackDraft) => void;
}) {
  const [draft, setDraft] = useState<PackDraft>(() => draftFrom(pack, initialKind));

  useEffect(() => {
    if (open) setDraft(draftFrom(pack, initialKind));
  }, [open, pack, initialKind]);

  const set = <K extends keyof PackDraft>(key: K, value: PackDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const meta = kindMeta(draft.kind);
  const valid = draft.name.trim().length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={pack ? "Edit pack" : "New Context Pack"}
      description={meta.label}
      footer={
        <div className="flex items-center justify-between">
          <p className="max-w-[60%] text-2xs leading-snug text-ink-faint">{usageSentence(draft)}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!valid}
              onClick={() => onSave({ ...draft, name: draft.name.trim() })}
            >
              {pack ? "Save changes" : "Create pack"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          label="Type"
          value={draft.kind}
          onChange={(v) => set("kind", v)}
          options={PACK_KINDS.map((k) => ({ value: k, label: `${kindMeta(k).label}` }))}
          hint={meta.noun}
        />
        <p className="-mt-2 text-2xs leading-snug text-ink-faint">{meta.blurb}</p>

        <TextField
          label="Name"
          value={draft.name}
          onChange={(v) => set("name", v)}
          placeholder="Direct, specific founder voice"
          required
        />
        <TextField
          label="One-line summary"
          value={draft.summary}
          onChange={(v) => set("summary", v)}
          placeholder="Warm, clear, confident. Avoid inflated language."
          helper="This is the line the compiler carries into your prompt."
        />
        <TextArea
          label="Details"
          value={draft.details}
          onChange={(v) => set("details", v)}
          placeholder="The specifics, words you use, things you avoid, facts that matter."
          rows={4}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Used in"
            value={draft.mode}
            onChange={(v) => set("mode", v)}
            options={(["writing", "build", "both"] as PackScope[]).map((m) => ({
              value: m,
              label: SCOPE_LABEL[m],
            }))}
          />
          <Select
            label="Priority"
            value={draft.priority}
            onChange={(v) => set("priority", v)}
            options={(["required", "preferred", "optional"] as PackPriority[]).map((p) => ({
              value: p,
              label: p[0]!.toUpperCase() + p.slice(1),
            }))}
          />
        </div>
        <p className="-mt-1 text-2xs leading-snug text-ink-faint">{PRIORITY_HELP[draft.priority]}</p>

        <Select
          label="Activation"
          value={draft.activation}
          onChange={(v) => set("activation", v)}
          options={(["always_on", "suggested", "manual"] as PackActivation[]).map((a) => ({
            value: a,
            label: a === "always_on" ? "Always On" : a[0]!.toUpperCase() + a.slice(1),
          }))}
        />
        <p className="-mt-2 text-2xs leading-snug text-ink-faint">{ACTIVATION_HELP[draft.activation]}</p>

        <TagInput label="Tags" value={draft.tags} onChange={(v) => set("tags", v)} hint="match tasks" />
      </div>
    </Drawer>
  );
}
