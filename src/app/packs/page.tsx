"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type {
  ContextPack,
  PackActivation,
  PackKind,
  PackPriority,
  PackScope,
} from "@/types/continuity";
import { PACK_KINDS, kindMeta } from "@/lib/packKinds";
import { ACTIVATION_LABEL, PRIORITY_LABEL, SCOPE_LABEL } from "@/lib/labels";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { PackCard } from "@/components/continuity/PackCard";
import { PackEditor, type PackDraft } from "@/components/continuity/PackEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader, EmptyState, HydrateSkeleton } from "@/components/continuity/page-parts";

type Filters = {
  mode: "all" | PackScope;
  kind: "all" | PackKind;
  activation: "all" | PackActivation;
  priority: "all" | PackPriority;
};

export default function PacksPage() {
  return (
    <Suspense fallback={<HydrateSkeleton />}>
      <PacksInner />
    </Suspense>
  );
}

function PacksInner() {
  const ws = useWorkspace();
  const { toast } = useToast();
  const params = useSearchParams();

  const [filters, setFilters] = useState<Filters>({
    mode: "all",
    kind: "all",
    activation: "all",
    priority: "all",
  });
  const [editing, setEditing] = useState<ContextPack | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ContextPack | null>(null);

  // Deep link from a proposal: /packs?edit=<id>
  const editId = params.get("edit");
  useEffect(() => {
    if (!editId || !ws.hydrated) return;
    const pack = ws.workspace.packs.find((p) => p.id === editId);
    if (pack) {
      setEditing(pack);
      setEditorOpen(true);
    }
  }, [editId, ws.hydrated, ws.workspace.packs]);

  const filtered = useMemo(
    () =>
      ws.workspace.packs.filter(
        (p) =>
          (filters.mode === "all" || p.mode === filters.mode) &&
          (filters.kind === "all" || p.kind === filters.kind) &&
          (filters.activation === "all" || p.activation === filters.activation) &&
          (filters.priority === "all" || p.priority === filters.priority),
      ),
    [ws.workspace.packs, filters],
  );

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function save(values: PackDraft) {
    if (editing) {
      ws.updatePack(editing.id, values);
      toast("Pack updated");
    } else {
      ws.createPack(values);
      toast("Pack created");
    }
    setEditorOpen(false);
    setEditing(null);
  }

  if (!ws.hydrated) return <HydrateSkeleton />;

  const hasPacks = ws.workspace.packs.length > 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your context, visible"
        title="Context Packs"
        lede="Reusable pieces of what you've already decided — your voice, projects, audiences, references, decisions, and boundaries. Edit them once; carry them into any task."
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus size={16} /> New pack
          </Button>
        }
      />

      {hasPacks && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-rule bg-surface px-3 py-2.5 shadow-card">
          <FilterSelect
            label="Type"
            value={filters.kind}
            onChange={(v) => setFilters((f) => ({ ...f, kind: v as Filters["kind"] }))}
            options={[
              { value: "all", label: "All types" },
              ...PACK_KINDS.map((k) => ({ value: k, label: kindMeta(k).noun })),
            ]}
          />
          <FilterSelect
            label="Used in"
            value={filters.mode}
            onChange={(v) => setFilters((f) => ({ ...f, mode: v as Filters["mode"] }))}
            options={[
              { value: "all", label: "Any mode" },
              { value: "writing", label: SCOPE_LABEL.writing },
              { value: "build", label: SCOPE_LABEL.build },
              { value: "both", label: SCOPE_LABEL.both },
            ]}
          />
          <FilterSelect
            label="Activation"
            value={filters.activation}
            onChange={(v) => setFilters((f) => ({ ...f, activation: v as Filters["activation"] }))}
            options={[
              { value: "all", label: "Any activation" },
              { value: "always_on", label: ACTIVATION_LABEL.always_on },
              { value: "suggested", label: ACTIVATION_LABEL.suggested },
              { value: "manual", label: ACTIVATION_LABEL.manual },
            ]}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilters((f) => ({ ...f, priority: v as Filters["priority"] }))}
            options={[
              { value: "all", label: "Any priority" },
              { value: "required", label: PRIORITY_LABEL.required },
              { value: "preferred", label: PRIORITY_LABEL.preferred },
              { value: "optional", label: PRIORITY_LABEL.optional },
            ]}
          />
          <span className="tabular ml-auto font-mono text-2xs text-ink-faint">
            {filtered.length} of {ws.workspace.packs.length}
          </span>
        </div>
      )}

      {!hasPacks ? (
        <EmptyState
          title="Start with one pack"
          body="A good first pack is your voice — how you sound, and the words you avoid. Then add a project (what it is) and a boundary (what must not change). Three packs is enough to feel the difference."
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={15} /> Create your first pack
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No packs match these filters"
          body="Nothing here with that combination. Clear a filter to see more."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ mode: "all", kind: "all", activation: "all", priority: "all" })}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onEdit={(p) => {
                setEditing(p);
                setEditorOpen(true);
              }}
              onDuplicate={(p) => {
                ws.duplicatePack(p.id);
                toast("Pack duplicated");
              }}
              onDelete={(p) => setToDelete(p)}
            />
          ))}
        </div>
      )}

      <PackEditor
        open={editorOpen}
        pack={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this pack?"
        body={
          <>
            <strong className="text-ink">{toDelete?.name}</strong> will be removed from your
            workspace and from any task using it. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete pack"
        danger
        onConfirm={() => {
          if (toDelete) {
            ws.deletePack(toDelete.id);
            toast("Pack deleted");
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded border border-rule bg-surface px-2 py-1 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-signal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
