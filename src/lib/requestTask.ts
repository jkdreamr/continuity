import type { BuildReaction, QuickRequest, Task } from "@/types/continuity";
import { defaultRails } from "@/lib/rails";

/** Adapt a V5 QuickRequest into the existing Task shape for the build compiler. */
export function requestToTask(request: QuickRequest, rails: Record<string, number>): Task {
  return {
    id: request.id,
    mode: request.selectedMode,
    title: "",
    goal: request.text,
    audience: "",
    destination: "",
    notes: request.source ?? "",
    tags: [],
    includePackIds: request.includeIds,
    excludePackIds: request.excludeIds,
    rails,
    targetTool: request.targetTool,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

/** Build reactions map to deterministic rail settings for the change brief. */
export function buildRailsForReaction(reaction?: BuildReaction): Record<string, number> {
  const base = defaultRails("build");
  switch (reaction) {
    case "safer":
      return { ...base, boldness: 10, behavior: 10, structure: 15 };
    case "bolder":
      return { ...base, boldness: 90 };
    case "more_editorial":
      return { ...base, expression: 85 };
    case "keep_structure":
      return { ...base, structure: 8 };
    case "plan_first":
    default:
      return base;
  }
}
