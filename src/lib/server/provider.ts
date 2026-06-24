import { resolveProviderConfig, type ProviderConfig } from "@/lib/server/providerConfig";

/**
 * Server-only provider adapter. This module reads `process.env` and must never
 * be imported from a client component, it is only used by the API route. The
 * key is never returned to the caller; only the generated text is.
 *
 * `generate` returns a full string (used for JSON-shaped tasks). `stream` returns
 * a plain-text token stream, used for interactive live-Tune rewrites. Interactive
 * calls pass `fast: true` to use `AI_FAST_MODEL` when configured.
 */
export type GenerateArgs = { system: string; user: string; signal?: AbortSignal };

export interface ProviderAdapter {
  name: string;
  model: string;
  fastModel: string;
  generate(args: GenerateArgs): Promise<string>;
  stream(args: GenerateArgs & { fast?: boolean }): Promise<ReadableStream<Uint8Array>>;
}

export function getAdapter(): ProviderAdapter | null {
  const config = resolveProviderConfig(process.env);
  if (!config) return null;
  if (config.provider === "anthropic") return anthropicAdapter(config);
  if (config.provider === "openai") return openaiAdapter(config);
  return openrouterAdapter(config);
}

const MAX_TOKENS = 1500;

/** Transform an upstream SSE body into a plain-text token ReadableStream. */
function sseToText(
  upstream: ReadableStream<Uint8Array>,
  extract: (json: unknown) => string | null,
): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const text = extract(JSON.parse(data));
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          /* ignore keep-alives / partial frames */
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}

function anthropicAdapter(config: ProviderConfig): ProviderAdapter {
  const base = "https://api.anthropic.com/v1/messages";
  const headers = {
    "content-type": "application/json",
    "x-api-key": config.apiKey,
    "anthropic-version": "2023-06-01",
  };
  return {
    name: "anthropic",
    model: config.model,
    fastModel: config.fastModel,
    async generate({ system, user, signal }) {
      const res = await fetch(base, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify({ model: config.model, max_tokens: MAX_TOKENS, system, messages: [{ role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`anthropic_${res.status}`);
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
      if (!text) throw new Error("empty_response");
      return text;
    },
    async stream({ system, user, signal, fast }) {
      const res = await fetch(base, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify({
          model: fast ? config.fastModel : config.model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`anthropic_${res.status}`);
      return sseToText(res.body, (j) => {
        const o = j as { type?: string; delta?: { text?: string } };
        return o?.type === "content_block_delta" ? o.delta?.text ?? null : null;
      });
    },
  };
}

function openaiCompatible(config: ProviderConfig, name: string, base: string, extraHeaders: Record<string, string>): ProviderAdapter {
  const headers = { "content-type": "application/json", authorization: `Bearer ${config.apiKey}`, ...extraHeaders };
  const body = (model: string, system: string, user: string, stream: boolean) =>
    JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      stream,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
  return {
    name,
    model: config.model,
    fastModel: config.fastModel,
    async generate({ system, user, signal }) {
      const res = await fetch(base, { method: "POST", signal, headers, body: body(config.model, system, user, false) });
      if (!res.ok) throw new Error(`${name}_${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (data.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("empty_response");
      return text;
    },
    async stream({ system, user, signal, fast }) {
      const res = await fetch(base, { method: "POST", signal, headers, body: body(fast ? config.fastModel : config.model, system, user, true) });
      if (!res.ok || !res.body) throw new Error(`${name}_${res.status}`);
      return sseToText(res.body, (j) => {
        const o = j as { choices?: { delta?: { content?: string } }[] };
        return o?.choices?.[0]?.delta?.content ?? null;
      });
    },
  };
}

function openaiAdapter(config: ProviderConfig): ProviderAdapter {
  return openaiCompatible(config, "openai", "https://api.openai.com/v1/chat/completions", {});
}

/** OpenRouter is OpenAI-compatible; only the base URL, auth, and X-Title differ. */
function openrouterAdapter(config: ProviderConfig): ProviderAdapter {
  return openaiCompatible(config, "openrouter", "https://openrouter.ai/api/v1/chat/completions", { "X-Title": "Continuity" });
}
