import { z } from "zod";

/** Runtime schemas mirroring the domain model — used for import + storage validation. */

export const PackKindSchema = z.enum([
  "voice",
  "project",
  "audience",
  "reference",
  "constraint",
  "decision",
  "taste",
]);

export const ModeSchema = z.enum(["writing", "build"]);
export const PackScopeSchema = z.enum(["writing", "build", "both"]);
export const PrioritySchema = z.enum(["required", "preferred", "optional"]);
export const ActivationSchema = z.enum(["always_on", "suggested", "manual"]);
export const TargetToolSchema = z.enum([
  "ChatGPT",
  "Claude",
  "Claude Code",
  "Lovable",
  "Generic",
]);

export const ContextPackSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: PackKindSchema,
  mode: PackScopeSchema,
  summary: z.string(),
  details: z.string(),
  tags: z.array(z.string()),
  priority: PrioritySchema,
  activation: ActivationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  mode: ModeSchema,
  title: z.string(),
  goal: z.string(),
  audience: z.string(),
  destination: z.string(),
  notes: z.string(),
  tags: z.array(z.string()),
  includePackIds: z.array(z.string()),
  excludePackIds: z.array(z.string()),
  rails: z.record(z.string(), z.number()),
  targetTool: TargetToolSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OutputArtifactSchema = z.object({
  id: z.string().min(1),
  taskId: z.string(),
  mode: ModeSchema,
  targetTool: TargetToolSchema,
  prompt: z.string(),
  activePackIds: z.array(z.string()),
  createdAt: z.string(),
});

export const ReactionSchema = z.enum([
  "more_like_me",
  "shorter",
  "warmer",
  "more_direct",
  "less_polished",
  "reframe",
  "safer",
  "bolder",
  "more_editorial",
  "keep_structure",
  "plan_first",
]);

export const QuickRequestSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  inferredMode: ModeSchema,
  selectedMode: ModeSchema,
  spaceId: z.string().optional(),
  source: z.string().optional(),
  includeIds: z.array(z.string()),
  excludeIds: z.array(z.string()),
  targetTool: TargetToolSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DraftSchema = z.object({
  id: z.string().min(1),
  requestId: z.string(),
  mode: ModeSchema,
  content: z.string(),
  provider: z.string().optional(),
  reaction: ReactionSchema.optional(),
  activeContextIds: z.array(z.string()),
  parentDraftId: z.string().optional(),
  createdAt: z.string(),
});

export const WorkspaceSchema = z.object({
  version: z.number(),
  packs: z.array(ContextPackSchema),
  tasks: z.array(TaskSchema),
  artifacts: z.array(OutputArtifactSchema),
  // V5 — optional with defaults so V4 (v1) data and exports load without loss.
  requests: z.array(QuickRequestSchema).default([]),
  drafts: z.array(DraftSchema).default([]),
  dismissedProposals: z.array(z.string()),
  seededDemo: z.boolean(),
});
