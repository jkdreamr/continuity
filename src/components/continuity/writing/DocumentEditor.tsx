"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "next/link";
import { ArrowLeft, Sparkles, Check, X, Eye, ScrollText } from "lucide-react";
import type { ContextPack, ContractItem, DocumentBrief, DocumentInsight, WritingDocument } from "@/types/continuity";
import { selectContextMix } from "@/lib/contextMix";
import { inferBrief } from "@/lib/writing/documentBrief";
import { requestCompletion, requestInsights } from "@/lib/writing/agentClient";
import { mergeInsights } from "@/lib/writing/insights";
import { detectContinuityInsights } from "@/lib/writing/continuityInsights";
import { packsToContractItems } from "@/lib/contracts/buildBrief";
import { buildContextContract } from "@/lib/contracts/buildContextContract";
import { makeContractItem } from "@/lib/contracts/extractContractItems";
import { contractKindMeta } from "@/lib/contracts/contractMeta";
import { ACCENT } from "@/lib/accent";
import { cx } from "@/lib/cx";
import { useToast } from "@/components/ui/Toast";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { ContextDrawer } from "@/components/continuity/ContextDrawer";
import { ContextContractDrawer } from "@/components/continuity/contracts/ContextContractDrawer";
import { UsingLine } from "@/components/continuity/UsingLine";
import { GhostCompletion } from "@/components/continuity/writing/GhostCompletion";
import { DocumentBriefBar } from "@/components/continuity/writing/DocumentBriefBar";
import { SelectionTune } from "@/components/continuity/writing/SelectionTune";

const LIVE_HELP_SEEN = "continuity.livehelp.disclosed";

