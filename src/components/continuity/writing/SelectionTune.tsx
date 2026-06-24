"use client";

import { useEffect, useRef, useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Sparkles, RotateCcw, Loader2, Undo2 } from "lucide-react";
import type { DocumentBrief, DocumentKind } from "@/types/continuity";
import {
  tuneTemplate,
  defaultAxisValues,
  buildTransformInstruction,
  isNeutral,
  QUICK_ACTIONS,
} from "@/lib/writing/tuneTemplates";
import { requestTransform } from "@/lib/writing/agentClient";
import { cx } from "@/lib/cx";

/**
 * Direct-manipulation Selection Tune (V8). There is NO Apply button: moving a
 * slider rewrites the selected passage live, in place.
 *
 * Invariants:
 *  - Original-base: every transform rewrites the ORIGINAL selection, never the
 *    previous result, so dragging back and forth is stable.
 *  - Single undo: intermediate live writes are kept OUT of history
 *    (addToHistory:false). On commit we restore the original (no history) then
 *    apply the final text as one history step — so one Undo returns to the
 *    original, not through every drag.
 *  - Latest wins: a request counter discards stale provider responses.
 *  - Manual edits cancel the session; deselecting commits it.
 *  - No provider → no mutation; the slider shows the exact prompt it would send.
 */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

type Base = { from: number; to: number; text: string; hash: string };
type Status = "idle" | "loading" | "error" | "no_provider";

