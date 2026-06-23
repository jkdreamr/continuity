"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Wand2,
  PenLine,
  ClipboardPaste,
  Copy,
  RefreshCw,
  FileCode2,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import type { BuildReaction, ContextPack, Draft, Mode, QuickRequest, Reaction, TargetTool } from "@/types/continuity";
import { inferBrief } from "@/lib/writing/documentBrief";
import { selectContextMix } from "@/lib/contextMix";
import { buildGenerationMessages, flattenMessages } from "@/lib/generationPrompt";
import { requestDraft } from "@/lib/generateClient";
import { reactionInstruction } from "@/lib/reactions";
import { compileActive } from "@/lib/compile";
import { requestToTask, buildRailsForReaction } from "@/lib/requestTask";
import { draftsForRequest } from "@/lib/requests";
import { newId, nowIso } from "@/lib/id";
import { downloadText, slugify } from "@/lib/download";
import { cx } from "@/lib/cx";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ModeChip } from "@/components/continuity/ModeChip";
import { UsingLine } from "@/components/continuity/UsingLine";
import { ContextDrawer } from "@/components/continuity/ContextDrawer";
import { ReactionRow } from "@/components/continuity/ReactionRow";
import { HydrateSkeleton } from "@/components/continuity/page-parts";

const EXAMPLES = [
  "Write a thoughtful follow-up to an investor I met yesterday.",
  "Turn these rough notes into a clear founder update.",
  "Make this email warmer, but keep it direct.",
  "Redesign the onboarding section without touching authentication.",
];

const BUILD_TARGETS: { tool: TargetTool; label: string }[] = [
  { tool: "Claude Code", label: "Copy for Claude Code" },
  { tool: "Lovable", label: "Copy for Lovable" },
  { tool: "Generic", label: "Copy generic" },
];

type GenState =
  | { status: "idle" }
  | { status: "loading"; reaction: Reaction | null }
  | { status: "error"; message: string }
  | { status: "not_configured" };

export default function NowPage() {
  return (
    <Suspense fallback={<HydrateSkeleton />}>
      <NowInner />
    </Suspense>
  );
}

