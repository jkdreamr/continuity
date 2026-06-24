"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Sparkles, RotateCcw, Loader2, Undo2 } from "lucide-react";
import type { ContractItem, DocumentBrief } from "@/types/continuity";
import { AXES, AXIS_ENDPOINTS, type AutoTuneRecommendation as Rec, type TuneVector } from "@/lib/writing/autoTune/types";
import { recommendWriting } from "@/lib/writing/autoTune/recommend";
import { quickActionsFor } from "@/lib/writing/autoTune/quickActions";
import { isNeutralVector, quantizeVector, vectorKey } from "@/lib/writing/autoTune/normalize";
import { TuneCache, tuneCacheKey, fnv1a } from "@/lib/writing/tuneCache";
import { tuneVectorInstruction, contractSummary } from "@/lib/writing/tunePrompts";
import { streamTune } from "@/lib/writing/agentClient";
import { tuneReceipt, type TuneReceipt } from "@/lib/writing/tuneReceipt";
import {
  browserStore,
  recordAccept,
  pendingProposal,
  acceptProposal,
  dismissProposal,
  applyPreferenceBias,
  vectorDirections,
  type PrefStore,
  type AxisDir,
} from "@/lib/writing/tunePreferences";
import { tuneDiffPlugin, tuneDiffKey, clearTuneDecos } from "@/components/continuity/writing/TuneDiff";
import { AutoTuneRecommendation } from "@/components/continuity/writing/AutoTuneRecommendation";
import { debugTuneEnabled, recordTiming, recentTimings, nowMs, type TuneTiming } from "@/lib/writing/tuneTiming";
import { cx } from "@/lib/cx";

/**
 * Live, direct-manipulation Selection Tune (V10). Three context-recommended
 * controls, Formality, Length, Naturalness. No Apply button. Three speeds:
 * instant UI, LRU cache, streamed provider rewrite. Every rewrite derives from
 * the ORIGINAL selection + current vector (stable base). One Undo restores it.
 */

type Base = { from: number; to: number; text: string; hash: string };
type Status = "idle" | "shaping" | "streaming" | "error" | "no_provider";

function fillVector(values: Partial<TuneVector>): TuneVector {
  return { formality: values.formality ?? 50, length: values.length ?? 50, naturalness: values.naturalness ?? 50 };
}

