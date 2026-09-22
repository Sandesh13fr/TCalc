import { describe, it, expect } from "vitest";
import type { ModelInfo } from "@wma/core";
import { queryModelCatalog } from "../src/queryModelCatalog.js";

const mockModels: ModelInfo[] = [
  {
    id: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3.0,
    cachedInputPricePerMillion: 0.3,
    outputPricePerMillion: 15.0,
    supportsTools: true,
    supportsImages: true,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 92,
    latencyScore: 75,
    updatedAt: "2025-01-01",
  },
  {
    id: "claude-3-5-haiku",
    displayName: "Claude 3.5 Haiku",
    provider: "Anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0.8,
    cachedInputPricePerMillion: 0.08,
    outputPricePerMillion: 4.0,
    supportsTools: true,
    supportsImages: false,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 78,
    latencyScore: 95,
    updatedAt: "2025-01-01",
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    provider: "OpenAI",
    contextWindow: 128_000,
    maxOutputTokens: 16384,
    inputPricePerMillion: 2.5,
    cachedInputPricePerMillion: 1.25,
    outputPricePerMillion: 10.0,
    supportsTools: true,
    supportsImages: true,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 88,
    latencyScore: 80,
    updatedAt: "2025-01-01",
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    provider: "OpenAI",
    contextWindow: 128_000,
    maxOutputTokens: 16384,
    inputPricePerMillion: 0.15,
    cachedInputPricePerMillion: 0.075,
    outputPricePerMillion: 0.6,
    supportsTools: true,
    supportsImages: true,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 75,
    latencyScore: 92,
    updatedAt: "2025-01-01",
  },
  {
    id: "llama-3-3-70b-instruct",
    displayName: "Llama 3.3 70B (Ollama)",
    provider: "Ollama",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0,
    cachedInputPricePerMillion: 0,
    outputPricePerMillion: 0,
    supportsTools: true,
    supportsImages: false,
    supportsLocal: true,
    privacyMode: "local",
    codingScore: 79,
    latencyScore: 60,
    updatedAt: "2025-01-01",
  },
  {
    id: "gemini-1-5-pro",
    displayName: "Gemini 1.5 Pro",
    provider: "Google",
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3.5,
    cachedInputPricePerMillion: 0.875,
    outputPricePerMillion: 10.5,
    supportsTools: true,
    supportsImages: true,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 86,
    latencyScore: 70,
    updatedAt: "2025-01-01",
  },
];

describe("queryModelCatalog", () => {
  it("returns all models with aggregates when no filters provided", () => {
    const result = queryModelCatalog(mockModels);

    expect(result.totalMatched).toBe(6);
    expect(result.models).toHaveLength(6);
    expect(result.aggregates.totalMatched).toBe(6);
    expect(result.aggregates.localModelsCount).toBe(1);
    expect(result.aggregates.cloudModelsCount).toBe(5);
    expect(result.aggregates.providerCounts["Anthropic"]).toBe(2);
    expect(result.aggregates.providerCounts["OpenAI"]).toBe(2);
  });

  it("filters by fuzzy search term across id, displayName, and provider", () => {
    const searchResult = queryModelCatalog(mockModels, {
      filter: { searchTerm: "sonnet" },
    });

    expect(searchResult.totalMatched).toBe(1);
    expect(searchResult.models[0].id).toBe("claude-3-5-sonnet");

    const providerResult = queryModelCatalog(mockModels, {
      filter: { searchTerm: "google" },
    });

    expect(providerResult.totalMatched).toBe(1);
    expect(providerResult.models[0].provider).toBe("Google");
  });

  it("filters by provider inclusion and exclusion", () => {
    const included = queryModelCatalog(mockModels, {
      filter: { providers: ["Anthropic", "Ollama"] },
    });
    expect(included.totalMatched).toBe(3);

    const excluded = queryModelCatalog(mockModels, {
      filter: { excludeProviders: ["OpenAI", "Google"] },
    });
    expect(excluded.totalMatched).toBe(3);
    expect(excluded.models.every((m) => m.provider !== "OpenAI" && m.provider !== "Google")).toBe(true);
  });

  it("filters by local support and privacy mode", () => {
    const localOnly = queryModelCatalog(mockModels, {
      filter: { supportsLocal: true },
    });

    expect(localOnly.totalMatched).toBe(1);
    expect(localOnly.models[0].id).toBe("llama-3-3-70b-instruct");
  });

  it("filters by minimum context window and maximum price thresholds", () => {
    const largeContextBudget = queryModelCatalog(mockModels, {
      filter: {
        minContextWindow: 200_000,
        maxInputPricePerMillion: 1.0,
      },
    });

    expect(largeContextBudget.totalMatched).toBe(1);
    expect(largeContextBudget.models[0].id).toBe("claude-3-5-haiku");
  });

  it("filters by minimum coding intelligence score", () => {
    const highReasoning = queryModelCatalog(mockModels, {
      filter: { minCodingScore: 87 },
    });

    expect(highReasoning.totalMatched).toBe(2);
    const ids = highReasoning.models.map((m) => m.id);
    expect(ids).toContain("claude-3-5-sonnet");
    expect(ids).toContain("gpt-4o");
  });

  it("sorts by cost ascending (cheapest first)", () => {
    const sortedCost = queryModelCatalog(mockModels, {
      sortBy: "cost",
      sortDirection: "asc",
    });

    expect(sortedCost.models[0].id).toBe("llama-3-3-70b-instruct"); // 0 cost
    expect(sortedCost.models[1].id).toBe("gpt-4o-mini"); // cheapest cloud
  });

  it("sorts by context capacity descending", () => {
    const sortedContext = queryModelCatalog(mockModels, {
      sortBy: "context",
      sortDirection: "desc",
    });

    expect(sortedContext.models[0].id).toBe("gemini-1-5-pro");
    expect(sortedContext.models[0].contextWindow).toBe(2_000_000);
  });

  it("sorts by coding score descending", () => {
    const sortedScore = queryModelCatalog(mockModels, {
      sortBy: "codingScore",
      sortDirection: "desc",
    });

    expect(sortedScore.models[0].id).toBe("claude-3-5-sonnet");
  });

  it("supports pagination with limit and offset", () => {
    const page1 = queryModelCatalog(mockModels, {
      sortBy: "name",
      sortDirection: "asc",
      limit: 2,
      offset: 0,
    });

    expect(page1.models).toHaveLength(2);
    expect(page1.totalMatched).toBe(6);
    expect(page1.hasMore).toBe(true);

    const page2 = queryModelCatalog(mockModels, {
      sortBy: "name",
      sortDirection: "asc",
      limit: 2,
      offset: 2,
    });

    expect(page2.models).toHaveLength(2);
    expect(page2.models[0].id).not.toBe(page1.models[0].id);
  });
});
