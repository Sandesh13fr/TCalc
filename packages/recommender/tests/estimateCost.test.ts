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
    expect(result.inputCost).toBe(1.25);
    expect(result.cachedInputCost).toBe(0.625);
    expect(result.totalCost).toBe(1.25 + 0.625 + 1.0);
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
    expect(result.inputCost).toBe(2.0);
    expect(result.cachedInputCost).toBe(0.5);
    expect(result.totalCost).toBe(2.0 + 0.5 + 1.0);
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

  it("should charge zero cached cost when cachedInputTokens is 0", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 200_000,
      outputTokens: 40_000,
      cachedInputTokens: 0,
    });
    expect(result.inputCost).toBe(0.5);
    expect(result.cachedInputCost).toBe(0);
    expect(result.totalCost).toBe(0.5 + 0.4);
  });

  it("should correctly split cached and non-cached input tokens", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 100_000,
      outputTokens: 20_000,
      cachedInputTokens: 60_000,
    });
    expect(result.inputCost).toBe(0.1);
    expect(result.cachedInputCost).toBe(0.075);
    expect(result.outputCost).toBe(0.2);
    expect(result.totalCost).toBe(0.1 + 0.075 + 0.2);
  });

  it("should treat fully cached input as zero input cost", () => {
    const result = estimateCost({
      model: testModel,
      inputTokens: 80_000,
      outputTokens: 10_000,
      cachedInputTokens: 80_000,
    });
    expect(result.inputCost).toBe(0);
    expect(result.cachedInputCost).toBe(0.1);
    expect(result.outputCost).toBe(0.1);
    expect(result.totalCost).toBe(0.2);
  });

  it("should throw when cachedInputTokens exceeds inputTokens", () => {
    expect(() =>
      estimateCost({
        model: testModel,
        inputTokens: 50_000,
        outputTokens: 10_000,
        cachedInputTokens: 60_000,
      }),
    ).toThrow(RangeError);
    expect(() =>
      estimateCost({
        model: testModel,
        inputTokens: 50_000,
        outputTokens: 10_000,
        cachedInputTokens: 60_000,
      }),
    ).toThrow("cachedInputTokens (60000) must be between 0 and inputTokens (50000)");
  });

  it("should throw when cachedInputTokens is negative", () => {
    expect(() =>
      estimateCost({
        model: testModel,
        inputTokens: 100_000,
        outputTokens: 10_000,
        cachedInputTokens: -5000,
      }),
    ).toThrow(RangeError);
    expect(() =>
      estimateCost({
        model: testModel,
        inputTokens: 100_000,
        outputTokens: 10_000,
        cachedInputTokens: -5000,
      }),
    ).toThrow("cachedInputTokens (-5000) must be between 0 and inputTokens (100000)");
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