function NowInner() {
  const ws = useWorkspace();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const paramRequest = params.get("request");

  const [askText, setAskText] = useState("");
  // The Now choice: Write (the document desk) or Build prompt (the studio).
  const [surface, setSurface] = useState<Mode>("writing");
  const [source, setSource] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [askOverrides, setAskOverrides] = useState<{ includeIds: string[]; excludeIds: string[]; spaceId?: string }>({
    includeIds: [],
    excludeIds: [],
  });
  const [view, setView] = useState<"ask" | "result">("ask");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gen, setGen] = useState<GenState>({ status: "idle" });
  const [editBuffer, setEditBuffer] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const packs = ws.workspace.packs;
  const request = useMemo(
    () => (requestId ? ws.workspace.requests.find((r) => r.id === requestId) ?? null : null),
    [requestId, ws.workspace.requests],
  );
  const drafts = useMemo(
    () => (request ? draftsForRequest(ws.workspace, request.id) : []),
    [request, ws.workspace],
  );
  const currentDraft = drafts[0] ?? null;

  const isResult = view === "result" && request;
  const mode: Mode = isResult ? request.selectedMode : surface;
  const mixText = isResult ? request.text : askText;
  const overrides = useMemo(
    () =>
      request && view === "result"
        ? { includeIds: request.includeIds, excludeIds: request.excludeIds, spaceId: request.spaceId }
        : askOverrides,
    [request, view, askOverrides],
  );

  const mix = useMemo(
    () => selectContextMix({ text: mixText, mode, ...overrides }, packs),
    [mixText, mode, overrides, packs],
  );
  const activePacks = useMemo(
    () => mix.applied.map((a) => packs.find((p) => p.id === a.contextId)).filter(Boolean) as ContextPack[],
    [mix.applied, packs],
  );
  const availablePacks = useMemo(
    () =>
      packs.filter(
        (p) =>
          (p.mode === "both" || p.mode === mode) &&
          !mix.applied.some((a) => a.contextId === p.id) &&
          !mix.suggestions.some((a) => a.contextId === p.id) &&
          !overrides.excludeIds.includes(p.id),
      ),
    [packs, mode, mix, overrides.excludeIds],
  );
  const atoms = usingAtoms(activePacks);

  // Cmd/Ctrl+K focuses the ask field from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("ask");
        setTimeout(() => askRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load a draft's content into the editable buffer when it changes.
  useEffect(() => {
    if (currentDraft) setEditBuffer(currentDraft.content);
  }, [currentDraft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: /?request=<id> opens that request's latest result.
  useEffect(() => {
    if (paramRequest && ws.workspace.requests.some((r) => r.id === paramRequest)) {
      setRequestId(paramRequest);
      setView("result");
    }
  }, [paramRequest, ws.hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ws.hydrated) return <HydrateSkeleton />;

  const firstUse = ws.workspace.requests.length === 0 && ws.workspace.drafts.length === 0;

  function activePacksForRequest(req: QuickRequest): ContextPack[] {
    const m = selectContextMix(
      { text: req.text, mode: req.selectedMode, spaceId: req.spaceId, includeIds: req.includeIds, excludeIds: req.excludeIds },
      packs,
    );
    return m.applied.map((a) => packs.find((p) => p.id === a.contextId)).filter(Boolean) as ContextPack[];
  }

  async function generateWriting(req: QuickRequest, reaction?: Reaction, parentDraftId?: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGen({ status: "loading", reaction: reaction ?? null });

    const active = activePacksForRequest(req);
    const messages = buildGenerationMessages(
      { text: req.text, source: req.source, reactionInstruction: reaction ? reactionInstruction(reaction) : undefined },
      active,
    );
    const result = await requestDraft(messages, controller.signal);

    if (result.ok) {
      ws.recordDraft({
        id: newId("draft"),
        requestId: req.id,
        mode: "writing",
        content: result.text,
        provider: result.provider,
        reaction,
        activeContextIds: active.map((p) => p.id),
        parentDraftId,
        createdAt: nowIso(),
      });
      setEditBuffer(result.text);
      setGen({ status: "idle" });
    } else if (result.error === "not_configured") {
      setGen({ status: "not_configured" });
    } else if (result.error === "aborted") {
      setGen({ status: "idle" });
    } else {
      setGen({ status: "error", message: errorMessage(result.error) });
    }
  }

  function makeBrief(req: QuickRequest, reaction?: BuildReaction) {
    const active = activePacksForRequest(req);
    const rails = buildRailsForReaction(reaction);
    let { prompt } = compileActive(requestToTask(req, rails), active);
    if (reaction === "plan_first") {
      prompt = "PLAN FIRST — return a short numbered plan and an audit of what to touch before any concrete change.\n\n" + prompt;
    }
    ws.recordDraft({
      id: newId("draft"),
      requestId: req.id,
      mode: "build",
      content: prompt,
      provider: "compiler",
      reaction,
      activeContextIds: active.map((p) => p.id),
      createdAt: nowIso(),
    });
    setEditBuffer(prompt);
    setGen({ status: "idle" });
  }

  function startWriting(seed?: string) {
    const text = (seed ?? askText).trim();
    const inferred = text ? inferBrief(text, { userStated: true }) : undefined;
    const doc = ws.createDocument({ brief: inferred && inferred.confidence !== "low" ? inferred : undefined });
    router.push(`/write?doc=${doc.id}`);
  }

  function run() {
    if (surface === "writing") {
      startWriting();
      return;
    }
    const text = askText.trim();
    if (!text) return;
    const req: QuickRequest = {
      id: newId("req"),
      text,
      inferredMode: "build",
      selectedMode: "build",
      spaceId: askOverrides.spaceId,
      source: source.trim() || undefined,
      includeIds: askOverrides.includeIds,
      excludeIds: askOverrides.excludeIds,
      targetTool: "Claude Code",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    ws.recordRequest(req);
    setRequestId(req.id);
    setView("result");
    setEditBuffer("");
    makeBrief(req);
  }

  function onReact(reaction: Reaction) {
    if (!request) return;
    if (request.selectedMode === "build") makeBrief(request, reaction as BuildReaction);
    else generateWriting(request, reaction, currentDraft?.id);
  }

  function onOverride(packId: string, action: "include" | "exclude" | "clear") {
    const apply = (inc: string[], exc: string[]) => {
      const include = new Set(inc);
      const exclude = new Set(exc);
      include.delete(packId);
      exclude.delete(packId);
      if (action === "include") include.add(packId);
      if (action === "exclude") exclude.add(packId);
      return { includeIds: [...include], excludeIds: [...exclude] };
    };
    if (isResult && request) {
      ws.updateRequest(request.id, apply(request.includeIds, request.excludeIds));
    } else {
      setAskOverrides((o) => ({ ...o, ...apply(o.includeIds, o.excludeIds) }));
    }
  }

  function onEdit(value: string) {
    setEditBuffer(value);
    if (currentDraft) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const id = currentDraft.id;
      saveTimer.current = setTimeout(() => ws.updateDraft(id, value), 300);
    }
  }

  function changeMode(m: Mode) {
    if (isResult && request) {
      // From a Build result, switching to Writing opens the document desk.
      if (m === "writing") startWriting(request.text);
      else ws.updateRequest(request.id, { selectedMode: "build", targetTool: "Claude Code" });
    } else {
      setSurface(m);
    }
  }

  function copyDraft() {
    void copyText(editBuffer);
    toast("Copied to clipboard");
  }

  function copyPrompt() {
    const active = request ? activePacksForRequest(request) : activePacks;
    const text =
      mode === "build"
        ? editBuffer
        : flattenMessages(buildGenerationMessages({ text: mixText, source: source.trim() || request?.source }, active));
    void copyText(text);
    toast("Prompt copied");
  }

  function copyForTool(tool: TargetTool) {
    if (!request) return;
    const active = activePacksForRequest(request);
    const { prompt } = compileActive(requestToTask({ ...request, targetTool: tool }, buildRailsForReaction()), active);
    void copyText(prompt);
    toast(`Copied for ${tool}`);
  }

  function exportMarkdown() {
    downloadText(`${slugify(mixText || "continuity")}.md`, editBuffer, "text/markdown");
    toast("Exported Markdown");
  }

  async function useClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSource(text);
        setShowSource(true);
        toast("Pulled text from clipboard");
      }
    } catch {
      toast("Clipboard access was blocked");
    }
  }

  function newRequest() {
    abortRef.current?.abort();
    setView("ask");
    setRequestId(null);
    setAskText("");
    setSource("");
    setShowSource(false);
    setAskOverrides({ includeIds: [], excludeIds: [] });
    setGen({ status: "idle" });
    setTimeout(() => askRef.current?.focus(), 0);
  }

  const drawer = (
    <ContextDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      applied={mix.applied}
      suggestions={mix.suggestions}
      available={availablePacks}
      source={isResult ? request?.source : source.trim() || undefined}
      packs={packs}
      onOverride={onOverride}
    />
  );

  // ---------- RESULT VIEW ----------
  if (isResult) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ModeChip mode={mode} onChange={changeMode} />
            <UsingLine atoms={atoms} onOpen={() => setDrawerOpen(true)} />
          </div>
          <Button variant="ghost" size="sm" onClick={newRequest}>
            <Plus size={15} /> New request
          </Button>
        </div>

        <p className="rounded-md border border-rule bg-surface-sunk px-3.5 py-2.5 text-[13px] text-ink-muted">
          {request.text}
        </p>

        {gen.status === "not_configured" ? (
          <NotConfigured prompt={editBuffer || promptPreview(mixText, source, request, activePacks, mode)} onCopy={copyPrompt} />
        ) : gen.status === "loading" && !currentDraft ? (
          <LoadingPanel onCancel={() => abortRef.current?.abort()} label={mode === "build" ? "Compiling your change brief…" : "Writing your draft…"} />
        ) : gen.status === "error" && !currentDraft ? (
          <ErrorPanel message={gen.message} onRetry={() => (mode === "build" ? makeBrief(request) : generateWriting(request))} />
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-rule px-3 py-2">
                <span className="eyebrow inline-flex items-center gap-1.5">
                  {gen.status === "loading" && <Loader2 size={12} className="animate-spin text-signal" />}
                  {mode === "build" ? "Change brief" : "Draft"}
                  {currentDraft?.provider && currentDraft.provider !== "compiler" && (
                    <span className="text-ink-faint">· {currentDraft.provider}</span>
                  )}
                </span>
                <span className="text-2xs text-ink-faint">Autosaved</span>
              </div>
              <textarea
                value={editBuffer}
                onChange={(e) => onEdit(e.target.value)}
                spellCheck={mode !== "build"}
                aria-label={mode === "build" ? "Change brief (editable)" : "Draft (editable)"}
                className={cx(
                  "min-h-[20rem] w-full resize-y bg-surface px-4 py-3.5 focus:outline-none",
                  mode === "build" ? "brief" : "text-[15px] leading-relaxed text-ink",
                )}
              />
            </div>

            <ReactionRow
              mode={mode}
              onReact={onReact}
              disabled={gen.status === "loading"}
              busyReaction={gen.status === "loading" ? gen.reaction : null}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={copyDraft}>
                <Copy size={15} /> Copy
              </Button>
              {mode === "build" ? (
                BUILD_TARGETS.map((t) => (
                  <Button key={t.tool} variant="secondary" size="sm" onClick={() => copyForTool(t.tool)}>
                    <FileCode2 size={14} /> {t.label}
                  </Button>
                ))
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generateWriting(request)}
                  disabled={gen.status === "loading"}
                >
                  <RefreshCw size={14} /> Regenerate
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={copyPrompt}>
                View prompt
              </Button>
              <Button variant="ghost" size="sm" onClick={exportMarkdown}>
                Export
              </Button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="ml-auto text-[13px] font-medium text-signal hover:underline"
              >
                Adjust context
              </button>
            </div>

            {drafts.length > 1 && (
              <VersionHistory drafts={drafts} currentId={currentDraft?.id} onPick={(d) => setEditBuffer(d.content)} />
            )}
          </>
        )}
        {drawer}
      </div>
    );
  }

  // ---------- ASK VIEW ----------
  return (
    <div className="mx-auto max-w-2xl">
      <div className={cx(firstUse ? "pt-6 sm:pt-10" : "pt-2")}>
        {firstUse && (
          <h1 className="mb-5 font-display text-3xl leading-tight tracking-tight text-ink sm:text-[36px]">
            What are you trying to make?
          </h1>
        )}

        <div className="mb-3 flex justify-center">
          <SurfaceChoice surface={surface} onChange={setSurface} />
        </div>

        <div className="rounded-xl border border-rule bg-surface p-3 shadow-card focus-within:border-ink/25">
          <textarea
            ref={askRef}
            autoFocus
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
            placeholder={
              surface === "build"
                ? "Describe the software change you need…"
                : "What do you want to write? (optional — or just open a blank page)"
            }
            rows={4}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
          />

          {showSource && (
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste source text to reply to or rewrite (stays on this request only)…"
              rows={3}
              className="mt-1 w-full resize-y rounded-md border border-rule bg-surface-sunk px-2.5 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-2 focus-visible:outline-signal"
            />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-rule px-1 pt-2.5">
            <UsingLine atoms={atoms} onOpen={() => setDrawerOpen(true)} />
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={useClipboard}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink"
              >
                <ClipboardPaste size={13} /> Use clipboard
              </button>
              <button
                type="button"
                onClick={() => setShowSource((s) => !s)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink"
              >
                {showSource ? <X size={13} /> : <Plus size={13} />} Source
              </button>
              <Button variant="primary" onClick={run} disabled={surface === "build" && !askText.trim()}>
                {surface === "build" ? (
                  <>
                    <Wand2 size={16} /> Make a change brief
                  </>
                ) : (
                  <>
                    Start writing <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-2 px-1 text-2xs text-ink-faint">
          {surface === "build" ? "Build Beta · " : ""}
          Press {modifierKey()}+Enter to {surface === "build" ? "compile" : "open the desk"} · {modifierKey()}+K to focus
        </p>

        {firstUse && (
          <div className="mt-6 space-y-2">
            <p className="eyebrow">Try</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setAskText(ex);
                  setTimeout(() => askRef.current?.focus(), 0);
                }}
                className="block w-full rounded-md border border-rule bg-surface px-3.5 py-2.5 text-left text-[14px] text-ink-muted shadow-card transition-colors hover:border-ink/20 hover:text-ink"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {!firstUse && <RecentWork onOpen={(id) => { setRequestId(id); setView("result"); }} />}
      </div>
      {drawer}
    </div>
  );
}

// ---------- helpers + small components ----------

function usingAtoms(active: ContextPack[]): string[] {
  return active.slice(0, 4).map((p) => (p.kind === "voice" ? "Your voice" : p.name));
}

function modifierKey(): string {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)) return "⌘";
  return "Ctrl";
}

function errorMessage(error: string): string {
  if (error === "network") return "Couldn't reach the server. Check your connection and retry.";
  return "The provider returned an error. Try again in a moment.";
}

function promptPreview(text: string, source: string, req: QuickRequest | null, active: ContextPack[], mode: Mode): string {
  if (mode === "build") return "";
  return flattenMessages(buildGenerationMessages({ text, source: source.trim() || req?.source }, active));
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  }
}

function LoadingPanel({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-rule bg-surface px-4 py-8 shadow-card">
      <span className="inline-flex items-center gap-2.5 text-sm text-ink-muted">
        <Loader2 size={16} className="animate-spin text-signal" />
        {label}
      </span>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-rust/30 bg-rust-soft px-4 py-4">
      <p className="text-sm text-rust-ink">{message}</p>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </Button>
      </div>
    </div>
  );
}

function NotConfigured({ prompt, onCopy }: { prompt: string; onCopy: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-signal/30 bg-signal-soft px-4 py-3.5">
        <p className="text-[13px] font-medium text-signal-ink">Direct drafting needs a server-side AI provider key.</p>
        <p className="mt-1 text-2xs leading-relaxed text-signal-ink/80">
          Set <code className="font-mono">ANTHROPIC_API_KEY</code> (or <code className="font-mono">OPENAI_API_KEY</code>) in
          your environment and reload. Nothing is faked — until a provider is configured, here is the exact prompt
          Continuity assembled, ready to paste into ChatGPT or Claude.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-rule px-3 py-2">
          <span className="eyebrow">Compiled prompt</span>
          <Button variant="primary" size="sm" onClick={onCopy}>
            <Copy size={14} /> Copy prompt
          </Button>
        </div>
        <pre className="brief max-h-[24rem] overflow-auto px-4 py-3.5">{prompt}</pre>
      </div>
    </div>
  );
}

function VersionHistory({
  drafts,
  currentId,
  onPick,
}: {
  drafts: Draft[];
  currentId?: string;
  onPick: (d: Draft) => void;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2.5 shadow-card">
      <p className="eyebrow mb-2">Versions</p>
      <div className="flex flex-wrap gap-1.5">
        {drafts.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(d)}
            className={cx(
              "rounded px-2 py-1 text-2xs font-medium transition-colors",
              d.id === currentId ? "bg-ink text-paper" : "bg-surface-sunk text-ink-muted hover:text-ink",
            )}
          >
            {i === 0 ? "Latest" : d.reaction ? labelFor(d.reaction) : `v${drafts.length - i}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function labelFor(reaction: Reaction): string {
  return reaction.replace(/_/g, " ");
}

function SurfaceChoice({ surface, onChange }: { surface: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Surface" className="inline-flex items-center gap-0.5 rounded-lg border border-rule bg-surface-sunk p-0.5">
      <button
        type="button"
        role="tab"
        aria-selected={surface === "writing"}
        onClick={() => onChange("writing")}
        className={cx(
          "inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
          surface === "writing" ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
        )}
      >
        <PenLine size={15} /> Write
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={surface === "build"}
        onClick={() => onChange("build")}
        className={cx(
          "inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
          surface === "build" ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
        )}
      >
        <Wand2 size={15} /> Build prompt
      </button>
    </div>
  );
}

function RecentWork({ onOpen }: { onOpen: (requestId: string) => void }) {
  const ws = useWorkspace();
  const docs = [...ws.workspace.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const builds = ws.workspace.requests
    .filter((r) => r.selectedMode === "build")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  if (!docs.length && !builds.length) return null;
  return (
    <div className="mt-8 space-y-2">
      <p className="eyebrow">Recent</p>
      {docs.map((d) => (
        <Link
          key={d.id}
          href={`/write?doc=${d.id}`}
          className="flex w-full items-center gap-3 rounded-md border border-rule bg-surface px-3.5 py-2.5 text-left shadow-card transition-colors hover:border-ink/20"
        >
          <span className="shrink-0 rounded-sm bg-signal-soft px-1.5 py-0.5 font-mono text-2xs uppercase text-signal-ink">doc</span>
          <span className="truncate text-[13px] text-ink-muted">{d.title || d.plainText.slice(0, 80) || "Untitled draft"}</span>
        </Link>
      ))}
      {builds.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r.id)}
          className="flex w-full items-center gap-3 rounded-md border border-rule bg-surface px-3.5 py-2.5 text-left shadow-card transition-colors hover:border-ink/20"
        >
          <span className="shrink-0 rounded-sm bg-rust-soft px-1.5 py-0.5 font-mono text-2xs uppercase text-rust-ink">build</span>
          <span className="truncate text-[13px] text-ink-muted">{r.text}</span>
        </button>
      ))}
    </div>
  );
}
