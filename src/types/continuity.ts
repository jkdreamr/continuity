/**
 * Continuity domain model.
 *
 * Technical north star (from the thesis): a Context Pack must be an *inspectable
 * artifact*, not an invisible model state. Every active item carries content,
 * type, scope, source, and a one-line reason it is included. These types encode
 * that contract.
 */

export type Mode = "writing" | "build";

/** Where a pack may apply. */
export type PackScope = Mode | "both";

/**
 * The kind of context a pack carries. Friendly labels live in `PACK_KIND_META`
 * (src/lib/packKinds.ts) — we never lead the UI with the raw enum.
 */
export type PackKind =
  | "voice" // How I sound
  | "project" // What this project is
  | "audience" // Who I am speaking to
  | "reference" // Source material to draw on
  | "constraint" // What must not change
  | "decision" // What I have already decided
  | "taste"; // Visual direction

export type PackPriority = "required" | "preferred" | "optional";

export type PackActivation = "always_on" | "suggested" | "manual";

export type ContextPack = {
  id: string;
  name: string;
  kind: PackKind;
  mode: PackScope;
  summary: string;
  details: string;
  tags: string[];
  priority: PackPriority;
  activation: PackActivation;
  createdAt: string;
  updatedAt: string;
};

export type TargetTool = "ChatGPT" | "Claude" | "Claude Code" | "Lovable" | "Generic";

export type Task = {
  id: string;
  mode: Mode;
  title: string;
  goal: string;
  audience: string;
  destination: string;
  notes: string;
  tags: string[];
  /** Packs the user manually switched ON for this task (overrides "off by default"). */
  includePackIds: string[];
  /** Packs the user manually switched OFF for this task (overrides always-on / suggested). */
  excludePackIds: string[];
  /** Rail id -> value in 0..100. */
  rails: Record<string, number>;
  targetTool: TargetTool;
  createdAt: string;
  updatedAt: string;
};

export type OutputArtifact = {
  id: string;
  taskId: string;
  mode: Mode;
  targetTool: TargetTool;
  prompt: string;
  activePackIds: string[];
  createdAt: string;
};

/**
 * The result of running the deterministic selection algorithm over one pack for
 * a given task. `state` decides whether the pack reaches the compiler; `reason`
 * is the user-facing, one-line "why".
 */
export type DecisionState =
  | "active" // will be carried into the prompt
  | "available" // eligible, but off by default — user can add it
  | "excluded" // user removed it from this task
  | "unavailable"; // wrong mode — a hard boundary, cannot be used here

export type PackDecision = {
  pack: ContextPack;
  state: DecisionState;
  reason: string;
};

/** A compiled, copyable prompt plus the provenance needed to inspect it. */
export type CompiledPrompt = {
  prompt: string;
  activePackIds: string[];
  /** Section title -> rendered body, used for the inspectable preview. */
  sections: { title: string; body: string }[];
};

export type ProposalKind =
  | "promote_always_on"
  | "create_voice_pack"
  | "confirm_build_scope";

/**
 * A memory proposal is derived *only* from saved choices — never from hidden
 * inference. Ids are content-deterministic so a dismissal sticks.
 */
export type MemoryProposal = {
  id: string;
  kind: ProposalKind;
  title: string;
  detail: string;
  actionLabel: string;
  /** Opaque payload resolved by the workspace action layer. */
  payload: Record<string, string>;
};

export type Workspace = {
  version: number;
  packs: ContextPack[];
  tasks: Task[];
  artifacts: OutputArtifact[];
  /** Proposal ids the user has dismissed, so we don't nag. */
  dismissedProposals: string[];
  seededDemo: boolean;
};
