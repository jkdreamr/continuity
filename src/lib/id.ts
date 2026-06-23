/**
 * Stable, collision-resistant id generation for runtime-created entities.
 * Seed data uses hand-written ids so the demo is reproducible.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${rand}`;
}

/** Current ISO timestamp — isolated here so callers stay easy to reason about. */
export function nowIso(): string {
  return new Date().toISOString();
}