export function DocumentEditor({ doc }: { doc: WritingDocument }) {
  const ws = useWorkspace();
  const { toast } = useToast();
  const providerConfigured = Boolean(ws.providerStatus?.configured);

  const [title, setTitle] = useState(doc.title);
  const [whatFor, setWhatFor] = useState("");
  const [brief, setBrief] = useState<DocumentBrief | undefined>(doc.brief);
  const [liveHelp, setLiveHelp] = useState(doc.liveHelpEnabled);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
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

  // The contract this document is accountable to: active packs projected into
  // contract items, plus any contract already attached to the document.
  const contractItems = useMemo<ContractItem[]>(() => {
    const fromPacks = packsToContractItems(activePacks);
    const attached = (doc.contractIds ?? [])
      .map((id) => ws.workspace.contracts.find((c) => c.id === id))
      .filter(Boolean)
      .flatMap((c) => c!.items.filter((i) => i.status !== "rejected"));
    return [...fromPacks, ...attached];
  }, [activePacks, doc.contractIds, ws.workspace.contracts]);

  // The durable contract attached to this document (commitments/assumptions saved
  // from insights). Distinct from the ephemeral pack projection above.
  const docContract = useMemo(
    () => (doc.contractIds ?? []).map((id) => ws.workspace.contracts.find((c) => c.id === id)).filter(Boolean)[0] ?? null,
    [doc.contractIds, ws.workspace.contracts],
  );
  const contractCount = docContract?.items.filter((i) => i.status !== "rejected").length ?? 0;

  // Approved-voice context for AutoTune (a starting-posture nudge, never durable).
  const voicePack = activePacks.find((p) => p.kind === "voice");
  const voiceSummary = voicePack?.summary || undefined;
  const voiceDirectLowHype = Boolean(
    voicePack && /\b(direct|low-?hype|plain|specific|avoid (inflated|hype|generic)|no hype)\b/i.test(`${voicePack.summary} ${voicePack.details}`),
  );
  const tuneModelId = ws.providerStatus?.fastModel ?? ws.providerStatus?.model ?? "";

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
      // Keep Grammarly/LanguageTool out of the ProseMirror DOM, their injected
      // nodes break React/PM reconciliation (the "insertBefore" crash).
      attributes: {
        class: "tiptap-prose focus:outline-none",
        "aria-label": "Document editor",
        "data-gramm": "false",
        "data-gramm_editor": "false",
        "data-enable-grammarly": "false",
      },
    },
    onUpdate: ({ editor }) => scheduleSave(editor),
  });

  // Autosave (debounced), content, title, brief, version.
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

  // Continuity insights. The deterministic detector runs locally and offline so
  // the baseline is honest with no key; a provider, when on, only enriches it.
  useEffect(() => {
    if (plainText.trim().length < 40) {
      setInsights([]);
      return;
    }
    const local = detectContinuityInsights(plainText, { contract: contractItems }).filter(
      (i) => !suppressed.has(i.kind),
    );
    setInsights(local.slice(0, 3));

    if (!liveHelp || !providerConfigured) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      const remote = await requestInsights(
        { text: plainText, brief, contract: contractItems.map((i) => i.statement), dismissedKinds: [...suppressed] },
        controller.signal,
      );
      setInsights(mergeInsights(local, remote.filter((i) => !suppressed.has(i.kind))));
    }, 1800);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [plainText, liveHelp, providerConfigured, brief, suppressed, contractItems]);

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

  // Persist a contract item derived from an insight, attached to this document.
  function saveItemFromInsight(item: ContractItem) {
    const existingId = doc.contractIds?.[0];
    const existing = existingId ? ws.workspace.contracts.find((c) => c.id === existingId) : undefined;
    if (existing) {
      ws.addContractItem(existing.id, item);
    } else {
      const c = buildContextContract({ name: title.trim() || "Document contract", taskType: "writing", items: [item] });
      ws.saveContract(c);
      ws.attachToDocument(doc.id, { contractId: c.id });
    }
  }

  // Move the cursor to the insight's range so the user can fix it in place.
  function jumpToInsight(insight: DocumentInsight) {
    if (!editor) return;
    const range = findTextRange(editor, plainText.slice(insight.from, insight.to));
    if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  }

  // The single safe action carried by each insight.
  function actOnInsight(insight: DocumentInsight) {
    if (insight.proposedText) return applyInsight(insight);
    const span = plainText.slice(insight.from, insight.to);
    if (insight.kind === "accidental_commitment") {
      saveItemFromInsight(makeContractItem("commitment", insight.evidence ?? span, "high", { source: "document" }));
      toast("Commitment saved to your contract");
      setInsights((l) => l.filter((i) => i.id !== insight.id));
      return;
    }
    if (insight.kind === "unsupported_specificity") {
      saveItemFromInsight(makeContractItem("approved_fact", span, "low", { source: "document" }));
      toast("Marked as an assumption");
      setInsights((l) => l.filter((i) => i.id !== insight.id));
      return;
    }
    // contradiction / overpromise / buried ask → jump to the spot to fix it.
    jumpToInsight(insight);
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
      <div className="reveal reveal-1 mb-2 flex items-center justify-between gap-2">
        <Link href="/" aria-label="Back to Now" className="-ml-1.5 rounded p-1.5 text-ink-muted hover:bg-surface-sunk hover:text-ink">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          {contractCount > 0 && (
            <button
              type="button"
              onClick={() => setContractOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rule bg-surface px-2.5 py-1 text-[13px] font-medium text-ink-muted hover:text-ink"
            >
              <ScrollText size={13} /> Contract · {contractCount}
            </button>
          )}
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
      </div>
      <div className="reveal reveal-2 mb-4 min-w-0">
        <UsingLine atoms={atoms} onOpen={() => setDrawerOpen(true)} />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled draft"
        aria-label="Title"
        className="reveal reveal-3 w-full bg-transparent font-display text-3xl tracking-tight text-ink placeholder:text-ink-faint focus:outline-none"
      />

      <input
        value={whatFor}
        onChange={(e) => setWhatFor(e.target.value)}
        placeholder="What is this for? (optional)"
        aria-label="What is this for"
        className="reveal reveal-3 mt-2 w-full bg-transparent text-[14px] text-ink-muted placeholder:text-ink-faint focus:outline-none"
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

      <div className="reveal reveal-4 mt-4 border-t border-rule pt-4">
        {editor && (
          <SelectionTune
            editor={editor}
            brief={brief}
            providerConfigured={providerConfigured}
            contractItems={contractItems}
            modelId={tuneModelId}
            recommendInstruction={whatFor}
            voiceSummary={voiceSummary}
            voiceDirectLowHype={voiceDirectLowHype}
          />
        )}
        <EditorContent editor={editor} />
      </div>

      {!providerConfigured && liveHelp && (
        <p className="mt-4 rounded-md border border-rule bg-surface-sunk px-3 py-2 text-2xs text-ink-muted">
          Continuity checks run locally, commitments, contradictions, and overpromises are flagged with no
          provider key. Ghost completions and AI rewrites stay off until a server key is set; the sliders still
          show the exact prompt they would send. Nothing is faked.
        </p>
      )}

      {insights.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="eyebrow">Continuity check</p>
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAct={() => actOnInsight(insight)}
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

      <ContextContractDrawer
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        contract={docContract}
        onUpdateItem={(itemId, patch) => docContract && ws.updateContractItem(docContract.id, itemId, patch)}
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

const INSIGHT_LABEL: Record<DocumentInsight["kind"], string> = {
  unclear_ask: "Unclear ask",
  accidental_commitment: "Commitment",
  unsupported_specificity: "Unsupported",
  contradicts_contract: "Contradiction",
  missing_context: "Missing context",
  relationship_mismatch: "Relationship",
  decision_drift: "Decision drift",
  overpromise: "Overpromise",
};

const SEVERITY_ACCENT: Record<DocumentInsight["severity"], keyof typeof ACCENT> = {
  high: "rust",
  medium: "signal",
  low: "ink",
};

function InsightCard({
  insight,
  onAct,
  onDismiss,
  onSuppress,
}: {
  insight: DocumentInsight;
  onAct: () => void;
  onDismiss: () => void;
  onSuppress: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const accent = ACCENT[SEVERITY_ACCENT[insight.severity]];
  return (
    <div className="rounded-md border border-rule bg-surface px-3.5 py-2.5 shadow-card">
      <div className="flex items-start gap-2">
        <span className={cx("mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-2xs font-medium", accent.soft)}>
          {INSIGHT_LABEL[insight.kind]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">{insight.message}</p>
          <p className="mt-0.5 text-2xs text-ink-muted">{insight.rationale}</p>
        </div>
      </div>
      {preview && insight.proposedText && (
        <p className="mt-2 rounded border border-signal/30 bg-signal-soft px-2.5 py-1.5 text-[13px] text-ink">{insight.proposedText}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[3.25rem]">
        {insight.proposedText && (
          <button type="button" onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-2xs font-medium text-ink-muted hover:text-ink">
            <Eye size={12} /> Preview
          </button>
        )}
        <button type="button" onClick={onAct} className="inline-flex items-center gap-1 rounded bg-signal px-2 py-0.5 text-2xs font-semibold text-white hover:bg-signal-ink">
          <Check size={12} /> {insight.safeAction ?? "Apply"}
        </button>
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
