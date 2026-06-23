import type { Workspace } from "@/types/continuity";
import { WorkspaceSchema } from "@/lib/schema";
import { textToDoc } from "@/lib/writing/writingDocs";

export const CURRENT_VERSION = 3;

/**
 * Versioned, non-destructive migration.
 * - v1 (V4) -> adds requests/drafts.
 * - v2 (V5) -> adds documents: each writing request's latest draft becomes an
 *   editable WritingDocument. Build drafts/artifacts and all prior arrays are
 *   preserved untouched. Idempotent; returns null on unrecoverable input so the
 *   caller can fall back without overwriting the raw stored data.
 */
function deriveDocuments(obj: Record<string, unknown>): unknown[] {
  if (Array.isArray(obj.documents)) return obj.documents;

  const drafts = Array.isArray(obj.drafts) ? (obj.drafts as Record<string, unknown>[]) : [];
  const requests = Array.isArray(obj.requests) ? (obj.requests as Record<string, unknown>[]) : [];

  // Keep only the newest writing draft per request, so version history doesn't
  // explode into many duplicate documents.
  const latest = new Map<string, Record<string, unknown>>();
  for (const d of drafts) {
    if (!d || d.mode !== "writing" || typeof d.content !== "string") continue;
    const rid = String(d.requestId ?? d.id);
    const cur = latest.get(rid);
    if (!cur || String(d.createdAt ?? "") > String(cur.createdAt ?? "")) latest.set(rid, d);
  }

  const documents: unknown[] = [];
  for (const [rid, d] of latest) {
    const req = requests.find((r) => r && r.id === rid);
    const text = String(d.content ?? "");
    const created = typeof d.createdAt === "string" ? d.createdAt : "2026-06-23T00:00:00.000Z";
    documents.push({
      id: `doc-${String(d.id)}`,
      title: String((req?.text as string) ?? "Imported draft").slice(0, 80),
      contentJson: textToDoc(text),
      plainText: text,
      mode: "writing",
      liveHelpEnabled: true,
      activeMemoryOverrides: { includeIds: [], excludeIds: [] },
      version: 1,
      createdAt: created,
      updatedAt: created,
    });
  }
  return documents;
}

export function migrateWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const candidate = {
    ...obj,
    version: CURRENT_VERSION,
    requests: Array.isArray(obj.requests) ? obj.requests : [],
    drafts: Array.isArray(obj.drafts) ? obj.drafts : [],
    documents: deriveDocuments(obj),
    dismissedProposals: Array.isArray(obj.dismissedProposals) ? obj.dismissedProposals : [],
  };

  const parsed = WorkspaceSchema.safeParse(candidate);
  // z.unknown() infers contentJson as optional; the runtime shape is validated.
  return parsed.success ? (parsed.data as Workspace) : null;
}
