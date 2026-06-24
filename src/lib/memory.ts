import type { ContextPack, MemoryProposal, Task, Workspace } from "@/types/continuity";

/**
 * Memory proposals are derived *only* from saved choices, never from hidden
 * inference. Every proposal is something the user can point at in their own
 * history ("you added this twice", "you removed this from a writing task").
 * The UI labels them "Suggested from your saved choices" and requires an
 * explicit accept / edit / dismiss.
 */

const MIN_REPEAT = 2;

function countTasks(tasks: Task[], predicate: (t: Task) => boolean): number {
  return tasks.filter(predicate).length;
}

function timesManuallyAdded(tasks: Task[], pack: ContextPack): number {
  return countTasks(tasks, (t) => t.includePackIds.includes(pack.id));
}

function timesRemovedFromWriting(tasks: Task[], pack: ContextPack): number {
  return countTasks(
    tasks,
    (t) => t.mode === "writing" && t.excludePackIds.includes(pack.id),
  );
}

export function generateProposals(ws: Workspace): MemoryProposal[] {
  const dismissed = new Set(ws.dismissedProposals);
  const proposals: MemoryProposal[] = [];

  for (const pack of ws.packs) {
    // A. A Suggested pack the user keeps adding by hand → offer Always On.
    if (pack.activation === "suggested") {
      const used = timesManuallyAdded(ws.tasks, pack);
      if (used >= MIN_REPEAT) {
        proposals.push({
          id: `promote-always-on:${pack.id}`,
          kind: "promote_always_on",
          title: `You added "${pack.name}" to ${used} tasks.`,
          detail:
            "Set it to Always On so it's there by default. You can still remove it on any single task.",
          actionLabel: "Set to Always On",
          payload: { packId: pack.id },
        });
      }
    }

    // B. A "both"-scope pack the user removed from writing → offer Build-only.
    if (pack.mode === "both" && timesRemovedFromWriting(ws.tasks, pack) >= 1) {
      proposals.push({
        id: `build-scope:${pack.id}`,
        kind: "confirm_build_scope",
        title: `You removed "${pack.name}" from a writing task.`,
        detail:
          "Keep it for build work only? It will stop being suggested when you write.",
        actionLabel: "Make it Build-only",
        payload: { packId: pack.id, mode: "build" },
      });
    }

    // C. A required constraint leaned on repeatedly → offer to fold into voice.
    if (
      pack.kind === "constraint" &&
      pack.priority === "required" &&
      timesManuallyAdded(ws.tasks, pack) >= MIN_REPEAT
    ) {
      proposals.push({
        id: `voice-from:${pack.id}`,
        kind: "create_voice_pack",
        title: `You marked "${pack.name}" as required in multiple tasks.`,
        detail: "Save it into your voice so it's always part of how you sound.",
        actionLabel: "Save as Voice Pack",
        payload: { packId: pack.id },
      });
    }
  }

  return proposals.filter((p) => !dismissed.has(p.id));
}
