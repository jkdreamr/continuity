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

// --- V5: the frictionless layer ---------------------------------------------

/** A single natural-language ask that becomes a Writing or Build task. */
export type QuickRequest = {
  id: string;
  text: string;
  inferredMode: Mode;
  selectedMode: Mode;
  /** Pinned Space (a project-kind pack id) for this request, if any. */
  spaceId?: string;
  /** Task-local source text the user explicitly pasted/used. Never auto-collected. */
  source?: string;
  /** Per-request manual overrides of the automatic mix. */
  includeIds: string[];
  excludeIds: string[];
  targetTool: TargetTool;
  createdAt: string;
  updatedAt: string;
};

/** Which of the four context layers an item belongs to (user-facing grouping). */
export type ContextLayer = "voice" | "space" | "guardrail" | "moment";

export type ContextSource = "baseline" | "space" | "keyword" | "recent" | "manual";

export type ContextConfidence = "high" | "medium" | "low";

/** One resolved piece of context for a request, with its provenance and reason. */
export type ContextMixItem = {
  contextId: string;
  layer: ContextLayer;
  source: ContextSource;
  reason: string;
  confidence: ContextConfidence;
  userOverride?: "include" | "exclude";
};

/** An editable generated output (writing draft or build brief), autosaved. */
export type Draft = {
  id: string;
  requestId: string;
  mode: Mode;
  content: string;
  /** "anthropic" | "openai" for writing; "compiler" for build briefs. */
  provider?: string;
  /** The reaction that produced this revision, if any. */
  reaction?: Reaction;
  /** Snapshot of the active context ids at generation time. */
  activeContextIds: string[];
  parentDraftId?: string;
  createdAt: string;
};

export type WritingReaction =
  | "more_like_me"
  | "shorter"
  | "warmer"
  | "more_direct"
  | "less_polished"
  | "reframe";

export type BuildReaction =
  | "safer"
  | "bolder"
  | "more_editorial"
  | "keep_structure"
  | "plan_first";

export type Reaction = WritingReaction | BuildReaction;

// --- V7: the Writing Agent ---------------------------------------------------

export type DocumentKind =
  | "manager_email"
  | "investor_follow_up"
  | "memo"
  | "post"
  | "reply"
  | "other";

export type Relationship = "manager" | "peer" | "investor" | "customer" | "public";

/** A task-local, editable inference about the current document. Never durable. */
export type DocumentBrief = {
  kind: DocumentKind;
  goal?: string;
  audience?: string;
  relationship?: Relationship;
  tone?: string[];
  facts: string[];
  unknowns: string[];
  confidence: ContextConfidence;
  source: "user_stated" | "inferred_from_document";
};

export type WritingDocument = {
  id: string;
  title: string;
  /** ProseMirror/Tiptap JSON. Loosely typed to keep this module framework-free. */
  contentJson: unknown;
  plainText: string;
  mode: "writing";
  brief?: DocumentBrief;
  liveHelpEnabled: boolean;
  activeMemoryOverrides: { includeIds: string[]; excludeIds: string[] };
  /** V8 — contracts/receipts attached to this document (optional, back-compat). */
  contractIds?: string[];
  receiptIds?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

/** V8 — continuity-aware insight categories (not generic grammar). */
export type InsightKind =
  | "unclear_ask"
  | "accidental_commitment"
  | "unsupported_specificity"
  | "contradicts_contract"
  | "missing_context"
  | "relationship_mismatch"
  | "decision_drift"
  | "overpromise";

export type DocumentInsight = {
  id: string;
  kind: InsightKind;
  from: number;
  to: number;
  severity: "low" | "medium" | "high";
  message: string;
  rationale: string;
  /** A single safe action label, e.g. "Save commitment", "Reconcile". */
  safeAction?: string;
  /** Evidence excerpt or the contract item id this references. */
  evidence?: string;
  contractItemId?: string;
  proposedText?: string;
};

// --- V8: Context Contracts & Continuity Receipts -----------------------------

export type EvidenceSource =
  | "user_stated"
  | "pasted_source"
  | "imported"
  | "approved_draft"
  | "prior_receipt"
  | "document";

/** Where a truth came from — every contract item must carry at least one. */
export type EvidenceRef = { source: EvidenceSource; excerpt: string };

export type ContractItemKind =
  | "approved_fact"
  | "decision"
  | "commitment"
  | "constraint"
  | "open_question"
  | "relationship_note"
  | "tone_rule";

export type ContractItemStatus = "proposed" | "active" | "rejected" | "expired";
export type ContractScope = "task" | "document" | "project" | "person" | "global";
export type Confidence = "high" | "medium" | "low";
export type Sensitivity = "normal" | "private" | "sensitive";
export type ApplyPolicy = "auto" | "review" | "manual_only" | "never_auto";

/** One inspectable truth: a decision, commitment, constraint, fact, etc. */
export type ContractItem = {
  id: string;
  kind: ContractItemKind;
  statement: string;
  status: ContractItemStatus;
  scope: ContractScope;
  evidence: EvidenceRef[];
  confidence: Confidence;
  sensitivity: Sensitivity;
  applyPolicy: ApplyPolicy;
  createdAt: string;
  updatedAt: string;
};

export type ContextContract = {
  id: string;
  name: string;
  taskType: "writing" | "build" | "check";
  objective?: string;
  items: ContractItem[];
  sourceArtifactIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ReceiptConflict = {
  id: string;
  statement: string;
  /** Contract item id or a plain statement the output conflicts with. */
  conflictsWith: string;
  severity: "low" | "medium" | "high";
  rationale: string;
  evidence: EvidenceRef[];
};

/** The operational receipt produced after meaningful AI work. Always 5 sections. */
export type ContinuityReceipt = {
  id: string;
  artifactId: string;
  contractId: string;
  contextUsed: ContractItem[];
  commitmentsCreated: ContractItem[];
  assumptionsMade: ContractItem[];
  contradictions: ReceiptConflict[];
  carryForwardCandidates: ContractItem[];
  createdAt: string;
};

export type Workspace = {
  /** 1 = V4; 2 = V5; 3 = V7 (documents); 4 = V8 (contracts + receipts). */
  version: number;
  packs: ContextPack[];
  tasks: Task[];
  artifacts: OutputArtifact[];
  /** V5 */
  requests: QuickRequest[];
  drafts: Draft[];
  /** V7 */
  documents: WritingDocument[];
  /** V8 */
  contracts: ContextContract[];
  receipts: ContinuityReceipt[];
  /** Proposal ids the user has dismissed, so we don't nag. */
  dismissedProposals: string[];
  seededDemo: boolean;
};
