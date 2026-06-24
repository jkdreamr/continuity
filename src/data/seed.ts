import type { ContextPack, OutputArtifact, Task, Workspace } from "@/types/continuity";
import { compile } from "@/lib/compile";
import { defaultRails } from "@/lib/rails";

/**
 * Fictional but realistic demo workspace for the "Continuity" startup itself.
 * All copy is real interface language, no lorem ipsum, no personal data.
 * The two seed tasks intentionally create an honest memory proposal:
 *   - "Continuity product thesis" was added by hand to 2 tasks  -> offer Always On
 *   - "Calm editorial control room" was removed from a writing task -> offer Build-only
 */

function seedPacks(): ContextPack[] {
  const t = "2026-05-20T09:00:00.000Z";
  return [
    {
      id: "pack-voice",
      name: "Direct, specific founder voice",
      kind: "voice",
      mode: "writing",
      summary: "Warm, clear, confident. Avoid inflated language and generic startup phrasing.",
      details:
        "Short sentences. Lead with the point. Concrete nouns and real examples over abstractions. Contractions are fine. Never use hype words or manufactured enthusiasm.",
      tags: ["founder", "outreach", "writing"],
      priority: "required",
      activation: "always_on",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-project",
      name: "Continuity product thesis",
      kind: "project",
      mode: "both",
      summary:
        "A visible, portable Context Pack system that helps creators carry voice, decisions, and constraints into AI work.",
      details:
        "Writing-first wedge; Build stays a controlled beta. Positioning: control what AI knows for each task, not universal memory, not a prompt app. Local-first and inspectable.",
      tags: ["continuity", "product", "strategy"],
      priority: "required",
      activation: "suggested",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-audience",
      name: "Early design partner",
      kind: "audience",
      mode: "writing",
      summary: "Curious operator or creator. Smart, busy, skeptical of vague AI promises.",
      details:
        "Respects specificity and honesty. Allergic to hype. Wants to know what is real today versus aspirational.",
      tags: ["outreach", "founder"],
      priority: "preferred",
      activation: "suggested",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-constraint",
      name: "No generic AI language",
      kind: "constraint",
      mode: "both",
      summary: "Avoid 'revolutionary', 'seamless', 'unlock', 'leverage', and vague claims.",
      details:
        "Also avoid 'game-changing', 'cutting-edge', 'effortless', and 'supercharge'. No empty intensifiers. Prefer plain verbs and concrete outcomes.",
      tags: ["writing", "brand"],
      priority: "required",
      activation: "always_on",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-taste",
      name: "Calm editorial control room",
      kind: "taste",
      mode: "both",
      summary:
        "Structured, premium, restrained. No glassmorphism, loud gradients, fake metrics, or generic AI dashboard patterns.",
      details:
        "Editorial spacing and real type hierarchy. Semantic color used sparingly. Hairline rules over heavy cards. Motion only for orientation.",
      tags: ["design", "build", "continuity"],
      priority: "required",
      activation: "suggested",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-decision",
      name: "Writing-first, Build stays beta",
      kind: "decision",
      mode: "both",
      summary:
        "Launch writing first. Build mode stays a controlled beta until the context model proves repeated use in writing.",
      details:
        "Do not let writing, build, and memory become three roadmaps. One core (Context Packs), one wedge (recurring high-context writing).",
      tags: ["strategy", "product"],
      priority: "required",
      activation: "suggested",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-protected",
      name: "Protected systems",
      kind: "constraint",
      mode: "build",
      summary:
        "Never change authentication, routing, database schemas, or payments without explicit sign-off.",
      details:
        "Treat these as out of scope by default. If a task seems to require touching them, stop and flag it instead of proceeding.",
      tags: ["build", "safety"],
      priority: "required",
      activation: "always_on",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "pack-reference",
      name: "Last investor conversation",
      kind: "reference",
      mode: "writing",
      summary: "Notes from the most recent investor meeting to reference in follow-ups.",
      details:
        "They liked the 'context debt' framing and the visible-control angle. Open question: why won't ChatGPT Projects just absorb this? Ask they made: run a 15-user behavioral test.",
      tags: ["outreach", "investor"],
      priority: "optional",
      activation: "manual",
      createdAt: t,
      updatedAt: t,
    },
  ];
}

function seedTasks(): Task[] {
  return [
    {
      id: "task-reid-followup",
      mode: "writing",
      title: "Follow up with Reid after the meeting",
      goal: "Write a warm, specific follow-up that answers the ChatGPT Projects question and proposes the 15-user behavioral test.",
      audience: "Early-stage investor who already knows the project",
      destination: "A follow-up email",
      notes: "Keep it under ~140 words. One clear ask: a 20-minute call next week.",
      tags: ["outreach", "investor", "founder"],
      includePackIds: ["pack-project", "pack-reference"],
      excludePackIds: [],
      rails: defaultRails("writing"),
      targetTool: "Claude",
      createdAt: "2026-06-18T15:00:00.000Z",
      updatedAt: "2026-06-18T15:00:00.000Z",
    },
    {
      id: "task-partner-launch",
      mode: "writing",
      title: "Launch note for design partners",
      goal: "Announce the private MVP to the first design partners and invite them to a 20-minute setup session.",
      audience: "Early design partner",
      destination: "A short email plus a post",
      notes: "",
      tags: ["outreach", "founder"],
      includePackIds: ["pack-project"],
      excludePackIds: ["pack-taste"],
      rails: defaultRails("writing"),
      targetTool: "ChatGPT",
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedAt: "2026-06-20T10:00:00.000Z",
    },
  ];
}

function seedArtifacts(packs: ContextPack[], tasks: Task[]): OutputArtifact[] {
  const reid = tasks.find((t) => t.id === "task-reid-followup")!;
  const compiled = compile(reid, packs);
  return [
    {
      id: "art-reid-1",
      taskId: reid.id,
      mode: "writing",
      targetTool: reid.targetTool,
      prompt: compiled.prompt,
      activePackIds: compiled.activePackIds,
      createdAt: "2026-06-18T15:06:00.000Z",
    },
  ];
}

export function buildSeedWorkspace(): Workspace {
  const packs = seedPacks();
  const tasks = seedTasks();
  return {
    version: 4,
    packs,
    tasks,
    artifacts: seedArtifacts(packs, tasks),
    requests: [],
    drafts: [],
    documents: [],
    contracts: [],
    receipts: [],
    dismissedProposals: [],
    seededDemo: true,
  };
}

export function emptyWorkspace(): Workspace {
  return {
    version: 4,
    packs: [],
    tasks: [],
    artifacts: [],
    requests: [],
    drafts: [],
    documents: [],
    contracts: [],
    receipts: [],
    dismissedProposals: [],
    seededDemo: false,
  };
}
