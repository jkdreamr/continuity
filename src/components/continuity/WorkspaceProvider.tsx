"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ContextPack,
  Mode,
  MemoryProposal,
  OutputArtifact,
  PackKind,
  PackScope,
  Task,
  Workspace,
} from "@/types/continuity";
import { newId, nowIso } from "@/lib/id";
import { defaultRails } from "@/lib/rails";
import { compile } from "@/lib/compile";
import { generateProposals } from "@/lib/memory";
import { exportWorkspace, parseImport, type ImportResult } from "@/lib/exportImport";
import { loadWorkspace, saveWorkspace, clearWorkspace } from "@/lib/storage";
import { buildSeedWorkspace, emptyWorkspace } from "@/data/seed";

type WorkspaceApi = {
  workspace: Workspace;
  hydrated: boolean;

  createPack: (input: Partial<ContextPack> & { kind: PackKind }) => ContextPack;
  updatePack: (id: string, patch: Partial<ContextPack>) => void;
  deletePack: (id: string) => void;
  duplicatePack: (id: string) => ContextPack | null;

  createTask: (input: Partial<Task> & { mode: Mode }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setPackOverride: (taskId: string, packId: string, action: "include" | "exclude" | "clear") => void;
  setRail: (taskId: string, railId: string, value: number) => void;

  saveArtifact: (taskId: string) => OutputArtifact | null;

  proposals: MemoryProposal[];
  acceptProposal: (proposal: MemoryProposal) => void;
  dismissProposal: (id: string) => void;

  exportText: () => string;
  importText: (text: string) => ImportResult;
  resetDemo: () => void;
  clearAll: () => void;
};

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

const defaultTarget: Record<Mode, Task["targetTool"]> = {
  writing: "Claude",
  build: "Claude Code",
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  // Server + first client render share this deterministic empty state to avoid
  // hydration mismatch; real data arrives in the mount effect below.
  const [workspace, setWorkspace] = useState<Workspace>(() => emptyWorkspace());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadWorkspace();
    setWorkspace(loaded ?? buildSeedWorkspace());
    setHydrated(true);
  }, []);

  // Debounced persistence so per-keystroke edits don't thrash localStorage.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveWorkspace(workspace), 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [workspace, hydrated]);

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)),
    }));
  }, []);

  const createPack = useCallback<WorkspaceApi["createPack"]>((input) => {
    const ts = nowIso();
    const pack: ContextPack = {
      id: input.id ?? newId("pack"),
      name: input.name ?? "Untitled pack",
      kind: input.kind,
      mode: input.mode ?? "both",
      summary: input.summary ?? "",
      details: input.details ?? "",
      tags: input.tags ?? [],
      priority: input.priority ?? "preferred",
      activation: input.activation ?? "suggested",
      createdAt: input.createdAt ?? ts,
      updatedAt: ts,
    };
    setWorkspace((ws) => ({ ...ws, packs: [...ws.packs, pack] }));
    return pack;
  }, []);

  const updatePack = useCallback<WorkspaceApi["updatePack"]>((id, patch) => {
    setWorkspace((ws) => ({
      ...ws,
      packs: ws.packs.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)),
    }));
  }, []);

  const deletePack = useCallback<WorkspaceApi["deletePack"]>((id) => {
    setWorkspace((ws) => ({
      ...ws,
      packs: ws.packs.filter((p) => p.id !== id),
      tasks: ws.tasks.map((t) => ({
        ...t,
        includePackIds: t.includePackIds.filter((x) => x !== id),
        excludePackIds: t.excludePackIds.filter((x) => x !== id),
      })),
    }));
  }, []);

  const duplicatePack = useCallback<WorkspaceApi["duplicatePack"]>(
    (id) => {
      const src = workspace.packs.find((p) => p.id === id);
      if (!src) return null;
      const ts = nowIso();
      const copy: ContextPack = {
        ...src,
        id: newId("pack"),
        name: `${src.name} (copy)`,
        activation: "manual",
        createdAt: ts,
        updatedAt: ts,
      };
      setWorkspace((ws) => ({ ...ws, packs: [...ws.packs, copy] }));
      return copy;
    },
    [workspace.packs],
  );

  const createTask = useCallback<WorkspaceApi["createTask"]>((input) => {
    const ts = nowIso();
    const task: Task = {
      id: input.id ?? newId("task"),
      mode: input.mode,
      title: input.title ?? "",
      goal: input.goal ?? "",
      audience: input.audience ?? "",
      destination: input.destination ?? "",
      notes: input.notes ?? "",
      tags: input.tags ?? [],
      includePackIds: input.includePackIds ?? [],
      excludePackIds: input.excludePackIds ?? [],
      rails: input.rails ?? defaultRails(input.mode),
      targetTool: input.targetTool ?? defaultTarget[input.mode],
      createdAt: input.createdAt ?? ts,
      updatedAt: ts,
    };
    setWorkspace((ws) => ({ ...ws, tasks: [...ws.tasks, task] }));
    return task;
  }, []);

  const deleteTask = useCallback<WorkspaceApi["deleteTask"]>((id) => {
    setWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.filter((t) => t.id !== id),
      artifacts: ws.artifacts.filter((a) => a.taskId !== id),
    }));
  }, []);

  const setPackOverride = useCallback<WorkspaceApi["setPackOverride"]>(
    (taskId, packId, action) => {
      setWorkspace((ws) => ({
        ...ws,
        tasks: ws.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const include = new Set(t.includePackIds);
          const exclude = new Set(t.excludePackIds);
          include.delete(packId);
          exclude.delete(packId);
          if (action === "include") include.add(packId);
          if (action === "exclude") exclude.add(packId);
          return {
            ...t,
            includePackIds: [...include],
            excludePackIds: [...exclude],
            updatedAt: nowIso(),
          };
        }),
      }));
    },
    [],
  );

  const setRail = useCallback<WorkspaceApi["setRail"]>(
    (taskId, railId, value) => {
      setWorkspace((ws) => ({
        ...ws,
        tasks: ws.tasks.map((t) =>
          t.id === taskId
            ? { ...t, rails: { ...t.rails, [railId]: value }, updatedAt: nowIso() }
            : t,
        ),
      }));
    },
    [],
  );

  const saveArtifact = useCallback<WorkspaceApi["saveArtifact"]>(
    (taskId) => {
      const task = workspace.tasks.find((t) => t.id === taskId);
      if (!task) return null;
      const compiled = compile(task, workspace.packs);
      const artifact: OutputArtifact = {
        id: newId("art"),
        taskId,
        mode: task.mode,
        targetTool: task.targetTool,
        prompt: compiled.prompt,
        activePackIds: compiled.activePackIds,
        createdAt: nowIso(),
      };
      setWorkspace((ws) => ({ ...ws, artifacts: [artifact, ...ws.artifacts] }));
      return artifact;
    },
    [workspace.tasks, workspace.packs],
  );

  const proposals = useMemo(() => generateProposals(workspace), [workspace]);

  const acceptProposal = useCallback<WorkspaceApi["acceptProposal"]>((proposal) => {
    setWorkspace((ws) => {
      let packs = ws.packs;
      const src = ws.packs.find((p) => p.id === proposal.payload.packId);
      if (proposal.kind === "promote_always_on") {
        packs = ws.packs.map((p) =>
          p.id === proposal.payload.packId ? { ...p, activation: "always_on", updatedAt: nowIso() } : p,
        );
      } else if (proposal.kind === "confirm_build_scope") {
        const mode = (proposal.payload.mode as PackScope) ?? "build";
        packs = ws.packs.map((p) =>
          p.id === proposal.payload.packId ? { ...p, mode, updatedAt: nowIso() } : p,
        );
      } else if (proposal.kind === "create_voice_pack" && src) {
        const ts = nowIso();
        const voice: ContextPack = {
          id: newId("pack"),
          name: `Voice — ${src.name}`,
          kind: "voice",
          mode: "writing",
          summary: src.summary,
          details: src.details,
          tags: Array.from(new Set([...src.tags, "voice"])),
          priority: "required",
          activation: "always_on",
          createdAt: ts,
          updatedAt: ts,
        };
        packs = [...ws.packs, voice];
      }
      return {
        ...ws,
        packs,
        dismissedProposals: Array.from(new Set([...ws.dismissedProposals, proposal.id])),
      };
    });
  }, []);

  const dismissProposal = useCallback<WorkspaceApi["dismissProposal"]>((id) => {
    setWorkspace((ws) => ({
      ...ws,
      dismissedProposals: Array.from(new Set([...ws.dismissedProposals, id])),
    }));
  }, []);

  const exportText = useCallback(() => exportWorkspace(workspace, nowIso()), [workspace]);

  const importText = useCallback<WorkspaceApi["importText"]>((text) => {
    const result = parseImport(text);
    if (result.ok) setWorkspace(result.workspace);
    return result;
  }, []);

  const resetDemo = useCallback(() => setWorkspace(buildSeedWorkspace()), []);

  const clearAll = useCallback(() => {
    clearWorkspace();
    setWorkspace(emptyWorkspace());
  }, []);

  const api = useMemo<WorkspaceApi>(
    () => ({
      workspace,
      hydrated,
      createPack,
      updatePack,
      deletePack,
      duplicatePack,
      createTask,
      updateTask: patchTask,
      deleteTask,
      setPackOverride,
      setRail,
      saveArtifact,
      proposals,
      acceptProposal,
      dismissProposal,
      exportText,
      importText,
      resetDemo,
      clearAll,
    }),
    [
      workspace,
      hydrated,
      createPack,
      updatePack,
      deletePack,
      duplicatePack,
      createTask,
      patchTask,
      deleteTask,
      setPackOverride,
      setRail,
      saveArtifact,
      proposals,
      acceptProposal,
      dismissProposal,
      exportText,
      importText,
      resetDemo,
      clearAll,
    ],
  );

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
