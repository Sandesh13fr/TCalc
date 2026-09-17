import { describe, it, expect } from "vitest";
import {
  sliceTextToTokenBudget,
  allocatePromptBudget,
} from "../src/promptBudgetSlicer.js";
import { estimateTokens } from "../src/heuristicTokenizer.js";

describe("sliceTextToTokenBudget", () => {
  const sampleLines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: const variable_${i} = ${i * 10};`).join("\n");

  it("returns original text if it already fits inside token budget", () => {
    const totalTokens = estimateTokens(sampleLines);
    const result = sliceTextToTokenBudget(sampleLines, totalTokens + 50);

    expect(result.wasTruncated).toBe(false);
    expect(result.truncatedTokens).toBe(0);
    expect(result.slicedText).toBe(sampleLines);
  });

  it("truncates from tail when budget is constrained", () => {
    const result = sliceTextToTokenBudget(sampleLines, 80, { position: "tail" });

    expect(result.wasTruncated).toBe(true);
    expect(result.truncatedTokens).toBeGreaterThan(0);
    expect(result.slicedText).toContain("Line 1:");
    expect(result.slicedText).toContain("Truncated");
    expect(result.tokensUsed).toBeLessThanOrEqual(85);
  });

  it("truncates from head preserving recent tail lines", () => {
    const result = sliceTextToTokenBudget(sampleLines, 80, { position: "head" });

    expect(result.wasTruncated).toBe(true);
    expect(result.slicedText).toContain("Line 50:");
    expect(result.slicedText).toContain("Truncated earlier lines");
    expect(result.tokensUsed).toBeLessThanOrEqual(85);
  });

  it("truncates middle preserving both head and tail boundaries", () => {
    const result = sliceTextToTokenBudget(sampleLines, 100, { position: "middle" });

    expect(result.wasTruncated).toBe(true);
    expect(result.slicedText).toContain("Line 1:");
    expect(result.slicedText).toContain("Line 50:");
    expect(result.slicedText).toContain("intermediate lines");
  });

  it("returns empty string when budget is extremely small", () => {
    const result = sliceTextToTokenBudget(sampleLines, 5);

    expect(result.wasTruncated).toBe(true);
    expect(result.slicedText).toBe("");
    expect(result.tokensUsed).toBe(0);
  });
});

describe("allocatePromptBudget", () => {
  const longContext = Array.from({ length: 100 }, (_, i) => `// Context line ${i}: export const symbol_${i} = ${i};`).join("\n");
  const systemPrompt = "You are an expert TypeScript coding assistant. Follow all guidelines carefully.";
  const userTask = "Please refactor the data access layer to support connection pooling.";

  it("allocates full tokens when budget exceeds total demand", () => {
    const allocation = allocatePromptBudget({
      maxTokenBudget: 5000,
      safetyBufferPercentage: 5,
      sections: [
        { id: "sys", priority: "essential", content: systemPrompt, title: "System" },
        { id: "task", priority: "essential", content: userTask, title: "User Task" },
        { id: "ctx", priority: "medium", content: longContext, title: "Workspace Context" },
      ],
    });

    expect(allocation.isWithinBudget).toBe(true);
    expect(allocation.sections).toHaveLength(3);
    expect(allocation.sections.every((s) => !s.wasTruncated)).toBe(true);
    expect(allocation.assembledPrompt).toContain("## System");
    expect(allocation.assembledPrompt).toContain("## User Task");
    expect(allocation.assembledPrompt).toContain("## Workspace Context");
  });

  it("prioritizes essential sections over lower priority sections under tight budget", () => {
    const allocation = allocatePromptBudget({
      maxTokenBudget: 350,
      safetyBufferPercentage: 0,
      sections: [
        { id: "sys", priority: "essential", content: systemPrompt, title: "System" },
        { id: "task", priority: "essential", content: userTask, title: "User Task" },
        { id: "ctx", priority: "low", content: longContext, title: "Context", allowTruncation: true },
        {
          id: "elastic",
          priority: "elastic",
          content: Array.from({ length: 20 }, (_, i) => `Debug log line ${i}: memory heap used 42MB`).join("\n"),
          title: "Logs",
        },
      ],
    });

    const sysSec = allocation.sections.find((s) => s.id === "sys");
    const taskSec = allocation.sections.find((s) => s.id === "task");
    const ctxSec = allocation.sections.find((s) => s.id === "ctx");
    const logSec = allocation.sections.find((s) => s.id === "elastic");

    expect(sysSec?.wasTruncated).toBe(false);
    expect(taskSec?.wasTruncated).toBe(false);
    expect(ctxSec?.wasTruncated).toBe(true);
    expect(logSec?.allocatedTokens).toBe(0);
    expect(allocation.usedTokens).toBeLessThanOrEqual(350);
  });

  it("accounts for reserved output tokens and safety headroom", () => {
    const allocation = allocatePromptBudget({
      maxTokenBudget: 2000,
      reserveOutputTokens: 500,
      safetyBufferPercentage: 10, // 200 tokens buffer
      sections: [
        { id: "p0", priority: "essential", content: "Brief task" },
      ],
    });

    expect(allocation.reservedOutput).toBe(500);
    expect(allocation.safetyBufferTokens).toBe(200);
    expect(allocation.usableBudget).toBe(1300);
  });

  it("drops sections when allowTruncation is false and budget is insufficient", () => {
    const allocation = allocatePromptBudget({
      maxTokenBudget: 150,
      safetyBufferPercentage: 0,
      sections: [
        { id: "sys", priority: "essential", content: systemPrompt },
        { id: "no-trunc", priority: "high", content: longContext, allowTruncation: false },
      ],
    });

    const noTrunc = allocation.sections.find((s) => s.id === "no-trunc");
    expect(noTrunc?.allocatedTokens).toBe(0);
    expect(noTrunc?.content).toBe("");
  });
});
