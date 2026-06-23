"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "next/link";
import { ArrowLeft, Sparkles, Check, X, Eye } from "lucide-react";
import type { ContextPack, DocumentBrief, DocumentInsight, WritingDocument } from "@/types/continuity";
import { selectContextMix } from "@/lib/contextMix";
import { inferBrief } from "@/lib/writing/documentBrief";
import { requestCompletion, requestInsights } from "@/lib/writing/agentClient";
import { cx } from "@/lib/cx";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { ContextDrawer } from "@/components/continuity/ContextDrawer";
import { UsingLine } from "@/components/continuity/UsingLine";
import { GhostCompletion } from "@/components/continuity/writing/GhostCompletion";
import { DocumentBriefBar } from "@/components/continuity/writing/DocumentBriefBar";
import { SelectionTune } from "@/components/continuity/writing/SelectionTune";

const LIVE_HELP_SEEN = "continuity.livehelp.disclosed";

export function DocumentEditor({ doc }: { doc: WritingDocument }) {
  const ws = useWorkspace();
  const providerConfigured = Boolean(ws.providerStatus?.configured);

  const [title, setTitle] = useState(doc.title);
  const [whatFor, setWhatFor] = useState("");
  const [brief, setBrief] = useState<DocumentBrief | undefined>(doc.brief);
  const [liveHelp, setLiveHelp] = useState(doc.liveHelpEnabled);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [plainText, setPlainText] = useState(doc.plainText);
  const [insights, setInsights] = useState<DocumentInsight[]>([]);
  const [suppressed, setSuppressed] = useState<Set<string>>(new Set());
  const [showDisclosure, setShowDisclosure] = useState(false);

  // Live refs for the ghost extension's static-option closures.
  const briefRef = useRef(brief);
  const liveHelpRef = useRef(liveHelp);
  const providerRef = useRef(providerConfigured);
  const memoryRef = useRef<string[]>([]);
  briefRef.current = brief;
  liveHelpRef.current = liveHelp;
  providerRef.current = providerConfigured;

  const packs = ws.workspace.packs;
  const briefText = useMemo(() => [whatFor, brief?.goal, plainText].filter(Boolean).join(" "), [whatFor, brief, plainText]);
  const mix = useMemo(
    () =>
      selectContextMix(
        {
          text: briefText,
          mode: "writing",
          includeIds: doc.activeMemoryOverrides.includeIds,
          excludeIds: doc.activeMemoryOverrides.excludeIds,
        },
        packs,
      ),
    [briefText, packs, doc.activeMemoryOverrides],
  );
  const activePacks = useMemo(
    () => mix.applied.map((a) => packs.find((p) => p.id === a.contextId)).filter(Boolean) as ContextPack[],
    [mix.applied, packs],
  );
  memoryRef.current = activePacks.map((p) => `${p.name}: ${p.summary}`);
  const atoms = activePacks.slice(0, 3).map((p) => (p.kind === "voice" ? "Your voice" : p.name));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      GhostCompletion.configure({
        idleMs: 550,
        getEnabled: () => liveHelpRef.current && providerRef.current,
        complete: ({ before, after, signal }) =>
          requestCompletion(
            { beforeCursor: before, afterCursor: after, brief: briefRef.current, activeMemory: memoryRef.current },
            signal,
          ),
      }),
    ],
    content: (doc.contentJson as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: { class: "tiptap-prose focus:outline-none", "aria-label": "Document editor" },
    },
    onUpdate: ({ editor }) => scheduleSave(editor),
  });

  // Autosave (debounced) — content, title, brief, version.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(ed: Editor) {
    const text = ed.getText();
    setPlainText(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ws.updateDocument(doc.id, {
        title,
        contentJson: ed.getJSON(),
        plainText: text,
        brief,
        liveHelpEnabled: liveHelp,
        version: doc.version + 1,
      });
    }, 450);
  }

  // Persist title / brief / liveHelp changes.
  useEffect(() => {
    const t = setTimeout(() => ws.updateDocument(doc.id, { title, brief, liveHelpEnabled: liveHelp }), 300);
    return () => clearTimeout(t);
  }, [title, brief, liveHelp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brief inference: user-stated "what is this for" wins; otherwise infer from
  // document text after enough signal. Never auto-applies at low confidence.
  useEffect(() => {
    if (whatFor.trim().length > 4) {
      const b = inferBrief(whatFor, { userStated: true });
      if (b.confidence !== "low") setBrief(b);
      return;
    }
    if (!brief && plainText.trim().length > 120) {
      const b = inferBrief(plainText, { userStated: false });
      if (b.confidence !== "low") setBrief(b);
    }
  }, [whatFor, plainText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sparse insights: debounced, only when live help + provider are on.
  useEffect(() => {
    if (!liveHelp || !providerConfigured || plainText.trim().length < 60) {
      setInsights([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      const result = await requestInsights({ text: plainText, brief, dismissedKinds: [...suppressed] }, controller.signal);
      setInsights(result.filter((i) => !suppressed.has(i.kind)).slice(0, 3));
    }, 1800);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [plainText, liveHelp, providerConfigured, brief, suppressed]);

  function toggleLiveHelp() {
    if (!liveHelp && providerConfigured && typeof window !== "undefined" && !window.localStorage.getItem(LIVE_HELP_SEEN)) {
      setShowDisclosure(true);
      window.localStorage.setItem(LIVE_HELP_SEEN, "1");
    }
    setLiveHelp((v) => !v);
  }

  function applyInsight(insight: DocumentInsight) {
    if (!editor || !insight.proposedText) return;
    const original = plainText.slice(insight.from, insight.to);
    const range = findTextRange(editor, original);
    if (!range) return;
    editor.chain().focus().insertContentAt(range, insight.proposedText).run();
    setInsights((list) => list.filter((i) => i.id !== insight.id));
  }

  function overrideMemory(packId: string, action: "include" | "exclude" | "clear") {
    const include = new Set(doc.activeMemoryOverrides.includeIds);
    const exclude = new Set(doc.activeMemoryOverrides.excludeIds);
    include.delete(packId);
    exclude.delete(packId);
    if (action === "include") include.add(packId);
    if (action === "exclude") exclude.add(packId);
    ws.updateDocument(doc.id, { activeMemoryOverrides: { includeIds: [...include], excludeIds: [...exclude] } });
  }

  const available = packs.filter(
    (p) =>
      (p.mode === "both" || p.mode === "writing") &&
      !mix.applied.some((a) => a.contextId === p.id) &&
      !mix.suggestions.some((a) => a.contextId === p.id) &&
      !doc.activeMemoryOverrides.excludeIds.includes(p.id),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link href="/" aria-label="Back to Now" className="-ml-1.5 rounded p-1.5 text-ink-muted hover:bg-surface-sunk hover:text-ink">
          <ArrowLeft size={18} />
        </Link>
        <button
          type="button"
          onClick={toggleLiveHelp}
          aria-pressed={liveHelp}
          className={cx(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors",
            liveHelp ? "border-signal/30 bg-signal-soft text-signal-ink" : "border-rule bg-surface text-ink-muted",
          )}
        >
          <Sparkles size={13} /> Live help: {liveHelp ? "On" : "Off"}
        </button>
      </div>
      <div className="mb-4 min-w-0">
        <UsingLine atoms={atoms} onOpen={() => setDrawerOpen(true)} />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled draft"
        aria-label="Title"
        className="w-full bg-transparent font-display text-3xl tracking-tight text-ink placeholder:text-ink-faint focus:outline-none"
      />

      <input
        value={whatFor}
        onChange={(e) => setWhatFor(e.target.value)}
        placeholder="What is this for? (optional)"
        aria-label="What is this for"
        className="mt-2 w-full bg-transparent text-[14px] text-ink-muted placeholder:text-ink-faint focus:outline-none"
      />

      {brief && (
        <div className="mt-3">
          <DocumentBriefBar
            brief={brief}
            onChange={setBrief}
            onAccept={() => setBrief({ ...brief, confidence: "high" })}
            onDismiss={() => setBrief(undefined)}
          />
        </div>
      )}

      <div className="mt-4 border-t border-rule pt-4">
        {editor && <SelectionTune editor={editor} brief={brief} providerConfigured={providerConfigured} />}
        <EditorContent editor={editor} />
      </div>

      {!providerConfigured && liveHelp && (
        <p className="mt-4 rounded-md border border-rule bg-surface-sunk px-3 py-2 text-2xs text-ink-muted">
          Live help is on, but no AI provider is configured — ghost completions and insights stay off until a server key is
          set. Selection Tune still shows the exact prompt it would send. Nothing is faked.
        </p>
      )}

      {insights.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="eyebrow">Worth a look</p>
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onApply={() => applyInsight(insight)}
              onDismiss={() => setInsights((l) => l.filter((i) => i.id !== insight.id))}
              onSuppress={() => {
                setSuppressed((s) => new Set(s).add(insight.kind));
                setInsights((l) => l.filter((i) => i.kind !== insight.kind));
              }}
            />
          ))}
        </div>
      )}

      <ContextDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        applied={mix.applied}
        suggestions={mix.suggestions}
        available={available}
        packs={packs}
        onOverride={overrideMemory}
      />

      {showDisclosure && (
        <div className="fixed inset-x-0 bottom-5 z-50 mx-auto w-[min(92vw,28rem)] rounded-lg border border-rule bg-ink px-4 py-3 text-paper shadow-lift">
          <p className="text-[13px] leading-relaxed">
            Live help sends the text near your cursor to your selected model so it can suggest a completion or revision.
          </p>
          <div className="mt-2 text-right">
            <button type="button" onClick={() => setShowDisclosure(false)} className="text-2xs font-semibold text-paper/80 hover:text-paper">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  onApply,
  onDismiss,
  onSuppress,
}: {
  insight: DocumentInsight;
  onApply: () => void;
  onDismiss: () => void;
  onSuppress: () => void;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="rounded-md border border-rule bg-surface px-3.5 py-2.5 shadow-card">
      <p className="text-[13px] font-medium text-ink">{insight.message}</p>
      <p className="mt-0.5 text-2xs text-ink-muted">{insight.rationale}</p>
      {preview && insight.proposedText && (
        <p className="mt-2 rounded border border-signal/30 bg-signal-soft px-2.5 py-1.5 text-[13px] text-ink">{insight.proposedText}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {insight.proposedText && (
          <>
            <button type="button" onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-2xs font-medium text-ink-muted hover:text-ink">
              <Eye size={12} /> Preview
            </button>
            <button type="button" onClick={onApply} className="inline-flex items-center gap-1 rounded bg-signal px-2 py-0.5 text-2xs font-semibold text-white hover:bg-signal-ink">
              <Check size={12} /> Apply
            </button>
          </>
        )}
        <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1 text-2xs font-medium text-ink-muted hover:text-ink">
          <X size={12} /> Dismiss
        </button>
        <button type="button" onClick={onSuppress} className="text-2xs font-medium text-ink-faint hover:text-ink-muted">
          Not for this document
        </button>
      </div>
    </div>
  );
}

/** Map a plain-text slice to a ProseMirror range (same-block matches). */
function findTextRange(editor: Editor, query: string): { from: number; to: number } | null {
  if (!query.trim()) return null;
  const nodes: { from: number; text: string }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) nodes.push({ from: pos, text: node.text });
  });
  const full = nodes.map((n) => n.text).join("");
  const idx = full.indexOf(query);
  if (idx < 0) return null;
  let acc = 0;
  let from: number | null = null;
  let to: number | null = null;
  for (const n of nodes) {
    const start = acc;
    const end = acc + n.text.length;
    if (from === null && idx >= start && idx <= end) from = n.from + (idx - start);
    const endIdx = idx + query.length;
    if (to === null && endIdx >= start && endIdx <= end) {
      to = n.from + (endIdx - start);
      break;
    }
    acc = end;
  }
  return from !== null && to !== null ? { from, to } : null;
}
