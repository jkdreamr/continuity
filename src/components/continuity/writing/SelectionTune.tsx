"use client";

import { useRef, useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { Sparkles, RotateCcw, Check, Loader2 } from "lucide-react";
import type { DocumentBrief, DocumentKind } from "@/types/continuity";
import { tuneTemplate, defaultAxisValues, buildTransformInstruction, QUICK_ACTIONS } from "@/lib/writing/tuneTemplates";
import { requestTransform } from "@/lib/writing/agentClient";
import { cx } from "@/lib/cx";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

type Base = { from: number; to: number; text: string; hash: string };
type Preview =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; replacement: string }
  | { status: "not_configured"; prompt: string }
  | { status: "error" };

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
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const baseRef = useRef<Base | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function captureBase(): Base | null {
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    const text = editor.state.doc.textBetween(from, to, " ");
    const base = { from, to, text, hash: hash(text) };
    baseRef.current = base;
    return base;
  }

  function surrounding(base: Base) {
    const doc = editor.state.doc;
    return {
      before: doc.textBetween(Math.max(0, base.from - 200), base.from, "\n", " "),
      after: doc.textBetween(base.to, Math.min(doc.content.size, base.to + 200), "\n", " "),
    };
  }

  async function runTransform(instr: string, base: Base | null) {
    const b = base ?? baseRef.current;
    if (!b) return;
    setInstruction(instr);
    if (!providerConfigured) {
      setPreview({ status: "not_configured", prompt: instr });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPreview({ status: "loading" });
    const result = await requestTransform(
      { selection: { from: b.from, to: b.to, text: b.text }, surroundingContext: surrounding(b), instruction: instr, brief, baseSelectionHash: b.hash },
      controller.signal,
    );
    if (controller.signal.aborted) return;
    if (result.ok) setPreview({ status: "ready", replacement: result.replacement });
    else if (result.error === "not_configured") setPreview({ status: "not_configured", prompt: instr });
    else if (result.error !== "aborted") setPreview({ status: "error" });
  }

  function onQuick(instr: string) {
    const base = captureBase();
    setTuneOpen(false);
    void runTransform(instr, base);
  }

  function openTune() {
    const base = captureBase();
    const v = defaultAxisValues(template);
    setValues(v);
    setPreview({ status: "idle" });
    setInstruction("");
    setTuneOpen(true);
    void base;
  }

  function onSlider(id: string, value: number, flush: boolean) {
    const next = { ...values, [id]: value };
    setValues(next);
    const instr = buildTransformInstruction(template, next);
    setInstruction(instr);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = flush ? 0 : 300;
    debounceRef.current = setTimeout(() => void runTransform(instr, baseRef.current), delay);
  }

  function applyPreview() {
    const b = baseRef.current;
    if (!b || preview.status !== "ready") return;
    // Stable-base guard: only apply if the live selection still matches.
    const cur = editor.state.doc.textBetween(b.from, b.to, " ");
    if (hash(cur) !== b.hash) {
      setPreview({ status: "error" });
      return;
    }
    editor.chain().focus().insertContentAt({ from: b.from, to: b.to }, preview.replacement).run();
    reset();
  }

  function reset() {
    abortRef.current?.abort();
    setTuneOpen(false);
    setPreview({ status: "idle" });
    setValues(defaultAxisValues(template));
    setInstruction("");
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, maxWidth: 420, placement: "top" }}
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
          </div>
        ) : (
          <div className="w-[min(92vw,380px)] p-3">
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
                    onChange={(e) => onSlider(axis.id, Number(e.target.value), false)}
                    onPointerUp={(e) => onSlider(axis.id, Number((e.target as HTMLInputElement).value), true)}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-rule accent-signal"
                  />
                </div>
              ))}
            </div>

            {instruction && <p className="mt-2.5 text-2xs leading-snug text-ink-muted">→ {instruction}</p>}

            <div className="mt-2.5 min-h-[1.5rem]">
              {preview.status === "loading" && (
                <span className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
                  <Loader2 size={12} className="animate-spin text-signal" /> Drafting a preview…
                </span>
              )}
              {preview.status === "ready" && (
                <div className="rounded border border-signal/30 bg-signal-soft px-2.5 py-2 text-[13px] leading-relaxed text-ink">
                  {preview.replacement}
                </div>
              )}
              {preview.status === "not_configured" && (
                <div className="rounded border border-rule bg-surface-sunk px-2.5 py-2">
                  <p className="text-2xs font-medium text-ink-muted">Prompt preview (connect a provider to apply):</p>
                  <p className="brief mt-1 text-[12px]">{preview.prompt}</p>
                </div>
              )}
              {preview.status === "error" && <p className="text-2xs text-rust-ink">The selection changed — re-select and try again.</p>}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-2xs text-ink-muted hover:text-ink">
                <RotateCcw size={12} /> Reset
              </button>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={reset} className="rounded px-2.5 py-1 text-2xs font-medium text-ink-muted hover:bg-surface-sunk">
                  Keep mine
                </button>
                <button
                  type="button"
                  onClick={applyPreview}
                  disabled={preview.status !== "ready"}
                  className={cx(
                    "inline-flex items-center gap-1 rounded px-2.5 py-1 text-2xs font-semibold text-white",
                    preview.status === "ready" ? "bg-signal hover:bg-signal-ink" : "bg-ink-faint",
                  )}
                >
                  <Check size={12} /> Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
