import type { ContextPack, Task } from "@/types/continuity";

let n = 0;
const stamp = "2026-06-01T00:00:00.000Z";

export function makePack(partial: Partial<ContextPack> = {}): ContextPack {
  n += 1;
  return {
    id: partial.id ?? `pack_${n}`,
    name: partial.name ?? `Pack ${n}`,
    kind: partial.kind ?? "project",
    mode: partial.mode ?? "both",
    summary: partial.summary ?? "A summary.",
    details: partial.details ?? "",
    tags: partial.tags ?? [],
    priority: partial.priority ?? "optional",
    activation: partial.activation ?? "manual",
    createdAt: partial.createdAt ?? stamp,
    updatedAt: partial.updatedAt ?? stamp,
  };
}

export function makeTask(partial: Partial<Task> = {}): Task {
  n += 1;
  return {
    id: partial.id ?? `task_${n}`,
    mode: partial.mode ?? "writing",
    title: partial.title ?? "Untitled task",
    goal: partial.goal ?? "Do the thing.",
    audience: partial.audience ?? "",
    destination: partial.destination ?? "",
    notes: partial.notes ?? "",
    tags: partial.tags ?? [],
    includePackIds: partial.includePackIds ?? [],
    excludePackIds: partial.excludePackIds ?? [],
    rails: partial.rails ?? {},
    targetTool: partial.targetTool ?? "Generic",
    createdAt: partial.createdAt ?? stamp,
    updatedAt: partial.updatedAt ?? stamp,
  };
}
