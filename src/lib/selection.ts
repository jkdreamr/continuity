import type { ContextPack, PackDecision, Task } from "@/types/continuity";

/**
 * Deterministic context selection.
 *
 * Order matters and mirrors the thesis assembly algorithm: hard boundaries
 * (mode scope) are applied *first*, before any activation logic. There is no
 * semantic similarity or hidden memory here — every decision is explainable
 * from the pack's own fields and the user's explicit choices.
 */

function modeLabel(mode: "writing" | "build"): string {
  return mode === "writing" ? "Writing" : "Build";
}

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b.map((t) => t.toLowerCase()));
  return a.filter((t) => set.has(t.toLowerCase()));
}

export function decidePack(task: Task, pack: ContextPack): PackDecision {
  // 1. Hard boundary: a pack scoped to the other mode can never apply here,
  //    even if the user tried to manually add it.
  if (pack.mode !== "both" && pack.mode !== task.mode) {
    return {
      pack,
      state: "unavailable",
      reason: `Not included because it is ${modeLabel(pack.mode)}-only.`,
    };
  }

  // 2. Explicit user exclusion overrides all activation logic.
  if (task.excludePackIds.includes(pack.id)) {
    return { pack, state: "excluded", reason: "You removed this from this task." };
  }

  // 3. Explicit user inclusion.
  if (task.includePackIds.includes(pack.id)) {
    return { pack, state: "active", reason: "Included because you added it." };
  }

  // 4. Always On (within the correct mode).
  if (pack.activation === "always_on") {
    return { pack, state: "active", reason: "Included because it's marked Always On." };
  }

  // 5. Suggested — active only when its tags overlap the task.
  if (pack.activation === "suggested") {
    const shared = overlap(pack.tags, task.tags);
    if (shared.length > 0) {
      return {
        pack,
        state: "active",
        reason: `Included because this task is tagged ${shared.join(", ")}.`,
      };
    }
    return {
      pack,
      state: "available",
      reason: "Suggested — add it if it fits this task.",
    };
  }

  // 6. Manual — available until the user adds it.
  return { pack, state: "available", reason: "Manual — add it when you need it." };
}

export function selectPacks(task: Task, packs: ContextPack[]): PackDecision[] {
  return packs.map((pack) => decidePack(task, pack));
}

export function decisionFor(
  task: Task,
  packs: ContextPack[],
  packId: string,
): PackDecision | undefined {
  const pack = packs.find((p) => p.id === packId);
  return pack ? decidePack(task, pack) : undefined;
}

export function activePacks(task: Task, packs: ContextPack[]): ContextPack[] {
  return selectPacks(task, packs)
    .filter((d) => d.state === "active")
    .map((d) => d.pack);
}
