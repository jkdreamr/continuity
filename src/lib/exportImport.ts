import type { Workspace } from "@/types/continuity";
import { WorkspaceSchema } from "@/lib/schema";

export const EXPORT_APP = "continuity";
export const EXPORT_SCHEMA_VERSION = 1;

/** Stable JSON for a bare workspace (no surrounding metadata). */
export function serializeWorkspace(ws: Workspace): string {
  return JSON.stringify(ws, null, 2);
}

/** Human-readable export wrapper. `exportedAt` is injected so this stays pure. */
export function exportWorkspace(ws: Workspace, exportedAt: string): string {
  return JSON.stringify(
    {
      app: EXPORT_APP,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt,
      workspace: ws,
    },
    null,
    2,
  );
}

export type ImportResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; error: string };

function friendlyZodError(error: import("zod").ZodError): string {
  const first = error.issues[0];
  if (!first) return "That file doesn't look like a Continuity workspace.";
  const path = first.path.join(".");
  return path
    ? `Couldn't read the workspace: "${path}" ${first.message.toLowerCase()}.`
    : `Couldn't read the workspace: ${first.message.toLowerCase()}.`;
}

/**
 * Validate imported text into a Workspace. Accepts either an export wrapper
 * (`{ app, workspace }`) or a bare workspace object. Never throws.
 */
export function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON. Try exporting again." };
  }

  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "That file doesn't look like a Continuity workspace." };
  }

  const candidate =
    "workspace" in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).workspace
      : raw;

  const result = WorkspaceSchema.safeParse(candidate);
  if (!result.success) {
    return { ok: false, error: friendlyZodError(result.error) };
  }
  return { ok: true, workspace: result.data };
}
