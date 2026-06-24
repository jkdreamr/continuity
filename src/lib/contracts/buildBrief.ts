import type {
  ContextContract,
  ContextPack,
  ContinuityReceipt,
  ContractItem,
  Task,
} from "@/types/continuity";
import { compileActive } from "@/lib/compile";
import { kindMeta } from "@/lib/packKinds";
import { getRail, phraseFor, railBand } from "@/lib/rails";
import { buildContextContract } from "@/lib/contracts/buildContextContract";
import { makeContractItem } from "@/lib/contracts/extractContractItems";
import { generateContinuityReceipt } from "@/lib/contracts/generateContinuityReceipt";

/**
 * The Contracted Build Brief (V8). The Build prompt is no longer a bare prompt:
 * it's a brief that names the objective, the context it relies on, the decisions
 * and protected areas it must preserve, the scope (and its boundary), how to
 * verify, and how to roll back, then the exact prompt to paste, plus a
 * Continuity Receipt so the build is accountable to the contract.
 *
 * It is a thin, deterministic wrapper over the existing compiler, the prompt to
 * paste is `compileActive(...)` verbatim, so the V7 Build workflow is preserved.
 */

export const BRIEF_SECTION_TITLES = [
  "Objective",
  "Current context",
  "Decisions to preserve",
  "Protected areas",
  "Scope",
  "Out of scope",
  "Implementation direction",
  "Acceptance checks",
  "Verification commands",
  "Rollback notes",
] as const;

export type BriefSection = { title: string; body: string };

export type ContractedBuildBrief = {
  objective: string;
  sections: BriefSection[];
  /** The exact prompt to paste, the deterministic compiler output, unchanged. */
  promptToPaste: string;
  /** The contract the brief is accountable to (supplied or derived from packs). */
  contract: ContextContract;
  /** Always-five-section receipt for this build. */
  receipt: ContinuityReceipt;
};

function packText(p: ContextPack): string {
  return [p.summary, p.details].map((s) => s.trim()).filter(Boolean).join(" ");
}

function railValue(task: Task, id: string): number {
  const v = task.rails[id];
  return typeof v === "number" ? v : getRail(id)?.default ?? 50;
}

function railLine(task: Task, id: string): string | null {
  const r = getRail(id);
  return r ? `- ${phraseFor(r, railValue(task, id))}` : null;
}

/** Project the active packs into contract items so the brief is accountable. */
export function packsToContractItems(active: ContextPack[]): ContractItem[] {
  const items: ContractItem[] = [];
  for (const p of active) {
    if (p.kind === "constraint")
      items.push(makeContractItem("constraint", packText(p), "high", { source: "user_stated" }));
    else if (p.kind === "decision")
      items.push(makeContractItem("decision", packText(p), "high", { source: "user_stated" }));
    else if (p.kind === "project" || p.kind === "reference")
      items.push(makeContractItem("approved_fact", packText(p), "medium", { source: "user_stated" }));
  }
  return items;
}

