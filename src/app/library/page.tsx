"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ContextPack, PackKind } from "@/types/continuity";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { PackCard } from "@/components/continuity/PackCard";
import { PackEditor, type PackDraft } from "@/components/continuity/PackEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader, HydrateSkeleton } from "@/components/continuity/page-parts";

type Category = { id: string; label: string; blurb: string; kinds: PackKind[] };

const CATEGORIES: Category[] = [
  { id: "voice", label: "Your voice", blurb: "How you sound — and the words you avoid.", kinds: ["voice"] },
  {
    id: "spaces",
    label: "Spaces",
    blurb: "What you're working on, and who it's for.",
    kinds: ["project", "audience", "reference"],
  },
  { id: "keep", label: "Keep true", blurb: "Hard rules and decisions to carry forward.", kinds: ["constraint", "decision"] },
  { id: "visual", label: "Visual direction", blurb: "The look and feel for build work.", kinds: ["taste"] },
];

export default function LibraryPage() {
  return (
    <Suspense fallback={<HydrateSkeleton />}>
      <LibraryInner />
    </Suspense>
  );
}

function LibraryInner() {
  const ws = useWorkspace();
  const { toast } = useToast();
  const params = useSearchParams();

  const [editing, setEditing] = useState<ContextPack | null>(null);
  const [initialKind, setInitialKind] = useState<PackKind>("voice");
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ContextPack | null>(null);

  const editId = params.get("edit");
  useEffect(() => {
    if (!editId || !ws.hydrated) return;
    const pack = ws.workspace.packs.find((p) => p.id === editId);
    if (pack) {
      setEditing(pack);
      setEditorOpen(true);
    }
  }, [editId, ws.hydrated, ws.workspace.packs]);

  if (!ws.hydrated) return <HydrateSkeleton />;

  function openNew(kind: PackKind) {
    setEditing(null);
    setInitialKind(kind);
    setEditorOpen(true);
  }

  function save(values: PackDraft) {
    if (editing) {
      ws.updatePack(editing.id, values);
      toast("Saved");
    } else {
      ws.createPack(values);
      toast("Added to your Library");
    }
    setEditorOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Reusable context"
        title="Library"
        lede="The context Continuity carries for you — your voice, the spaces you work in, the rules you keep, and your visual direction. Edit it once; it rides along automatically."
        actions={
          <Button variant="primary" onClick={() => openNew("voice")}>
            <Plus size={16} /> New
          </Button>
        }
      />

      {CATEGORIES.map((cat) => {
        const items = ws.workspace.packs.filter((p) => cat.kinds.includes(p.kind));
        return (
          <section key={cat.id} className="space-y-3">
            <div className="flex items-end justify-between gap-3 border-b border-rule pb-2">
              <div>
                <h2 className="font-display text-xl text-ink">{cat.label}</h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">{cat.blurb}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openNew(cat.kinds[0]!)}>
                <Plus size={14} /> Add
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-rule px-4 py-5 text-[13px] text-ink-muted">
                Nothing here yet. Add {cat.label.toLowerCase()} so Continuity can use it automatically.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    onEdit={(p) => {
                      setEditing(p);
                      setEditorOpen(true);
                    }}
                    onDuplicate={(p) => {
                      ws.duplicatePack(p.id);
                      toast("Duplicated");
                    }}
                    onDelete={(p) => setToDelete(p)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-3">
        <div className="border-b border-rule pb-2">
          <h2 className="font-display text-xl text-ink">Recent work</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">Requests and drafts save here automatically.</p>
        </div>
        {ws.workspace.requests.length === 0 ? (
          <p className="rounded-md border border-dashed border-rule px-4 py-5 text-[13px] text-ink-muted">
            Nothing yet.{" "}
            <Link href="/" className="text-signal hover:underline">
              Start on Now
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {[...ws.workspace.requests]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 8)
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/?request=${r.id}`}
                  className="flex items-center gap-3 rounded-md border border-rule bg-surface px-3.5 py-2.5 shadow-card transition-colors hover:border-ink/20"
                >
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase ${
                      r.selectedMode === "build" ? "bg-rust-soft text-rust-ink" : "bg-signal-soft text-signal-ink"
                    }`}
                  >
                    {r.selectedMode}
                  </span>
                  <span className="truncate text-[13px] text-ink-muted">{r.text}</span>
                </Link>
              ))}
          </div>
        )}
      </section>

      <PackEditor
        open={editorOpen}
        pack={editing}
        initialKind={initialKind}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this?"
        body={
          <>
            <strong className="text-ink">{toDelete?.name}</strong> will be removed from your Library and from any
            request using it. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (toDelete) {
            ws.deletePack(toDelete.id);
            toast("Deleted");
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