export function SelectionTune({
  editor,
  brief,
  providerConfigured,
  contractItems = [],
  modelId = "",
  recommendInstruction,
  voiceSummary,
  voiceDirectLowHype,
}: {
  editor: Editor;
  brief?: DocumentBrief;
  providerConfigured: boolean;
  contractItems?: ContractItem[];
  modelId?: string;
  recommendInstruction?: string;
  voiceSummary?: string;
  voiceDirectLowHype?: boolean;
}) {
  const [tuneOpen, setTuneOpen] = useState(false);
  const [vector, setVector] = useState<TuneVector>({ formality: 50, length: 50, naturalness: 50 });
  const [rec, setRec] = useState<Rec | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [chip, setChip] = useState(false);
  const [debugRows, setDebugRows] = useState<TuneTiming[]>([]);
  const [selText, setSelText] = useState("");
  const [receipt, setReceipt] = useState<TuneReceipt | null>(null);
  const [proposal, setProposal] = useState<{ dir: AxisDir; label: string; count: number } | null>(null);

  const vectorRef = useRef(vector);
  vectorRef.current = vector;
  const storeRef = useRef<PrefStore | null>(null);
  if (storeRef.current === null) storeRef.current = browserStore();

  const quickActions = useMemo(
    () => (selText ? quickActionsFor({ selection: selText, brief, contractItems }) : []),
    [selText, brief, contractItems],
  );

  const baseRef = useRef<Base | null>(null);
  const liveToRef = useRef(0);
  const lastTextRef = useRef("");
  const sessionRef = useRef(false);
  const selfEditingRef = useRef(false);
  const touchedRef = useRef(false);
  const counterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const cacheRef = useRef<TuneCache>(new TuneCache(80));
  const debug = useMemo(() => debugTuneEnabled(), []);

  // Register the transient-diff decoration plugin for this editor.
  useEffect(() => {
    editor.registerPlugin(tuneDiffPlugin());
    return () => {
      try {
        editor.unregisterPlugin(tuneDiffKey);
      } catch {
        /* editor may already be torn down */
      }
    };
  }, [editor]);

  // Commit on deselect; cancel on a genuine manual edit (doc change we didn't make).
  useEffect(() => {
    const onSelection = () => {
      if (!sessionRef.current || selfEditingRef.current) return;
      const sel = editor.state.selection;
      const base = baseRef.current;
      if (!base) return;
      if (sel.empty || sel.from < base.from || sel.to > liveToRef.current + 1) commitSession();
    };
    const onUpdate = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!sessionRef.current || selfEditingRef.current) return;
      if (!transaction.docChanged) return; // ignore decoration/selection-only transactions
      endSession();
    };
    const onSelText = () => {
      if (selfEditingRef.current) return;
      const { from, to } = editor.state.selection;
      setSelText(from === to ? "" : editor.state.doc.textBetween(from, to, " "));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sessionRef.current) cancelSession();
    };
    editor.on("selectionUpdate", onSelection);
    editor.on("selectionUpdate", onSelText);
    editor.on("update", onUpdate);
    window.addEventListener("keydown", onKey);
    return () => {
      editor.off("selectionUpdate", onSelection);
      editor.off("selectionUpdate", onSelText);
      editor.off("update", onUpdate);
      window.removeEventListener("keydown", onKey);
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  function captureBase(): boolean {
    const { from, to } = editor.state.selection;
    if (from === to) return false;
    const text = editor.state.doc.textBetween(from, to, " ");
    baseRef.current = { from, to, text, hash: fnv1a(text) };
    liveToRef.current = to;
    lastTextRef.current = text;
    sessionRef.current = true;
    touchedRef.current = false;
    return true;
  }

  function surrounding() {
    const base = baseRef.current!;
    const doc = editor.state.doc;
    return {
      before: doc.textBetween(Math.max(0, base.from - 300), base.from, "\n", " "),
      after: doc.textBetween(
        Math.min(doc.content.size, liveToRef.current),
        Math.min(doc.content.size, liveToRef.current + 300),
        "\n",
        " ",
      ),
    };
  }

  /** Replace the live span, keeping it selected and out of history; optional fade-in deco. */
  function writeLive(text: string, deco?: string) {
    const base = baseRef.current;
    if (!base) return;
    selfEditingRef.current = true;
    let tr = editor.state.tr.insertText(text, base.from, liveToRef.current);
    tr = tr.setSelection(TextSelection.create(tr.doc, base.from, base.from + text.length)).setMeta("addToHistory", false);
    if (deco) tr = tr.setMeta(tuneDiffKey, { type: "set", decos: [{ from: base.from, to: base.from + text.length, cls: deco }] });
    editor.view.dispatch(tr);
    selfEditingRef.current = false;
    liveToRef.current = base.from + text.length;
    lastTextRef.current = text;
    if (deco) {
      if (decoTimerRef.current) clearTimeout(decoTimerRef.current);
      decoTimerRef.current = setTimeout(() => {
        try {
          clearTuneDecos(editor.view);
        } catch {
          /* torn down */
        }
      }, 260);
    }
  }

  function setActiveTint() {
    const base = baseRef.current;
    if (!base) return;
    selfEditingRef.current = true;
    editor.view.dispatch(
      editor.state.tr.setMeta(tuneDiffKey, { type: "set", decos: [{ from: base.from, to: liveToRef.current, cls: "tune-active" }] }),
    );
    selfEditingRef.current = false;
  }

  function endSession() {
    sessionRef.current = false;
    baseRef.current = null;
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTuneOpen(false);
    setStatus("idle");
    setVector({ formality: 50, length: 50, naturalness: 50 });
    setRec(null);
    touchedRef.current = false;
    try {
      clearTuneDecos(editor.view);
    } catch {
      /* ignore */
    }
  }

  function commitSession() {
    const base = baseRef.current;
    if (!base) return endSession();
    const finalText = lastTextRef.current;
    if (!touchedRef.current || finalText === base.text) return endSession();
    selfEditingRef.current = true;
    const restore = editor.state.tr.insertText(base.text, base.from, liveToRef.current);
    restore.setMeta("addToHistory", false).setMeta(tuneDiffKey, { type: "clear" });
    editor.view.dispatch(restore);
    const apply = editor.state.tr.insertText(finalText, base.from, base.from + base.text.length);
    editor.view.dispatch(apply); // one recorded history step
    selfEditingRef.current = false;

    // V10: a meaningful-only receipt, and record the accepted direction. A one-off
    // adjustment is never persisted; only a repeated direction becomes a proposal.
    setReceipt(tuneReceipt({ original: base.text, final: finalText, contractItems }));
    if (storeRef.current) {
      recordAccept(storeRef.current, vectorDirections(vectorRef.current));
      setProposal(pendingProposal(storeRef.current));
    }
    endSession();
    showChip();
  }

  function cancelSession() {
    const base = baseRef.current;
    if (base && touchedRef.current && lastTextRef.current !== base.text) writeLive(base.text);
    endSession();
  }

  function showChip() {
    setChip(true);
    if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    chipTimerRef.current = setTimeout(() => setChip(false), 6000);
  }

  function undoTune() {
    editor.chain().focus().undo().run();
    setChip(false);
  }

  function pushTiming(t: TuneTiming) {
    recordTiming(t);
    if (debug) setDebugRows(recentTimings());
  }

  function applyStreaming(acc: string) {
    if (rafRef.current != null) return; // throttle to one paint
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      writeLive(acc);
    });
  }

  /** The three-speed rewrite. Always derives from the ORIGINAL selection. */
  async function runRewrite(vec: TuneVector) {
    const base = baseRef.current;
    if (!base) return;
    const quant = quantizeVector(vec);
    const startedAt = nowMs();

    if (isNeutralVector(quant)) {
      if (touchedRef.current && lastTextRef.current !== base.text) writeLive(base.text);
      setStatus("idle");
      return;
    }
    if (!providerConfigured) {
      setStatus("no_provider");
      pushTiming({ sessionId: base.hash, vectorKey: vectorKey(quant), interactionStartedAt: startedAt, uiUpdatedAt: nowMs(), source: "prompt-preview" });
      return;
    }

    const surround = surrounding();
    const key = tuneCacheKey({
      selectionHash: base.hash,
      surroundingHash: fnv1a(surround.before + "¦" + surround.after),
      contractHash: fnv1a(contractSummary(contractItems) || "-"),
      briefHash: fnv1a(JSON.stringify(brief ?? {})),
      vectorKey: vectorKey(quant),
      modelId,
    });

    const cached = cacheRef.current.get(key);
    if (cached !== undefined) {
      writeLive(cached, "tune-ins");
      setStatus("idle");
      pushTiming({ sessionId: base.hash, vectorKey: vectorKey(quant), interactionStartedAt: startedAt, uiUpdatedAt: nowMs(), cacheHitAt: nowMs(), settledAt: nowMs(), source: "cache" });
      return;
    }

    const reqId = ++counterRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("streaming");
    setActiveTint();
    const timing: TuneTiming = { sessionId: base.hash, vectorKey: vectorKey(quant), interactionStartedAt: startedAt, uiUpdatedAt: nowMs(), requestStartedAt: nowMs(), source: "provider" };

    const result = await streamTune(
      { selection: base.text, before: surround.before, after: surround.after, vector: quant, brief, contract: contractItems, voiceSummary },
      controller.signal,
      (acc) => {
        if (reqId !== counterRef.current || !sessionRef.current) return; // stale or ended
        if (timing.firstChunkAt == null) timing.firstChunkAt = nowMs();
        applyStreaming(acc);
      },
    );

    if (reqId !== counterRef.current || !sessionRef.current) return; // a newer drag superseded this
    if (result.ok && result.text) {
      cacheRef.current.set(key, result.text);
      writeLive(result.text, "tune-ins");
      setStatus("idle");
      timing.finalChunkAt = nowMs();
      timing.settledAt = nowMs();
      pushTiming(timing);
    } else if (result.ok === false && result.error === "not_configured") {
      setStatus("no_provider");
    } else if (result.ok === false && result.error !== "aborted") {
      setStatus("error");
    }
  }

  function scheduleRewrite(vec: TuneVector, flush = false) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (flush) {
      void runRewrite(vec);
      return;
    }
    debounceRef.current = setTimeout(() => void runRewrite(vec), 120);
  }

  function onSlider(axis: (typeof AXES)[number], value: number) {
    const next = { ...vector, [axis]: value };
    setVector(next);
    touchedRef.current = true;
    if (rec && !rec.userOverride) setRec({ ...rec, userOverride: true });
    setStatus("shaping");
    setActiveTint(); // instant UI; never waits for the provider
    scheduleRewrite(next);
  }

  function openTune() {
    if (!captureBase()) return;
    const base = baseRef.current!;
    const recommendation = recommendWriting({
      instruction: recommendInstruction,
      brief,
      contractItems,
      selection: base.text,
      voiceDirectLowHype,
    });
    const values = storeRef.current ? applyPreferenceBias(storeRef.current, recommendation.values) : recommendation.values;
    setRec({ ...recommendation, values });
    setVector(fillVector(values));
    setStatus("idle");
    setTuneOpen(true);
  }

  function onReset() {
    if (!rec) return;
    const v = fillVector(rec.values);
    setVector(v);
    if (touchedRef.current && baseRef.current && lastTextRef.current !== baseRef.current.text) writeLive(baseRef.current.text);
    touchedRef.current = false;
    setRec({ ...rec, userOverride: false });
    setStatus("idle");
    try {
      clearTuneDecos(editor.view);
    } catch {
      /* ignore */
    }
  }

  function onQuick(qa: { vector: Partial<TuneVector> }) {
    if (!sessionRef.current && !captureBase()) return;
    const base = baseRef.current!;
    if (!rec) {
      setRec(recommendWriting({ instruction: recommendInstruction, brief, contractItems, selection: base.text, voiceDirectLowHype }));
    }
    const next = { ...vector, ...qa.vector };
    setVector(next);
    touchedRef.current = true;
    setTuneOpen(true);
    setActiveTint();
    scheduleRewrite(next, true);
  }

  const previewInstruction = tuneVectorInstruction(vector);

  return (
    <>
      {chip && (
        <div className="fixed inset-x-0 bottom-5 z-50 mx-auto w-fit max-w-md rounded-lg border border-rule bg-ink px-3.5 py-2 text-paper shadow-lift">
          {receipt ? (
            <div className="flex items-start gap-3">
              <div className="min-w-0 space-y-0.5 text-2xs leading-relaxed">
                {receipt.kept.map((k, i) => (
                  <div key={i}>
                    <span className="font-semibold text-paper/60">Kept</span> {k}
                  </div>
                ))}
                {receipt.changed.length > 0 && (
                  <div>
                    <span className="font-semibold text-paper/60">Changed</span> {receipt.changed.join(", ")}
                  </div>
                )}
              </div>
              <button type="button" onClick={undoTune} className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-paper/90 hover:text-paper">
                <Undo2 size={12} /> Undo
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xs font-medium">Tuned from suggested settings</span>
              <button type="button" onClick={undoTune} className="inline-flex items-center gap-1 text-2xs font-semibold text-paper/90 hover:text-paper">
                <Undo2 size={12} /> Undo
              </button>
            </div>
          )}
        </div>
      )}

      {proposal && (
        <div className="fixed inset-x-0 bottom-[5.5rem] z-50 mx-auto flex w-fit max-w-md items-center gap-3 rounded-lg border border-rule bg-surface px-3.5 py-2 shadow-lift">
          <span className="text-2xs text-ink-muted">You often {proposal.label}. Make it your default?</span>
          <button
            type="button"
            onClick={() => {
              if (storeRef.current) acceptProposal(storeRef.current, proposal.dir);
              setProposal(null);
            }}
            className="shrink-0 text-2xs font-semibold text-signal hover:underline"
          >
            Set default
          </button>
          <button
            type="button"
            onClick={() => {
              if (storeRef.current) dismissProposal(storeRef.current, proposal.dir);
              setProposal(null);
            }}
            className="shrink-0 text-2xs font-medium text-ink-muted hover:text-ink"
          >
            Not now
          </button>
        </div>
      )}

      {debug && debugRows.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-md border border-rule bg-surface/95 p-2 font-mono text-[10px] text-ink-muted shadow-lift">
          <div className="mb-1 font-semibold text-ink">debugTune</div>
          {debugRows.map((t, i) => (
            <div key={i} className="truncate">
              {t.source} · {t.vectorKey} ·{" "}
              {t.source === "provider"
                ? `first ${fmt(t.firstChunkAt, t.requestStartedAt)} settle ${fmt(t.settledAt, t.requestStartedAt)}`
                : t.source === "cache"
                  ? "instant"
                  : "preview"}
            </div>
          ))}
        </div>
      )}

      <BubbleMenu
        editor={editor}
        tippyOptions={{
          duration: 120,
          maxWidth: 420,
          placement: "top",
          onHidden: () => sessionRef.current && commitSession(),
        }}
        shouldShow={({ state }) => !state.selection.empty}
        className="w-[min(92vw,400px)]"
      >
        <div className="rounded-lg border border-rule bg-surface shadow-lift">
          {!tuneOpen ? (
            <div className="flex flex-wrap items-center gap-0.5 p-1">
              {quickActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onQuick(a)}
                  className="rounded px-2.5 py-1.5 text-[13px] font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink"
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                onClick={openTune}
                className="ml-0.5 inline-flex items-center gap-1 rounded bg-surface-sunk px-2.5 py-1.5 text-[13px] font-medium text-ink hover:bg-rule/40"
              >
                <Sparkles size={13} className="text-signal" /> Tune
              </button>
            </div>
          ) : (
            <div className="w-[min(92vw,380px)] p-3">
              {rec && <AutoTuneRecommendation rec={rec} brief={brief} values={vector} onReset={onReset} />}

              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow inline-flex items-center gap-1.5">
                  Tune
                  {(status === "streaming" || status === "shaping") && <Loader2 size={11} className="animate-spin text-signal" />}
                </span>
                <span className="text-2xs text-ink-faint">
                  {status === "streaming" ? "Shaping from your original" : "Applies as you drag"}
                </span>
              </div>

              <div className="space-y-3">
                {AXES.map((axis) => {
                  const ep = AXIS_ENDPOINTS[axis];
                  return (
                    <div key={axis}>
                      <div className="mb-1 flex items-center justify-between text-2xs">
                        <span className="font-semibold text-ink">{ep.label}</span>
                        <span className="text-ink-faint">
                          {ep.low} · {ep.high}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={vector[axis]}
                        aria-label={`${ep.label}: ${ep.low} to ${ep.high}`}
                        onChange={(e) => onSlider(axis, Number(e.target.value))}
                        onPointerUp={() => touchedRef.current && scheduleRewrite(vector, true)}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-signal"
                      />
                    </div>
                  );
                })}
              </div>

              {status === "no_provider" && (
                <div className="mt-2.5 rounded border border-rule bg-surface-sunk px-2.5 py-2">
                  <p className="text-2xs font-medium text-ink-muted">No provider configured. This is the exact target it would send. Nothing is faked.</p>
                  <p className="mt-1 text-2xs text-ink-faint">→ {previewInstruction}</p>
                </div>
              )}
              {status === "error" && <p className="mt-2 text-2xs text-rust-ink">The provider hit an error. Drag again to retry.</p>}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={cancelSession} className="inline-flex items-center gap-1 text-2xs text-ink-muted hover:text-ink">
                  <RotateCcw size={12} /> Keep original
                </button>
                <button type="button" onClick={commitSession} className="rounded bg-signal px-2.5 py-1 text-2xs font-semibold text-white hover:bg-signal-ink">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </BubbleMenu>
    </>
  );
}

function fmt(end?: number, start?: number): string {
  if (end == null || start == null) return "·";
  return `${Math.max(0, Math.round(end - start))}ms`;
}