export function buildContractedBrief(
  task: Task,
  active: ContextPack[],
  opts: { contract?: ContextContract; approach?: { label: string; additions: string[] } } = {},
): ContractedBuildBrief {
  const goal = task.goal.trim();
  const objective =
    [task.title.trim(), goal].filter(Boolean).join(", ") || "(no objective specified)";

  const byKind = (k: ContextPack["kind"]) => active.filter((p) => p.kind === k);
  const bullet = (p: ContextPack) => `- [${kindMeta(p.kind).noun}] ${p.name}, ${packText(p)}`;

  // 2. Current context, what is true right now.
  const currentContext = [
    ...byKind("project"),
    ...byKind("reference"),
    ...byKind("audience"),
  ].map(bullet);
  if (task.notes.trim()) currentContext.push(`- Note: ${task.notes.trim()}`);

  // 3. Decisions to preserve.
  const decisions = byKind("decision").map(bullet);

  // 4. Protected areas, do not change.
  const protectedAreas = byKind("constraint").map((p) => `- ${packText(p)}`);
  if (railBand(railValue(task, "boldness")) === "low")
    protectedAreas.push(
      "- Do not alter database schemas, authentication, routing, or unrelated components.",
    );
  if (railBand(railValue(task, "behavior")) === "low")
    protectedAreas.push("- Preserve all existing behavior; make only the changes named in Scope.");

  // 5. Scope.
  const scope = [`- Change: ${goal || "(unspecified)"}`];
  for (const id of ["structure", "expression"]) {
    const line = railLine(task, id);
    if (line) scope.push(line);
  }

  // 6. Out of scope, the boundary.
  const outOfScope = [
    "- Anything not named in Scope above.",
    "- New dependencies, data migrations, or schema changes unless explicitly required here.",
    ...byKind("constraint").map((p) => `- ${packText(p)}`),
  ];

  // 7. Implementation direction (lead with the recommended approach module).
  const implementation: string[] = [];
  if (opts.approach) {
    implementation.push(`- Approach: ${opts.approach.label}.`);
    for (const a of opts.approach.additions) implementation.push(`- ${a}`);
  }
  for (const id of ["boldness", "behavior"]) {
    const line = railLine(task, id);
    if (line) implementation.push(line);
  }
  for (const p of byKind("taste")) implementation.push(`- Honor the visual direction, ${packText(p)}`);
  if (!implementation.length) implementation.push("- Make the smallest change that satisfies the objective.");

  // 8. Acceptance checks.
  const acceptance = [
    `- The change achieves: ${goal || "the stated objective"}.`,
    '- Nothing under "Protected areas" is modified.',
    "- Layout holds from 375px to desktop; keyboard focus stays visible.",
    "- Empty and error states are handled.",
  ];

  // 9. Verification commands.
  const verification = [
    "- npm run lint",
    "- npm run typecheck",
    "- npm run test",
    "- npm run build",
    "- Manually verify the objective and that protected areas are untouched.",
  ];

  // 10. Rollback notes.
  const rollback = [
    "- This brief requests no data migrations; reverting the change set fully restores prior state.",
    "- If behavior regresses, restore the previous version of the touched components and re-run verification.",
  ];

  const sections: BriefSection[] = [
    { title: "Objective", body: objective },
    { title: "Current context", body: currentContext.join("\n") || "- (none captured yet)" },
    { title: "Decisions to preserve", body: decisions.join("\n") || "- (none recorded)" },
    { title: "Protected areas", body: protectedAreas.join("\n") || "- (none specified)" },
    { title: "Scope", body: scope.join("\n") },
    { title: "Out of scope", body: outOfScope.join("\n") },
    { title: "Implementation direction", body: implementation.join("\n") },
    { title: "Acceptance checks", body: acceptance.join("\n") },
    { title: "Verification commands", body: verification.join("\n") },
    { title: "Rollback notes", body: rollback.join("\n") },
  ];

  const promptToPaste = compileActive(task, active).prompt;

  const contract =
    opts.contract ??
    buildContextContract({
      name: task.title.trim() || "Build brief",
      taskType: "build",
      objective: goal,
      items: packsToContractItems(active),
      sourceArtifactIds: [task.id],
    });

  const receipt = generateContinuityReceipt({
    text: [objective, scope.join("\n"), decisions.join("\n"), implementation.join("\n")].join("\n"),
    contract,
    artifactId: task.id,
    contextUsed: contract.items,
  });

  return { objective, sections, promptToPaste, contract, receipt };
}

/** Render the whole brief as copyable markdown (all twelve parts). */
export function briefToMarkdown(brief: ContractedBuildBrief): string {
  const parts = brief.sections.map((s) => `## ${s.title}\n${s.body}`);
  parts.push(`## Prompt to paste\n\n\`\`\`\n${brief.promptToPaste}\n\`\`\``);
  return ["# Contracted Build Brief", "", ...parts].join("\n\n");
}
