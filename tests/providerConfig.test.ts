import { describe, it, expect } from "vitest";
import { resolveProviderConfig, providerStatus } from "@/lib/server/providerConfig";

describe("resolveProviderConfig", () => {
  it("returns null when no provider key is configured (no fake fallback)", () => {
    expect(resolveProviderConfig({})).toBeNull();
  });

  it("auto-selects Anthropic when its key is present", () => {
    const c = resolveProviderConfig({ ANTHROPIC_API_KEY: "sk-ant" });
    expect(c?.provider).toBe("anthropic");
    expect(c?.apiKey).toBe("sk-ant");
    expect(c?.model.length).toBeGreaterThan(0);
  });

  it("auto-selects OpenAI when only its key is present", () => {
    expect(resolveProviderConfig({ OPENAI_API_KEY: "sk-oa" })?.provider).toBe("openai");
  });

  it("auto-selects OpenRouter when only its key is present, with a free default model", () => {
    const c = resolveProviderConfig({ OPENROUTER_API_KEY: "sk-or" });
    expect(c?.provider).toBe("openrouter");
    expect(c?.apiKey).toBe("sk-or");
    expect(c?.model).toContain(":free");
  });

  it("honors an explicit OpenRouter model slug (e.g. a chosen free model)", () => {
    const c = resolveProviderConfig({ OPENROUTER_API_KEY: "k", OPENROUTER_MODEL: "openrouter/owl-alpha" });
    expect(c?.model).toBe("openrouter/owl-alpha");
  });

  it("prefers OpenRouter when AI_PROVIDER=openrouter even if other keys exist", () => {
    const c = resolveProviderConfig({ AI_PROVIDER: "openrouter", ANTHROPIC_API_KEY: "a", OPENROUTER_API_KEY: "o" });
    expect(c?.provider).toBe("openrouter");
  });

  it("honors an explicit AI_PROVIDER preference", () => {
    const c = resolveProviderConfig({
      AI_PROVIDER: "openai",
      ANTHROPIC_API_KEY: "a",
      OPENAI_API_KEY: "o",
    });
    expect(c?.provider).toBe("openai");
  });

  it("never reads a NEXT_PUBLIC-exposed key (client-exposed keys are ignored)", () => {
    expect(resolveProviderConfig({ NEXT_PUBLIC_ANTHROPIC_API_KEY: "leaked" })).toBeNull();
  });
});

describe("providerStatus", () => {
  it("reports not configured without leaking any key material", () => {
    const s = providerStatus({});
    expect(s.configured).toBe(false);
    expect(JSON.stringify(s)).not.toMatch(/apiKey|sk-/);
  });

  it("reports configured with provider + model but never the key", () => {
    const s = providerStatus({ ANTHROPIC_API_KEY: "sk-secret" });
    expect(s.configured).toBe(true);
    expect(s.provider).toBe("anthropic");
    expect("apiKey" in s).toBe(false);
    expect(JSON.stringify(s)).not.toContain("sk-secret");
  });
});
