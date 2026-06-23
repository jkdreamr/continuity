/**
 * Pure provider-configuration resolution. Takes an env map (so it is unit
 * testable) and never reads `NEXT_PUBLIC_*` — provider keys are server-only.
 * `providerStatus` deliberately omits the key so it is safe to return to the
 * client. The actual API call reads `process.env` in a `server-only` module.
 */

export type ProviderName = "anthropic" | "openai";
export type ProviderConfig = { provider: ProviderName; model: string; apiKey: string };
export type ProviderStatus = { configured: boolean; provider?: ProviderName; model?: string };

const DEFAULT_MODEL: Record<ProviderName, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
};

type Env = Record<string, string | undefined>;

export function resolveProviderConfig(env: Env): ProviderConfig | null {
  const preference = (env.AI_PROVIDER ?? "").toLowerCase();
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;

  const anthropic = (): ProviderConfig | null =>
    anthropicKey
      ? { provider: "anthropic", model: env.ANTHROPIC_MODEL || DEFAULT_MODEL.anthropic, apiKey: anthropicKey }
      : null;
  const openai = (): ProviderConfig | null =>
    openaiKey
      ? { provider: "openai", model: env.OPENAI_MODEL || DEFAULT_MODEL.openai, apiKey: openaiKey }
      : null;

  if (preference === "anthropic") return anthropic() ?? openai();
  if (preference === "openai") return openai() ?? anthropic();
  // Auto: first available, Anthropic preferred.
  return anthropic() ?? openai();
}

export function providerStatus(env: Env): ProviderStatus {
  const config = resolveProviderConfig(env);
  if (!config) return { configured: false };
  return { configured: true, provider: config.provider, model: config.model };
}
