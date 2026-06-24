/**
 * Pure provider-configuration resolution. Takes an env map (so it is unit
 * testable) and never reads `NEXT_PUBLIC_*` — provider keys are server-only.
 * `providerStatus` deliberately omits the key so it is safe to return to the
 * client. The actual API call reads `process.env` in a `server-only` module.
 */

export type ProviderName = "anthropic" | "openai" | "openrouter";
export type ProviderConfig = { provider: ProviderName; model: string; apiKey: string };
export type ProviderStatus = { configured: boolean; provider?: ProviderName; model?: string };

const DEFAULT_MODEL: Record<ProviderName, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
  // A stable, free, structured-output-friendly default. Override with
  // OPENROUTER_MODEL (paste the exact slug from the OpenRouter model page).
  openrouter: "openai/gpt-oss-120b:free",
};

type Env = Record<string, string | undefined>;

export function resolveProviderConfig(env: Env): ProviderConfig | null {
  const preference = (env.AI_PROVIDER ?? "").toLowerCase();

  const builders: Record<ProviderName, () => ProviderConfig | null> = {
    anthropic: () =>
      env.ANTHROPIC_API_KEY
        ? { provider: "anthropic", model: env.ANTHROPIC_MODEL || DEFAULT_MODEL.anthropic, apiKey: env.ANTHROPIC_API_KEY }
        : null,
    openai: () =>
      env.OPENAI_API_KEY
        ? { provider: "openai", model: env.OPENAI_MODEL || DEFAULT_MODEL.openai, apiKey: env.OPENAI_API_KEY }
        : null,
    openrouter: () =>
      env.OPENROUTER_API_KEY
        ? { provider: "openrouter", model: env.OPENROUTER_MODEL || DEFAULT_MODEL.openrouter, apiKey: env.OPENROUTER_API_KEY }
        : null,
  };

  // Auto (no preference): first key present, Anthropic preferred. An explicit
  // AI_PROVIDER is tried first, then falls back to whatever else is configured.
  const autoOrder: ProviderName[] = ["anthropic", "openai", "openrouter"];
  const order =
    preference in builders
      ? [preference as ProviderName, ...autoOrder.filter((p) => p !== preference)]
      : autoOrder;

  for (const name of order) {
    const config = builders[name]();
    if (config) return config;
  }
  return null;
}

export function providerStatus(env: Env): ProviderStatus {
  const config = resolveProviderConfig(env);
  if (!config) return { configured: false };
  return { configured: true, provider: config.provider, model: config.model };
}
