import { describe, expect, it } from "vitest";
import { estimateProviderTokens, type ProviderTokenizer } from "../src/index.js";

describe("estimateProviderTokens", () => {
  it("uses a provider tokenizer when available", () => {
    const tokenizer: ProviderTokenizer = {
      id: "test-v1",
      provider: "openai",
      estimate: () => 42,
    };
    expect(estimateProviderTokens("hello", tokenizer)).toMatchObject({ tokens: 42, confidence: "tokenizer-estimated" });
  });

  it("falls back offline when the provider tokenizer fails", () => {
    const tokenizer: ProviderTokenizer = {
      id: "offline",
      provider: "anthropic",
      estimate: () => { throw new Error("unavailable"); },
    };
    expect(estimateProviderTokens("hello world", tokenizer)).toMatchObject({ confidence: "heuristic" });
  });
});
