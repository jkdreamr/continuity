import type { Workspace } from "@/types/continuity";
import { migrateWorkspace } from "@/lib/migrate";

export const STORAGE_KEY = "continuity.workspace.v1";

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Read + migrate the saved workspace. Runs the versioned migration so V4 (v1)
 * data upgrades in place. Returns null when absent or unrecoverable.
 */
export function loadWorkspace(): Workspace | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateWorkspace(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveWorkspace(ws: Workspace): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
  } catch {
    // Quota / private-mode failures are non-fatal — the in-memory state still works.
  }
}

export function clearWorkspace(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
