import type { PackActivation, PackPriority, PackScope } from "@/types/continuity";

export const ACTIVATION_LABEL: Record<PackActivation, string> = {
  always_on: "Always On",
  suggested: "Suggested",
  manual: "Manual",
};

export const PRIORITY_LABEL: Record<PackPriority, string> = {
  required: "Required",
  preferred: "Preferred",
  optional: "Optional",
};

export const SCOPE_LABEL: Record<PackScope, string> = {
  writing: "Writing",
  build: "Build",
  both: "Writing & Build",
};

export const ACTIVATION_HELP: Record<PackActivation, string> = {
  always_on: "Included by default in every matching task.",
  suggested: "Offered when a task's tags or mode match.",
  manual: "Off until you add it to a task.",
};

export const PRIORITY_HELP: Record<PackPriority, string> = {
  required: "Treated as a hard rule in the compiled prompt.",
  preferred: "Strongly weighted, but not a hard rule.",
  optional: "Used when relevant; safe to leave out.",
};
