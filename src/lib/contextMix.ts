import type {
  ContextConfidence,
  ContextLayer,
  ContextMixItem,
  ContextPack,
  ContextSource,
  Mode,
  PackKind,
} from "@/types/continuity";

/**
 * V5 automatic context selection. Deterministic, conservative, and legible:
 * hard mode boundary first, then approved baseline + a single Space, then
 * keyword matches, each with a confidence band and a plain-language reason.
 * Only high-confidence context auto-applies; medium becomes one suggestion;
 * low and manual-only never auto-apply. Bounded by a context budget.
 *
 * "Automatic ≠ invisible": every applied item carries the reason shown in the UI.
 */

export type ContextMixInput = {
  text: string;
  mode: Mode;
  /** A pinned Space (project-kind pack id). */
  spaceId?: string;
  includeIds?: string[];
  excludeIds?: string[];
  /** Pack ids accepted recently for similar work (a weak positive signal). */
  recentAcceptedIds?: string[];
};

export type ContextMixResult = { applied: ContextMixItem[]; suggestions: ContextMixItem[] };

const BUDGET = { guardrail: 5, space: 6, voice: 3, moment: 1 };

const LAYER_OF: Record<PackKind, ContextLayer> = {
  voice: "voice",
  constraint: "guardrail",
  decision: "guardrail",
  project: "space",
  audience: "space",
  reference: "space",
  taste: "space",
};

function modeOk(pack: ContextPack, mode: Mode): boolean {
  return pack.mode === "both" || pack.mode === mode;
}

function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
}

/** Does the request text mention this pack by name or tag? */
function textMatch(pack: ContextPack, text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.trim()) return false;
  const nameWords = significantWords(pack.name);
  if (nameWords.some((w) => lower.includes(w))) return true;
  return pack.tags.some((t) => t.length >= 3 && lower.includes(t.toLowerCase()));
}

function tagOverlap(pack: ContextPack, text: string): number {
  const lower = text.toLowerCase();
  return pack.tags.filter((t) => t.length >= 3 && lower.includes(t.toLowerCase())).length;
}

function item(
  pack: ContextPack,
  source: ContextSource,
  reason: string,
  confidence: ContextConfidence,
  override?: "include" | "exclude",
): ContextMixItem {
  return { contextId: pack.id, layer: LAYER_OF[pack.kind], source, reason, confidence, userOverride: override };
}

export function selectContextMix(input: ContextMixInput, packs: ContextPack[]): ContextMixResult {
  const include = new Set(input.includeIds ?? []);
  const exclude = new Set(input.excludeIds ?? []);
  const recent = new Set(input.recentAcceptedIds ?? []);

  const applied: ContextMixItem[] = [];
  const suggestions: ContextMixItem[] = [];
  const handled = new Set<string>();

  // 0. Manual inclusions win for any pack (even manual-only / sensitive).
  for (const pack of packs) {
    if (!include.has(pack.id) || exclude.has(pack.id) || !modeOk(pack, input.mode)) continue;
    applied.push(item(pack, "manual", "You added this for this request.", "high", "include"));
    handled.add(pack.id);
  }

  // 1. Choose at most ONE Space (never silently mix Spaces). Manual-only Spaces
  //    only participate when the user has explicitly pinned them.
  const projects = packs.filter(
    (p) =>
      p.kind === "project" &&
      modeOk(p, input.mode) &&
      !exclude.has(p.id) &&
      !handled.has(p.id) &&
      (p.activation !== "manual" || input.spaceId === p.id),
  );
  let activeSpaceId: string | null = null;
  if (projects.length) {
    const scored = projects
      .map((p) => {
        const pinned = input.spaceId === p.id;
        const score =
          (pinned ? 100 : 0) +
          (textMatch(p, input.text) ? 5 : 0) +
          2 * tagOverlap(p, input.text) +
          (recent.has(p.id) ? 1.5 : 0);
        return { p, pinned, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top) {
      activeSpaceId = top.p.id;
      if (top.pinned) {
        applied.push(item(top.p, "manual", "Used because you pinned it.", "high"));
      } else if (textMatch(top.p, input.text)) {
        applied.push(item(top.p, "keyword", `Used because your request mentions ${top.p.name}.`, "high"));
      } else {
        suggestions.push(item(top.p, "recent", `Maybe relevant, ${top.p.name}?`, "medium"));
        activeSpaceId = null; // medium suggestion isn't auto-applied
      }
    }
  }

  // 2. Everything else.
  for (const pack of packs) {
    if (pack.kind === "project") continue; // handled above
    if (handled.has(pack.id)) continue; // manual include already applied
    if (!modeOk(pack, input.mode)) continue; // hard mode boundary
    if (exclude.has(pack.id)) continue; // user exclusion wins

    const layer = LAYER_OF[pack.kind];
    const baselineLayer = layer === "voice" || layer === "guardrail";

    // Manual-only / sensitive items never auto-apply.
    if (pack.activation === "manual") continue;

    if (pack.activation === "always_on") {
      // Approved baseline (voice/guardrail) or always-on space facts.
      const reason =
        layer === "voice"
          ? "Part of your baseline voice."
          : layer === "guardrail"
            ? "A guardrail you always keep."
            : "Always-on context for your work.";
      applied.push(item(pack, "baseline", reason, "high"));
      continue;
    }

    // Suggested: high only if the request actually mentions it; else a soft suggestion.
    if (pack.activation === "suggested") {
      // Space-scoped extras only ride along when a Space is active or the text matches.
      if (textMatch(pack, input.text)) {
        applied.push(item(pack, "keyword", "Matches this request.", "high"));
      } else if (!baselineLayer && activeSpaceId) {
        suggestions.push(item(pack, "space", "Part of this Space.", "medium"));
      } else {
        suggestions.push(item(pack, "keyword", "Might fit, based on its tags.", "medium"));
      }
    }
  }

  return { applied: enforceBudget(applied), suggestions };
}

/** Keep the context compact: cap each layer, preserving order. */
function enforceBudget(items: ContextMixItem[]): ContextMixItem[] {
  const counts: Record<ContextLayer, number> = { voice: 0, space: 0, guardrail: 0, moment: 0 };
  const out: ContextMixItem[] = [];
  for (const it of items) {
    if (counts[it.layer] < BUDGET[it.layer]) {
      out.push(it);
      counts[it.layer] += 1;
    }
  }
  return out;
}
