import type { Workspace } from "@/types/continuity";
import { WorkspaceSchema } from "@/lib/schema";

export const CURRENT_VERSION = 2;

/**
 * Versioned, non-destructive migration. V4 data (version 1, no requests/drafts)
 * is upgraded in place: existing packs, tasks, and artifacts are preserved and
 * the new V5 arrays are added. Idempotent; returns null only for unrecoverable
 * input so the caller can fall back to a fresh/seeded workspace.
 */
export function migrateWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const candidate = {
    ...obj,
    version: CURRENT_VERSION,
    requests: Array.isArray(obj.requests) ? obj.requests : [],
    drafts: Array.isArray(obj.drafts) ? obj.drafts : [],
    dismissedProposals: Array.isArray(obj.dismissedProposals) ? obj.dismissedProposals : [],
  };

  const parsed = WorkspaceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
