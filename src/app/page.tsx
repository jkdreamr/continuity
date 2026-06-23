"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Plus, FileText } from "lucide-react";
import type { Mode, Task } from "@/types/continuity";
import { activePacks } from "@/lib/selection";
import { SCOPE_LABEL } from "@/lib/labels";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { ModeSwitch } from "@/components/continuity/ModeSwitch";
import { Button } from "@/components/ui/Button";
import { PageHeader, SectionTitle, EmptyState, HydrateSkeleton } from "@/components/continuity/page-parts";
import { PackEditor, type PackDraft } from "@/components/continuity/PackEditor";
import { ProposalCard } from "@/components/continuity/ProposalCard";
import { KindIcon } from "@/components/continuity/KindIcon";
import { ACCENT } from "@/lib/accent";
import { kindMeta } from "@/lib/packKinds";
import { cx } from "@/lib/cx";

export default function HomePage() {
  const ws = useWorkspace();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("writing");
  const [editorOpen, setEditorOpen] = useState(false);

  const recentTasks = useMemo(
    () => [...ws.workspace.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [ws.workspace.tasks],
  );
  const alwaysOn = useMemo(
    () => ws.workspace.packs.filter((p) => p.activation === "always_on"),
    [ws.workspace.packs],
  );

  function startTask() {
    const task = ws.createTask({ mode });
    router.push(`/compose?task=${task.id}`);
  }

  function handleEdit(proposalPackId: string) {
    router.push(`/packs?edit=${proposalPackId}`);
  }

  if (!ws.hydrated) return <HydrateSkeleton />;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="The context layer"
        title="Decide what your AI knows — before it writes or builds."
        lede="Continuity keeps your voice, project facts, decisions, and constraints as visible Context Packs. Start a task, see exactly which context is active and why, tune a few plain controls, and copy a sharper prompt — without pasting the same background again."
      />

      {/* Start bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <ModeSwitch mode={mode} onChange={setMode} />
          <p className="text-[13px] text-ink-muted">
            {mode === "writing"
              ? "Outreach, posts, updates, high-stakes notes."
              : "Scope-safe change briefs for vibe-coding tools."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setEditorOpen(true)}>
            <Plus size={16} /> New Context Pack
          </Button>
          <Button variant="primary" onClick={startTask}>
            Start a {mode} task <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent + proposals */}
        <div className="min-w-0 space-y-8">
          <section className="space-y-3">
            <SectionTitle>Recent tasks</SectionTitle>
            {recentTasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                body="Start a task to assemble its context and compile a prompt. Your tasks are saved here so you can return to them."
                action={
                  <Button variant="secondary" size="sm" onClick={startTask}>
                    Start a {mode} task
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {recentTasks.map((task) => (
                  <RecentTaskRow key={task.id} task={task} activeCount={activePacks(task, ws.workspace.packs).length} />
                ))}
              </ul>
            )}
          </section>

          {ws.proposals.length > 0 && (
            <section className="space-y-3">
              <SectionTitle>Suggestions</SectionTitle>
              <div className="space-y-3">
                {ws.proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onAccept={() => ws.acceptProposal(p)}
                    onEdit={() => handleEdit(p.payload.packId!)}
                    onDismiss={() => ws.dismissProposal(p.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Always-on rail */}
        <div className="min-w-0 space-y-8">
          <section className="space-y-3">
            <SectionTitle
              action={
                <Link href="/packs" className="text-2xs font-medium text-signal hover:underline">
                  All packs →
                </Link>
              }
            >
              Always on
            </SectionTitle>
            <div className="rounded-md border border-rule bg-surface shadow-card">
              {alwaysOn.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-ink-muted">
                  Nothing is always on. Packs marked Always On are carried into every matching task.
                </p>
              ) : (
                <ul className="divide-y divide-rule">
                  {alwaysOn.map((pack) => {
                    const accent = ACCENT[kindMeta(pack.kind).accent];
                    return (
                      <li key={pack.id} className="flex items-center gap-3 px-4 py-3">
                        <KindIcon kind={pack.kind} size={15} className={accent.text} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">{pack.name}</p>
                          <p className="truncate text-2xs text-ink-faint">{pack.summary}</p>
                        </div>
                        <span className="shrink-0 font-mono text-2xs text-ink-faint">
                          {SCOPE_LABEL[pack.mode]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="px-1 text-2xs leading-snug text-ink-faint">
              Continuity selects context from your packs, tags, and choices — not hidden memory. You can
              see and change every decision.
            </p>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Stat label="Packs" value={ws.workspace.packs.length} href="/packs" />
            <Stat label="Tasks" value={ws.workspace.tasks.length} />
            <Stat label="Saved" value={ws.workspace.artifacts.length} />
          </section>
        </div>
      </div>

      <PackEditor
        open={editorOpen}
        pack={null}
        onClose={() => setEditorOpen(false)}
        onSave={(values: PackDraft) => {
          ws.createPack(values);
          setEditorOpen(false);
        }}
      />
    </div>
  );
}

function RecentTaskRow({ task, activeCount }: { task: Task; activeCount: number }) {
  return (
    <li>
      <Link
        href={`/compose?task=${task.id}`}
        className="group flex items-center gap-3 rounded-md border border-rule bg-surface px-4 py-3 shadow-card transition-colors hover:border-ink/20"
      >
        <FileText size={16} className="shrink-0 text-ink-faint" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{task.title || "Untitled task"}</p>
          <p className="truncate text-2xs text-ink-faint">
            {task.goal || "No goal yet"}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span
            className={cx(
              "rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-[0.08em]",
              task.mode === "writing" ? "bg-signal-soft text-signal-ink" : "bg-rust-soft text-rust-ink",
            )}
          >
            {task.mode}
          </span>
          <span className="tabular font-mono text-2xs text-ink-faint">{activeCount} active</span>
        </div>
        <ArrowRight size={15} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rounded-md border border-rule bg-surface px-3 py-3 text-center shadow-card">
      <div className="tabular font-display text-2xl text-ink">{value}</div>
      <div className="eyebrow mt-0.5">{label}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-colors hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}