export function SelectionTune({
  editor,
  brief,
  providerConfigured,
}: {
  editor: Editor;
  brief?: DocumentBrief;
  providerConfigured: boolean;
}) {
  const kind: DocumentKind = brief?.kind ?? "other";
  const template = tuneTemplate(kind);

  const [tuneOpen, setTuneOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(() => defaultAxisValues(template));
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [chip, setChip] = useState(false);

  const baseRef = useRef<Base | null>(null);
  const liveToRef = useRef(0);
  const lastTextRef = useRef("");
  const sessionRef = useRef(false);
  const selfEditingRef = useRef(false);
  const counterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit on deselect; cancel (keep their text) on a genuine manual edit.
  useEffect(() => {
    const onSelection = () => {
      if (!sessionRef.current || selfEditingRef.current) return;
      const sel = editor.state.selection;
      const base = baseRef.current;
      if (!base) return;
      if (sel.empty || sel.from < base.from || sel.to > liveToRef.current + 1) commitSession();
    };
    const onUpdate = () => {
      if (!sessionRef.current || selfEditingRef.current) return;
      endSession(); // the user typed — stop managing, keep what's on screen
    };
    editor.on("selectionUpdate", onSelection);
    editor.on("update", onUpdate);
    return () => {
      editor.off("selectionUpdate", onSelection);
      editor.off("update", onUpdate);
    };
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  function captureBase(): boolean {
    const { from, to } = editor.state.selection;
    if (from === to) return false;
    const text = editor.state.doc.textBetween(from, to, " ");
    baseRef.current = { from, to, text, hash: hash(text) };
    liveToRef.current = to;
    lastTextRef.current = text;
    sessionRef.current = true;
    return true;
  }

  function surrounding() {
    const base = baseRef.current!;
    const doc = editor.state.doc;
    return {
      before: doc.textBetween(Math.max(0, base.from - 200), base.from, "\n", " "),
      after: doc.textBetween(Math.min(doc.content.size, liveToRef.current), Math.min(doc.content.size, liveToRef.current + 200), "\n", " "),
    };
  }

  /** Replace the live span with `text`, keeping it selected and out of history. */
  function writeLive(text: string) {
    const base = baseRef.current;
    if (!base) return;
    selfEditingRef.current = true;
    const tr = editor.state.tr.insertText(text, base.from, liveToRef.current);
    tr.setSelection(TextSelection.create(tr.doc, base.from, base.from + text.length));
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
    selfEditingRef.current = false;
    liveToRef.current = base.from + text.length;
    lastTextRef.current = text;
  }

  function endSession() {
    sessionRef.current = false;
    baseRef.current = null;
    abortRef.current?.abort();
    setTuneOpen(false);
    setStatus("idle");
    setValues(defaultAxisValues(template));
    setInstruction("");
  }

  /** Restore the original and re-apply the final as a SINGLE undoable step. */
  function commitSession() {
    const base = baseRef.current;
    if (!base) return endSession();
    const finalText = lastTextRef.current;
    if (finalText === base.text) return endSession();
    selfEditingRef.current = true;
    const restore = editor.state.tr.insertText(base.text, base.from, liveToRef.current);
    restore.setMeta("addToHistory", false);
    editor.view.dispatch(restore);
    const apply = editor.state.tr.insertText(finalText, base.from, base.from + base.text.length);
    editor.view.dispatch(apply); // default: recorded in history (one step)
    selfEditingRef.current = false;
    endSession();
    showChip();
  }

  function cancelSession() {
    const base = baseRef.current;
    if (base && lastTextRef.current !== base.text) writeLive(base.text);
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

  async function runLive(instr: string, neutral: boolean) {
    const base = baseRef.current;
    if (!base) return;
    if (neutral) {
      if (providerConfigured) writeLive(base.text); // back to neutral → original
      setStatus("idle");
      return;
    }
    if (!providerConfigured) {
      setStatus("no_provider"); // show the prompt; never fake an edit
      return;
    }
    const reqId = ++counterRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    const result = await requestTransform(
      {
        selection: { from: base.from, to: base.to, text: base.text },
        surroundingContext: surrounding(),
        instruction: instr,
        brief,
        baseSelectionHash: base.hash,
      },
      controller.signal,
    );
    if (reqId !== counterRef.current) return; // a newer drag superseded this
    if (result.ok) {
      writeLive(result.replacement);
      setStatus("idle");
    } else if (result.error === "not_configured") {
      setStatus("no_provider");
    } else if (result.error !== "aborted") {
      setStatus("error");
    }
  }

  function onSlider(id: string, value: number) {
    const next = { ...values, [id]: value };
    setValues(next);
    const neutral = isNeutral(template, next);
    const instr = neutral ? "" : buildTransformInstruction(template, next);
    setInstruction(instr);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runLive(buildTransformInstruction(template, next), neutral), 220);
  }

  function onQuick(instr: string) {
    if (!captureBase()) return;
    setInstruction(instr);
    void runLive(instr, false); // writes live; deselect commits as one undo
  }

  function openTune() {
    if (!captureBase()) return;
    setValues(defaultAxisValues(template));
    setInstruction("");
    setStatus("idle");
    setTuneOpen(true);
  }

  return (
    <>
      {chip && (
        <div className="fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border border-rule bg-ink px-3 py-1.5 text-paper shadow-lift">
          <span className="text-2xs font-medium">Tuned in place</span>
          <button type="button" onClick={undoTune} className="inline-flex items-center gap-1 text-2xs font-semibold text-paper/90 hover:text-paper">
            <Undo2 size={12} /> Undo
          </button>
        </div>
      )}

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 120, maxWidth: 420, placement: "top", onHidden: () => sessionRef.current && commitSession() }}
        shouldShow={({ state }) => !state.selection.empty}
        className="w-[min(92vw,400px)]"
      >
        <div className="rounded-lg border border-rule bg-surface shadow-lift">
          {!tuneOpen ? (
            <div className="flex items-center gap-0.5 p-1">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onQuick(a.instruction)}
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
              {status === "loading" && <Loader2 size={13} className="ml-1 animate-spin text-signal" />}
            </div>
          ) : (
            <div className="w-[min(92vw,380px)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow inline-flex items-center gap-1.5">
                  Tune — live
                  {status === "loading" && <Loader2 size={11} className="animate-spin text-signal" />}
                </span>
                <span className="text-2xs text-ink-faint">Edits apply as you drag</span>
              </div>

              <div className="space-y-3">
                {template.axes.map((axis) => (
                  <div key={axis.id}>
                    <div className="mb-1 flex items-center justify-between text-2xs">
                      <span className="font-semibold text-ink">{axis.label}</span>
                      <span className="font-mono text-ink-faint">
                        {axis.lowLabel} · {axis.highLabel}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={values[axis.id] ?? 50}
                      aria-label={`${axis.label}: ${axis.lowLabel} to ${axis.highLabel}`}
                      onChange={(e) => onSlider(axis.id, Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-signal"
                    />
                  </div>
                ))}
              </div>

              {instruction && <p className="mt-2.5 text-2xs leading-snug text-ink-muted">→ {instruction}</p>}

              {status === "no_provider" && (
                <div className="mt-2 rounded border border-rule bg-surface-sunk px-2.5 py-2">
                  <p className="text-2xs font-medium text-ink-muted">No provider configured — this is the exact prompt it would send live. Nothing is faked.</p>
                </div>
              )}
              {status === "error" && <p className="mt-2 text-2xs text-rust-ink">The provider hit an error — drag again to retry.</p>}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={cancelSession} className="inline-flex items-center gap-1 text-2xs text-ink-muted hover:text-ink">
                  <RotateCcw size={12} /> Keep original
                </button>
                <button
                  type="button"
                  onClick={commitSession}
                  className="rounded bg-signal px-2.5 py-1 text-2xs font-semibold text-white hover:bg-signal-ink"
                >
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
