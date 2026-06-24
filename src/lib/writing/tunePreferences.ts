import type { AutoTuneAxis, TuneVector } from "@/lib/writing/autoTune/types";
import { clamp } from "@/lib/writing/autoTune/normalize";

/**
 * Approved writing preferences (V10). A one-off Tune adjustment is NEVER saved.
 * Only a repeatedly accepted direction becomes a *proposed* preference that the
 * user must approve; once approved it gently nudges future recommendations.
 * Stored in its own localStorage key, the workspace schema is untouched.
 */
export type AxisDir = `${AutoTuneAxis}:${"up" | "down"}`;

export type PrefStore = { get(key: string): string | null; set(key: string, value: string): void };

const KEY = "continuity.autotune.prefs.v1";
const THRESHOLD = 3;

type State = { counts: Record<string, number>; accepted: AxisDir[]; dismissed: AxisDir[] };

function load(store: PrefStore): State {
  try {
    const raw = store.get(KEY);
    if (!raw) return { counts: {}, accepted: [], dismissed: [] };
    const p = JSON.parse(raw);
    return { counts: p.counts ?? {}, accepted: p.accepted ?? [], dismissed: p.dismissed ?? [] };
  } catch {
    return { counts: {}, accepted: [], dismissed: [] };
  }
}

function save(store: PrefStore, state: State): void {
  try {
    store.set(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode, non-fatal */
  }
}

/** Map a settled vector to the directions the user actually moved (off 50). */
export function vectorDirections(v: Partial<TuneVector>): AxisDir[] {
  const out: AxisDir[] = [];
  for (const axis of ["formality", "length", "naturalness"] as AutoTuneAxis[]) {
    const val = v[axis];
    if (val == null || val === 50) continue;
    out.push(`${axis}:${val > 50 ? "up" : "down"}` as AxisDir);
  }
  return out;
}

export function recordAccept(store: PrefStore, dirs: AxisDir[]): void {
  if (!dirs.length) return;
  const state = load(store);
  for (const d of dirs) {
    if (state.accepted.includes(d) || state.dismissed.includes(d)) continue;
    state.counts[d] = (state.counts[d] ?? 0) + 1;
  }
  save(store, state);
}

const DIR_LABEL: Record<AxisDir, string> = {
  "formality:up": "keep writing more formal",
  "formality:down": "keep writing more casual",
  "length:down": "keep writing tighter",
  "length:up": "make writing more complete",
  "naturalness:up": "make writing more natural",
  "naturalness:down": "keep writing more polished",
};

/** The strongest direction at or above threshold that the user hasn't decided on. */
export function pendingProposal(store: PrefStore): { dir: AxisDir; label: string; count: number } | null {
  const state = load(store);
  let best: { dir: AxisDir; count: number } | null = null;
  for (const [dir, count] of Object.entries(state.counts) as [AxisDir, number][]) {
    if (count < THRESHOLD) continue;
    if (state.accepted.includes(dir) || state.dismissed.includes(dir)) continue;
    if (!best || count > best.count) best = { dir, count };
  }
  return best ? { dir: best.dir, label: DIR_LABEL[best.dir], count: best.count } : null;
}

export function acceptProposal(store: PrefStore, dir: AxisDir): void {
  const state = load(store);
  if (!state.accepted.includes(dir)) state.accepted.push(dir);
  delete state.counts[dir];
  save(store, state);
}

export function dismissProposal(store: PrefStore, dir: AxisDir): void {
  const state = load(store);
  if (!state.dismissed.includes(dir)) state.dismissed.push(dir);
  delete state.counts[dir];
  save(store, state);
}

/** Apply approved preferences as a gentle nudge to a recommendation's values. */
export function applyPreferenceBias(store: PrefStore, values: Partial<TuneVector>): Partial<TuneVector> {
  const state = load(store);
  if (!state.accepted.length) return values;
  const next = { ...values };
  for (const dir of state.accepted) {
    const [axis, way] = dir.split(":") as [AutoTuneAxis, "up" | "down"];
    const cur = next[axis] ?? 50;
    next[axis] = clamp(cur + (way === "up" ? 8 : -8));
  }
  return next;
}

export function browserStore(): PrefStore | null {
  if (typeof window === "undefined") return null;
  return {
    get: (k) => {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        /* ignore */
      }
    },
  };
}
