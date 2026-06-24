/**
 * Bounded LRU cache for tune rewrites. A cache hit lets the <100ms path restore
 * a prior candidate instantly, so a remote rewrite only fires when the
 * normalized vector (or any context input) actually changes.
 */

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export type TuneCacheKeyParts = {
  selectionHash: string;
  surroundingHash: string;
  contractHash: string;
  briefHash: string;
  vectorKey: string;
  modelId: string;
};

/** Stable composite key. Any change to selection/context/vector/model misses. */
export function tuneCacheKey(p: TuneCacheKeyParts): string {
  return [p.selectionHash, p.surroundingHash, p.contractHash, p.briefHash, p.vectorKey, p.modelId].join("|");
}

export class TuneCache {
  private map = new Map<string, string>();
  constructor(private max = 60) {}

  get(key: string): string | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // LRU: re-insert as most-recently-used.
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }
}
