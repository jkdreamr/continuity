import type { ContextPack, PackKind } from "@/types/continuity";
import { kindMeta } from "@/lib/packKinds";

/**
 * Builds the chat messages sent to the provider for Writing generation. Only the
 * active context, the request, explicitly-supplied source text, and any reaction
 * instruction are included, never the full workspace.
 */
export type GenerationMessages = { system: string; user: string };

export type GenerationInput = {
  text: string;
  source?: string;
  reactionInstruction?: string;
};

function block(title: string, lines: string[]): string {
  return lines.length ? `${title}\n${lines.join("\n")}` : "";
}

function packText(p: ContextPack): string {
  return [p.summary, p.details].map((s) => s.trim()).filter(Boolean).join(" ");
}

function byKinds(packs: ContextPack[], kinds: PackKind[]): ContextPack[] {
  return kinds.flatMap((k) => packs.filter((p) => p.kind === k));
}

export function buildGenerationMessages(input: GenerationInput, activePacks: ContextPack[]): GenerationMessages {
  const voice = byKinds(activePacks, ["voice"]);
  const guardrails = byKinds(activePacks, ["constraint", "decision"]);
  const facts = byKinds(activePacks, ["project", "audience", "reference", "taste"]);

  const systemParts = [
    "You are helping me write. Produce a finished, ready-to-use draft I can send or publish.",
    "Treat the context below as decisions I have already made. Write in my voice. Do not invent facts.",
    "Return only the draft itself, no preamble, no explanation, no options, no meta-commentary.",
    block(
      "MY VOICE",
      voice.map((p) => `- ${packText(p)}`),
    ),
    block(
      "KEEP TRUE (hard rules)",
      guardrails.map((p) => `- ${p.name}: ${packText(p)}`),
    ),
    block(
      "WHAT THIS IS",
      facts.map((p) => `- ${kindMeta(p.kind).noun}: ${p.name}, ${packText(p)}`),
    ),
  ].filter(Boolean);

  const userParts = [input.text.trim()];
  if (input.source?.trim()) userParts.push(`\nSource material to work from:\n"""\n${input.source.trim()}\n"""`);
  if (input.reactionInstruction?.trim()) userParts.push(`\nAdjustment: ${input.reactionInstruction.trim()}`);

  return { system: systemParts.join("\n\n"), user: userParts.join("\n") };
}

/** Flatten messages into one readable prompt for the "View prompt" / no-provider state. */
export function flattenMessages(messages: GenerationMessages): string {
  return `${messages.system}\n\nREQUEST\n${messages.user}`;
}
