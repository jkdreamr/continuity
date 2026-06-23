"use client";

import { useEffect, useState } from "react";
import { Copy, RotateCcw, Check } from "lucide-react";
import type { TargetTool } from "@/types/continuity";
import { cx } from "@/lib/cx";
import { useToast } from "@/components/ui/Toast";

export function PromptPreview({
  prompt,
  targetTool,
  targets,
  onTargetChange,
}: {
  prompt: string;
  targetTool: TargetTool;
  targets: TargetTool[];
  onTargetChange: (t: TargetTool) => void;
}) {
  const { toast } = useToast();
  const [edited, setEdited] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const [copied, setCopied] = useState(false);

  // Stay live with the compiler until the user takes manual control.
  useEffect(() => {
    if (!edited) setDraft(prompt);
  }, [prompt, edited]);

  const value = edited ? draft : prompt;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for environments without clipboard permission.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast("Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="eyebrow mr-1">Format for</span>
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTargetChange(t)}
              aria-pressed={t === targetTool}
              className={cx(
                "rounded px-2 py-1 text-2xs font-medium transition-colors",
                t === targetTool
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {edited && (
            <button
              type="button"
              onClick={() => setEdited(false)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-2xs text-ink-muted hover:bg-surface-sunk hover:text-ink"
            >
              <RotateCcw size={12} /> Reset to live
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded bg-signal px-2.5 py-1 text-2xs font-semibold text-white transition-colors hover:bg-signal-ink"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setEdited(true);
          setDraft(e.target.value);
        }}
        spellCheck={false}
        aria-label="Compiled prompt (editable)"
        className="brief min-h-[22rem] flex-1 resize-none bg-surface px-4 py-3.5 focus:outline-none"
      />
    </div>
  );
}
