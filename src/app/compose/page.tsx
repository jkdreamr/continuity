"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Save, Download, ArrowLeft } from "lucide-react";
import type { ContextPack, Mode, TargetTool, Task } from "@/types/continuity";
import { compile } from "@/lib/compile";
import { selectPacks } from "@/lib/selection";
import { railsFor, defaultRails } from "@/lib/rails";
import { kindMeta } from "@/lib/packKinds";
import { downloadText, slugify } from "@/lib/download";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { TextField, TextArea, TagInput } from "@/components/ui/Field";
import { ModeSwitch } from "@/components/continuity/ModeSwitch";
import { RailControl } from "@/components/continuity/RailControl";
import { DecisionRow } from "@/components/continuity/DecisionRow";
import { ContextThread } from "@/components/continuity/ContextThread";
import { PromptPreview } from "@/components/continuity/PromptPreview";
import { SectionTitle, HydrateSkeleton } from "@/components/continuity/page-parts";

const TARGETS: Record<Mode, TargetTool[]> = {
  writing: ["Claude", "ChatGPT", "Generic"],
  build: ["Claude Code", "Lovable", "ChatGPT", "Generic"],
};

export default function ComposePage() {
  return (
    <Suspense fallback={<HydrateSkeleton />}>
      <ComposeInner />
    </Suspense>
  );
}

function ComposeInner() {
  const ws = useWorkspace();
  const params = useSearchParams();
  const taskId = params.get("task");

  const task = useMemo(
    () => ws.workspace.tasks.find((t) => t.id === taskId),
    [ws.workspace.tasks, taskId],
  );

  if (!ws.hydrated) return <HydrateSkeleton />;

  if (!task) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-rule bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-xl text-ink">That task isn&apos;t here</h1>
        <p className="mt-2 text-sm text-ink-muted">
          It may have been cleared. Start a new one from your workspace.
        </p>
        <div className="mt-5">
          <Link href="/">
            <Button variant="primary">Back to workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <Composer task={task} />;
}

