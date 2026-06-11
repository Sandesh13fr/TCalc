import { describe, it, expect } from "vitest";
import { estimateCost, estimateSessionCost } from "../src/estimateCost.js";
import type { ModelInfo } from "@wma/core";

const testModel: ModelInfo = {
  id: "test-model",
  displayName: "Test Model",
  provider: "test",
  contextWindow: 128000,
  maxOutputTokens: 4096,
  inputPricePerMillion: 2.5,
  cachedInputPricePerMillion: 1.25,
  outputPricePerMillion: 10,
  supportsTools: true,
  supportsImages: false,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 70,
  latencyScore: 50,
  updatedAt: "2025-01-01",
};

describe("estimateCost", () => {
  it("should calculate costs with known prices", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
    });
    expect(result.inputCost).toBe(2.5);
    expect(result.outputCost).toBe(1.0);
    expect(result.totalCost).toBeCloseTo(3.5, 4);
  });

  it("should account for cached input tokens", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cachedInputTokens: 500_000,
    });
    expect(result.cachedInputCost).toBe(0.625);
    expect(result.totalCost).toBeCloseTo(2.5 + 0.625 + 1.0, 4);
  });

  it("should handle free model with zero prices", () => {
    const freeModel: ModelInfo = {
      ...testModel,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
      cachedInputPricePerMillion: 0,
    };
    const result = estimateCost({
      model: freeModel,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
    });
    expect(result.totalCost).toBe(0);
  });

  it("should fall back to input price when cached price is null", () => {
    const modelNoCache: ModelInfo = {
      ...testModel,
      cachedInputPricePerMillion: null,
    };
    const result = estimateCost({
      model: modelNoCache,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cachedInputTokens: 200_000,
    });
    expect(result.cachedInputCost).toBe(0.5);
  });

  it("should default cachedInputTokens to 0", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 1_000_000,
      outputTokens: 100_000,
    });
    expect(result.cachedInputTokens).toBe(0);
    expect(result.cachedInputCost).toBe(0);
  });

  it("should handle zero tokens gracefully", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(result.totalCost).toBe(0);
  });

  it("should handle fractional token counts", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 500,
      outputTokens: 100,
    });
    expect(result.inputCost).toBeGreaterThan(0);
    expect(result.outputCost).toBeGreaterThan(0);
  });
});

describe("estimateSessionCost", () => {
  it("should return single prompt, run, and milestone estimates", () => {
    const result = estimateSessionCost(testModel, 100000);
    expect(result.singlePrompt).toBeDefined();
    expect(result.singleAgentRun).toBeDefined();
    expect(result.milestoneCost).toBeDefined();
  });

  it("should have milestone cost greater than single prompt cost", () => {
    const result = estimateSessionCost(testModel, 100000);
    expect(result.milestoneCost.totalCost).toBeGreaterThan(result.singlePrompt.totalCost);
  });

  it("should use provided turn count", () => {
    const result = estimateSessionCost(testModel, 100000, 5);
    expect(result.singleAgentRun.inputTokens).toBeGreaterThan(0);
    expect(result.singleAgentRun.outputTokens).toBeGreaterThan(0);
  });
});
