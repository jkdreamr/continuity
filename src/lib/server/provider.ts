import { resolveProviderConfig, type ProviderConfig } from "@/lib/server/providerConfig";

/**
 * Server-only provider adapter. This module reads `process.env` and must never
 * be imported from a client component — it is only used by the API route. The
 * key is never returned to the caller; only the generated text is.
 */
export type GenerateArgs = { system: string; user: string; signal?: AbortSignal };

export interface ProviderAdapter {
  name: string;
  model: string;
  generate(args: GenerateArgs): Promise<string>;
}

export function getAdapter(): ProviderAdapter | null {
  const config = resolveProviderConfig(process.env);
  if (!config) return null;
  if (config.provider === "anthropic") return anthropicAdapter(config);
  if (config.provider === "openai") return openaiAdapter(config);
  return openrouterAdapter(config);
}

const MAX_TOKENS = 1500;

function anthropicAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    name: "anthropic",
    model: config.model,
    async generate({ system, user, signal }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`anthropic_${res.status}`);
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      if (!text) throw new Error("empty_response");
      return text;
    },
  };
}

function openaiAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    name: "openai",
    model: config.model,
    async generate({ system, user, signal }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`openai_${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (data.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("empty_response");
      return text;
    },
  };
}

/**
 * OpenRouter — OpenAI-compatible, so the request/response shape mirrors the
 * OpenAI adapter; only the base URL, auth, and an identifying X-Title differ.
 * One key reaches many models (incl. free tiers) via `OPENROUTER_MODEL`.
 */
function openrouterAdapter(config: ProviderConfig): ProviderAdapter {
  return {
    name: "openrouter",
    model: config.model,
    async generate({ system, user, signal }) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
          "X-Title": "Continuity",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`openrouter_${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (data.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("empty_response");
      return text;
    },
  };
}
