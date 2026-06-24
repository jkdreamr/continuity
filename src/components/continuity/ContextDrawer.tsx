"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ContextLayer, ContextMixItem, ContextPack } from "@/types/continuity";
import { ACCENT } from "@/lib/accent";
import { kindMeta } from "@/lib/packKinds";
import { cx } from "@/lib/cx";
import { Drawer } from "@/components/ui/Drawer";
import { KindIcon } from "@/components/continuity/KindIcon";

type Override = "include" | "exclude" | "clear";

const LAYER_LABEL: Record<ContextLayer, string> = {
  voice: "Your voice",
  space: "Space",
  guardrail: "Keep true",
  moment: "Temporary source",
};

const SOURCE_LABEL: Record<string, string> = {
  baseline: "automatic",
  space: "from this Space",
  keyword: "from your request",
  recent: "recent",
  manual: "you added it",
};

export function ContextDrawer({
  open,
  onClose,
  applied,
  suggestions,
  available,
  source,
  packs,
  onOverride,
}: {
  open: boolean;
  onClose: () => void;
  applied: ContextMixItem[];
  suggestions: ContextMixItem[];
  available: ContextPack[];
  source?: string;
  packs: ContextPack[];
  onOverride: (packId: string, action: Override) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const byId = (id: string) => packs.find((p) => p.id === id);

  const layers: ContextLayer[] = ["voice", "space", "guardrail"];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="What Continuity is using"
      description="Chosen from your saved context, change anything for this request."
    >
      <div className="space-y-6">
        {applied.length === 0 && !source && (
          <p className="text-[13px] text-ink-muted">
            A clean starter baseline. Continuity will write a strong generic draft and label it as
            such. Add context below, or save some in your Library.
          </p>
        )}

        {layers.map((layer) => {
          const items = applied.filter((a) => a.layer === layer);
          if (!items.length) return null;
          return (
            <section key={layer} className="space-y-2">
              <h3 className="eyebrow">{LAYER_LABEL[layer]}</h3>
              {items.map((item) => {
                const pack = byId(item.contextId);
                if (!pack) return null;
                const remove = item.userOverride === "include" ? "clear" : "exclude";
                return (
                  <MixCard
                    key={item.contextId}
                    pack={pack}
                    reason={item.reason}
                    source={SOURCE_LABEL[item.source] ?? item.source}
                    active
                    onAction={() => onOverride(item.contextId, remove)}
                  />
                );
              })}
            </section>
          );
        })}

        {source && (
          <section className="space-y-2">
            <h3 className="eyebrow">Temporary source</h3>
            <div className="rounded-md border border-rule bg-surface-sunk px-3 py-2.5">
              <p className="text-[13px] font-medium text-ink">Pasted source text</p>
              <p className="mt-0.5 line-clamp-2 text-2xs text-ink-faint">{source}</p>
              <p className="mt-1 text-2xs text-green-ink">
                Temporary, used for this request only, not remembered.
              </p>
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="space-y-2">
            <h3 className="eyebrow">You might add</h3>
            {suggestions.map((item) => {
              const pack = byId(item.contextId);
              if (!pack) return null;
              return (
                <MixCard
                  key={item.contextId}
                  pack={pack}
                  reason={item.reason}
                  source={SOURCE_LABEL[item.source] ?? item.source}
                  onAction={() => onOverride(item.contextId, "include")}
                />
              );
            })}
          </section>
        )}

        <section>
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-signal hover:underline"
            >
              <Plus size={14} /> Add another context item
            </button>
          ) : available.length === 0 ? (
            <p className="text-2xs text-ink-faint">Everything that fits is already in use.</p>
          ) : (
            <div className="space-y-1.5">
              <h3 className="eyebrow mb-1">Add from your Library</h3>
              {available.map((pack) => (
                <MixCard
                  key={pack.id}
                  pack={pack}
                  reason={kindMeta(pack.kind).label}
                  source="from your Library"
                  onAction={() => onOverride(pack.id, "include")}
                />
              ))}
            </div>
          )}
        </section>

        <p className="border-t border-rule pt-3 text-2xs leading-relaxed text-ink-faint">
          Continuity learns only from what you write, paste, import, or approve, never from your
          browser tabs, clipboard, or accounts. Sensitive items are never auto-applied.
        </p>
      </div>
    </Drawer>
  );
}

function MixCard({
  pack,
  reason,
  source,
  active,
  onAction,
}: {
  pack: ContextPack;
  reason: string;
  source: string;
  active?: boolean;
  onAction: () => void;
}) {
  const accent = ACCENT[kindMeta(pack.kind).accent];
  return (
    <div className="flex items-start gap-3 rounded-md border border-rule bg-surface px-3 py-2.5">
      <KindIcon kind={pack.kind} size={15} className={cx("mt-0.5", active ? accent.text : "text-ink-faint")} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{pack.name}</p>
        <p className="text-2xs leading-snug text-ink-muted">{reason}</p>
        <span className="mt-0.5 inline-block font-mono text-2xs text-ink-faint">{source}</span>
      </div>
      <button
        type="button"
        onClick={onAction}
        aria-label={active ? `Remove ${pack.name}` : `Add ${pack.name}`}
        className={cx(
          "inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-2xs font-medium transition-colors",
          active
            ? "text-ink-muted hover:bg-surface-sunk hover:text-rust"
            : "bg-signal text-white hover:bg-signal-ink",
        )}
      >
        {active ? <X size={12} /> : <Plus size={12} />}
        {active ? "Remove" : "Add"}
      </button>
    </div>
  );
}
