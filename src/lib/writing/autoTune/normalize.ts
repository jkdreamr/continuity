import type { TuneVector } from "./types";

/**
 * Sliders look continuous but quantize to exactly seven meaningful stops, so a
 * remote rewrite only fires when the normalized vector actually changes. 50 is
 * the true midpoint: an axis at 50 means "leave this dimension alone."
 */
export const STOPS = [0, 17, 33, 50, 67, 83, 100] as const;

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function quantize(value: number): number {
  let best: number = STOPS[0];
  let bestDist = Infinity;
  for (const s of STOPS) {
    const d = Math.abs(s - value);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

export function quantizeVector(v: TuneVector): TuneVector {
  return {
    formality: quantize(v.formality),
    length: quantize(v.length),
    naturalness: quantize(v.naturalness),
  };
}

/** All axes at the midpoint → no rewrite instruction; restore the original. */
export function isNeutralVector(v: TuneVector): boolean {
  const q = quantizeVector(v);
  return q.formality === 50 && q.length === 50 && q.naturalness === 50;
}

/** Stable key for cache + change detection (quantized). */
export function vectorKey(v: TuneVector): string {
  const q = quantizeVector(v);
  return `${q.formality}-${q.length}-${q.naturalness}`;
}
