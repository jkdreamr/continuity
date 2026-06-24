import type {
  CompiledPrompt,
  ContextPack,
  PackKind,
  Task,
} from "@/types/continuity";
import { activePacks } from "@/lib/selection";
import { kindMeta } from "@/lib/packKinds";
import { BUILD_RAILS, WRITING_RAILS, getRail, phraseFor, railBand } from "@/lib/rails";

/**
 * Deterministic prompt compiler. Converts the active Context Packs plus the
 * task's rail values into a readable, paste-ready prompt. Two surfaces (writing
 * and build) share this engine; the only model-/tool-specific part is a thin
 * framing wrapper.
 */

function railValue(task: Task, railId: string): number {
  const v = task.rails[railId];
  if (typeof v === "number") return v;
  return getRail(railId)?.default ?? 50;
}

function packText(pack: ContextPack): string {
  return [pack.summary, pack.details]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function packLine(pack: ContextPack): string {
  return `- [${kindMeta(pack.kind).noun}] ${pack.name}, ${packText(pack)}`;
}

function orderByKind(packs: ContextPack[], order: PackKind[]): ContextPack[] {
  return order.flatMap((k) => packs.filter((p) => p.kind === k));
}

type Section = { title: string; body: string };

function buildWritingSections(task: Task, active: ContextPack[]): Section[] {
  const sections: Section[] = [];

  const role = [`You are helping me with a writing task${task.title ? `: ${task.title}` : ""}.`];
  if (task.goal.trim()) role.push(`Goal: ${task.goal.trim()}`);
  sections.push({ title: "Role and task", body: role.join("\n") });

  const audience: string[] = [
    `Audience: ${task.audience.trim() || "general reader (unspecified)"}.`,
    `Destination: ${task.destination.trim() || "unspecified"}.`,
  ];
  for (const p of active.filter((p) => p.kind === "audience")) {
    audience.push(`- ${p.name}: ${packText(p)}`);
  }
  sections.push({ title: "Audience and destination", body: audience.join("\n") });

  const context = orderByKind(active, ["voice", "project", "decision", "reference", "taste"]);
  if (context.length) {
    sections.push({ title: "Active context", body: context.map(packLine).join("\n") });
  }

  const required = active.filter(
    (p) => p.kind === "decision" || (p.kind === "constraint" && p.priority === "required"),
  );
  if (required.length) {
    const lines = required.map((p) =>
      p.kind === "decision"
        ? `- Keep to a decision already made, ${p.name}: ${packText(p)}`
        : `- Must: ${packText(p)}`,
    );
    sections.push({ title: "Required constraints", body: lines.join("\n") });
  }

  const tone = WRITING_RAILS.map((r) => `- ${phraseFor(r, railValue(task, r.id))}`);
  sections.push({ title: "Tone and intent", body: tone.join("\n") });

  const deliverable = [
    `Deliver a ready-to-use ${task.destination.trim() || "draft"} I can paste directly.`,
    "Return only the draft, no preamble, notes, or meta-commentary.",
  ];
  sections.push({ title: "Deliverable format", body: deliverable.join("\n") });

  const avoid: string[] = [];
  for (const p of active.filter((p) => p.kind === "constraint" && p.priority !== "required")) {
    avoid.push(`- ${packText(p)}`);
  }
  if (railBand(railValue(task, "fidelity")) === "low") {
    avoid.push("- Don't rephrase wording I've already provided.");
  }
  avoid.push("- Anything not supported by the context above; invented facts; empty praise.");
  sections.push({ title: "What to avoid", body: avoid.join("\n") });

  return sections;
}

function buildBuildSections(task: Task, active: ContextPack[]): Section[] {
  const sections: Section[] = [];

  sections.push({
    title: "Project task",
    body: [task.title, task.goal].map((s) => s.trim()).filter(Boolean).join("\n") || "(no goal specified)",
  });

  const context = orderByKind(active, ["project", "taste", "decision", "reference", "audience"]);
  if (context.length) {
    sections.push({
      title: "Relevant product and visual context",
      body: context.map(packLine).join("\n"),
    });
  }

  const scope: string[] = [`Change: ${task.goal.trim() || "(unspecified)"}`];
  if (task.notes.trim()) scope.push(`Notes: ${task.notes.trim()}`);
  scope.push(`- ${phraseFor(getRail("structure")!, railValue(task, "structure"))}`);
  scope.push(`- ${phraseFor(getRail("expression")!, railValue(task, "expression"))}`);
  sections.push({ title: "Scope", body: scope.join("\n") });

  const protect: string[] = [];
  for (const p of active.filter((p) => p.kind === "constraint")) {
    protect.push(`- ${packText(p)}`);
  }
  if (railBand(railValue(task, "boldness")) === "low") {
    protect.push(
      "- Do not alter database schemas, authentication, routing, or unrelated components. Do not change existing behavior unless this task explicitly requires it.",
    );
  }
  if (railBand(railValue(task, "behavior")) === "low") {
    protect.push("- Preserve all existing behavior; make visual and textual changes only.");
  }
  protect.push("- Anything not named in Scope above.");
  sections.push({ title: "Do not change", body: protect.join("\n") });

  const impl: string[] = [
    `- ${phraseFor(getRail("boldness")!, railValue(task, "boldness"))}`,
    `- ${phraseFor(getRail("behavior")!, railValue(task, "behavior"))}`,
  ];
  for (const p of active.filter((p) => p.kind === "taste")) {
    impl.push(`- Honor the visual direction, ${packText(p)}`);
  }
  sections.push({ title: "Implementation direction", body: impl.join("\n") });

  const acceptance: string[] = [
    `- The change achieves: ${task.goal.trim() || "the stated goal"}.`,
    '- Nothing in "Do not change" is modified.',
    "- Layout holds from 375px to desktop.",
    "- Keyboard focus stays visible; empty and error states are handled.",
  ];
  for (const p of active.filter((p) => p.kind === "decision")) {
    acceptance.push(`- Consistent with: ${packText(p)}`);
  }
  sections.push({ title: "Acceptance criteria", body: acceptance.join("\n") });

  sections.push({
    title: "Verification",
    body: [
      "- Run the relevant tests.",
      "- Verify responsive behavior.",
      "- Check keyboard focus and empty/error states.",
      "- Do not leave placeholder interactions.",
    ].join("\n"),
  });

  return sections;
}

function framing(task: Task): { header: string; footer: string } {
  if (task.mode === "build") {
    const footers: Record<Task["targetTool"], string> = {
      "Claude Code":
        "Tool, Claude Code: work in small, verifiable steps. Show a short plan before editing, and stop if scope grows beyond the above.",
      Lovable:
        'Tool, Lovable: apply this as a scoped change to the current project. Keep everything under "Do not change" intact.',
      "Generic": "Tool, generic builder: keep the change strictly within the scope above.",
      ChatGPT: "Tool, ChatGPT: produce a precise change plan; do not invent project details.",
      Claude: "Tool, Claude: produce a precise change plan; do not invent project details.",
    };
    return { header: "", footer: footers[task.targetTool] };
  }

  const headers: Record<Task["targetTool"], string> = {
    ChatGPT: "Use the structured context below as the grounding for this writing task.",
    Claude: "Here's the context for this task, treat it as decisions I've already made.",
    "Claude Code": "Use the context below as the grounding for this task.",
    Lovable: "Use the context below as the grounding for this task.",
    "Generic": "Use the context below; it reflects decisions I've already made. Then write the piece.",
  };
  return { header: headers[task.targetTool], footer: "" };
}

function render(task: Task, sections: Section[]): string {
  const body = sections.map((s) => `${s.title.toUpperCase()}\n${s.body}`).join("\n\n");
  const { header, footer } = framing(task);
  return [header, body, footer].filter(Boolean).join("\n\n");
}

/** Compile from an explicit active set (used by the V5 context mix). */
export function compileActive(task: Task, active: ContextPack[]): CompiledPrompt {
  const sections =
    task.mode === "build" ? buildBuildSections(task, active) : buildWritingSections(task, active);
  return {
    prompt: render(task, sections),
    activePackIds: active.map((p) => p.id),
    sections,
  };
}

export function compile(task: Task, allPacks: ContextPack[]): CompiledPrompt {
  return compileActive(task, activePacks(task, allPacks));
}

export { WRITING_RAILS, BUILD_RAILS };