function Composer({ task }: { task: Task }) {
  const ws = useWorkspace();
  const { toast } = useToast();
  const [showMore, setShowMore] = useState(
    Boolean(task.notes || task.tags.length || task.audience || task.destination),
  );
  const [showSecondary, setShowSecondary] = useState(false);

  const packs = ws.workspace.packs;
  const decisions = useMemo(() => selectPacks(task, packs), [task, packs]);
  const compiled = useMemo(() => compile(task, packs), [task, packs]);
  const rails = railsFor(task.mode);

  const active = decisions.filter((d) => d.state === "active");
  const available = decisions.filter((d) => d.state === "available");
  const excluded = decisions.filter((d) => d.state === "excluded");
  const unavailable = decisions.filter((d) => d.state === "unavailable");

  const set = (patch: Partial<Task>) => ws.updateTask(task.id, patch);

  function changeMode(mode: Mode) {
    if (mode === task.mode) return;
    set({ mode, rails: defaultRails(mode), targetTool: TARGETS[mode][0] });
  }

  function saveToHistory() {
    ws.saveArtifact(task.id);
    toast("Saved to history");
  }

  function exportMarkdown() {
    const activeList = compiled.activePackIds
      .map((id) => packs.find((p) => p.id === id))
      .filter((p): p is ContextPack => Boolean(p));
    downloadText(
      `${slugify(task.title || "continuity-task")}.md`,
      toMarkdown(task, compiled.prompt, activeList),
      "text/markdown",
    );
    toast("Exported Markdown");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to workspace"
            className="rounded p-1.5 text-ink-muted hover:bg-surface-sunk hover:text-ink"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="eyebrow">Composer</p>
            <h1 className="font-display text-xl leading-tight text-ink">
              {task.title || "Untitled task"}
            </h1>
          </div>
        </div>
        <ModeSwitch mode={task.mode} onChange={changeMode} size="sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        {/* COMPOSER */}
        <div className="min-w-0 space-y-5">
          <Panel>
            <SectionTitle>The task</SectionTitle>
            <div className="mt-3 space-y-3">
              <TextField
                label="What are you making?"
                value={task.title}
                onChange={(v) => set({ title: v })}
                placeholder={task.mode === "writing" ? "Investor follow-up to Reid" : "Redesign the onboarding section"}
              />
              <TextArea
                label="Goal"
                value={task.goal}
                onChange={(v) => set({ goal: v })}
                rows={2}
                required
                placeholder={
                  task.mode === "writing"
                    ? "A warm, specific follow-up that answers their question and proposes a call."
                    : "Make onboarding calmer and more editorial, without touching auth or routing."
                }
              />

              {!showMore ? (
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-signal hover:underline"
                >
                  <ChevronDown size={14} /> Add audience, destination, and notes
                </button>
              ) : (
                <div className="space-y-3 border-t border-rule pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Audience"
                      value={task.audience}
                      onChange={(v) => set({ audience: v })}
                      placeholder="Early design partner"
                    />
                    <TextField
                      label={task.mode === "writing" ? "Destination" : "Surface"}
                      value={task.destination}
                      onChange={(v) => set({ destination: v })}
                      placeholder={task.mode === "writing" ? "A follow-up email" : "The onboarding screen"}
                    />
                  </div>
                  <TextArea
                    label="Notes"
                    value={task.notes}
                    onChange={(v) => set({ notes: v })}
                    rows={2}
                    placeholder="Anything one-off for this task — length, a single ask, things to mention."
                  />
                  <TagInput
                    label="Task tags"
                    value={task.tags}
                    onChange={(v) => set({ tags: v })}
                    hint="drive suggestions"
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              action={
                <span className="tabular font-mono text-2xs text-ink-faint">
                  {active.length} active · {available.length + excluded.length} more · {unavailable.length} off-scope
                </span>
              }
            >
              Active context
            </SectionTitle>
            <p className="mt-1.5 text-2xs leading-snug text-ink-faint">
              Selected from your packs, tags, and choices. Every line says why.
            </p>

            <div className="mt-3 space-y-1.5">
              {active.length === 0 && available.length === 0 ? (
                <p className="rounded border border-dashed border-rule px-3 py-4 text-[13px] text-ink-muted">
                  No packs match yet. Add tags above, or{" "}
                  <Link href="/packs" className="text-signal hover:underline">
                    create a pack
                  </Link>
                  .
                </p>
              ) : (
                <>
                  {active.map((d) => (
                    <DecisionRow
                      key={d.pack.id}
                      decision={d}
                      onInclude={() => ws.setPackOverride(task.id, d.pack.id, "include")}
                      onExclude={() => ws.setPackOverride(task.id, d.pack.id, "exclude")}
                      onClear={() => ws.setPackOverride(task.id, d.pack.id, "clear")}
                    />
                  ))}
                  {available.map((d) => (
                    <DecisionRow
                      key={d.pack.id}
                      decision={d}
                      onInclude={() => ws.setPackOverride(task.id, d.pack.id, "include")}
                      onExclude={() => ws.setPackOverride(task.id, d.pack.id, "exclude")}
                      onClear={() => ws.setPackOverride(task.id, d.pack.id, "clear")}
                    />
                  ))}
                </>
              )}
            </div>

            {(excluded.length > 0 || unavailable.length > 0) && (
              <div className="mt-3 border-t border-rule pt-3">
                {!showSecondary ? (
                  <button
                    type="button"
                    onClick={() => setShowSecondary(true)}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink"
                  >
                    <ChevronDown size={14} /> Show removed and off-scope ({excluded.length + unavailable.length})
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {excluded.map((d) => (
                      <DecisionRow
                        key={d.pack.id}
                        decision={d}
                        onInclude={() => ws.setPackOverride(task.id, d.pack.id, "include")}
                        onExclude={() => ws.setPackOverride(task.id, d.pack.id, "exclude")}
                        onClear={() => ws.setPackOverride(task.id, d.pack.id, "clear")}
                      />
                    ))}
                    {unavailable.map((d) => (
                      <DecisionRow
                        key={d.pack.id}
                        decision={d}
                        onInclude={() => {}}
                        onExclude={() => {}}
                        onClear={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle>Intent rails</SectionTitle>
            <p className="mt-1.5 text-2xs leading-snug text-ink-faint">
              Plain controls, not prompt syntax. Each one changes the compiled language below.
            </p>
            <div className="mt-1 divide-y divide-rule">
              {rails.map((rail) => (
                <RailControl
                  key={rail.id}
                  rail={rail}
                  value={task.rails[rail.id] ?? rail.default}
                  onChange={(v) => ws.setRail(task.id, rail.id, v)}
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* OUTPUT */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <Panel>
            <SectionTitle>Context thread</SectionTitle>
            <p className="mt-1.5 text-2xs leading-snug text-ink-faint">
              These decisions are carried forward into the output.
            </p>
            <div className="mt-3">
              <ContextThread
                items={active.map((d) => ({ pack: d.pack, reason: d.reason }))}
                outputMeta={`${task.mode} · for ${task.targetTool}`}
              />
            </div>
          </Panel>

          <PromptPreview
            prompt={compiled.prompt}
            targetTool={task.targetTool}
            targets={TARGETS[task.mode]}
            onTargetChange={(t) => set({ targetTool: t })}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={saveToHistory}>
              <Save size={15} /> Save to history
            </Button>
            <Button variant="secondary" onClick={exportMarkdown}>
              <Download size={15} /> Export Markdown
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-rule bg-surface p-4 shadow-card sm:p-5">{children}</section>;
}

function toMarkdown(task: Task, prompt: string, active: ContextPack[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# ${task.title || "Untitled task"}`,
    "",
    `*Continuity · ${task.mode} · for ${task.targetTool} · ${date}*`,
    "",
  ];
  if (task.goal.trim()) {
    lines.push(`**Goal:** ${task.goal.trim()}`, "");
  }
  lines.push("## Active context");
  if (active.length) {
    for (const p of active) lines.push(`- **${p.name}** (${kindMeta(p.kind).noun}) — ${p.summary}`);
  } else {
    lines.push("- (none)");
  }
  lines.push("", "## Prompt", "", "```text", prompt, "```");
  return lines.join("\n");
}
