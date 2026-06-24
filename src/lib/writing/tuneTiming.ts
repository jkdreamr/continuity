/**
 * Dev-only Tune timing instrumentation. Local only, no third-party analytics,
 * opaque IDs/hashes only, never raw text, contract content, prompt content,
 * credentials, or user data. Surfaced via the `?debugTune=1` overlay.
 */

export type TuneTiming = {
  sessionId: string;
  vectorKey: string;
  interactionStartedAt: number;
  uiUpdatedAt?: number;
  cacheHitAt?: number;
  requestStartedAt?: number;
  firstChunkAt?: number;
  finalChunkAt?: number;
  previewPatchedAt?: number;
  settledAt?: number;
  canceledAt?: number;
  source: "cache" | "provider" | "prompt-preview";
};

export function debugTuneEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  try {
    return new URLSearchParams(window.location.search).get("debugTune") === "1";
  } catch {
    return false;
  }
}

const RING: TuneTiming[] = [];
const MAX = 20;

export function recordTiming(t: TuneTiming): void {
  if (!debugTuneEnabled()) return;
  RING.push(t);
  while (RING.length > MAX) RING.shift();
}

export function recentTimings(): TuneTiming[] {
  return RING.slice(-8).reverse();
}

/** A monotonic-ish opaque id without Date.now in hot paths (perf-based). */
export function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return 0;
}
