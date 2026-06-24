import type { ContextContract, ContractItem } from "@/types/continuity";
import { newId, nowIso } from "@/lib/id";

/** Assemble a Context Contract from items + objective. Deduplicates by statement. */
export function buildContextContract(input: {
  name: string;
  taskType: ContextContract["taskType"];
  objective?: string;
  items?: ContractItem[];
  sourceArtifactIds?: string[];
}): ContextContract {
  const ts = nowIso();
  const seen = new Set<string>();
  const items = (input.items ?? []).filter((i) => {
    const key = `${i.kind}:${i.statement.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    id: newId("contract"),
    name: input.name,
    taskType: input.taskType,
    objective: input.objective,
    items,
    sourceArtifactIds: input.sourceArtifactIds ?? [],
    createdAt: ts,
    updatedAt: ts,
  };
}
