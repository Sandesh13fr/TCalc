import { describe, expect, it } from "vitest";
import type { ModelInfo } from "@wma/core";
import { applyModelProfile } from "../src/applyModelProfile.js";

describe("applyModelProfile", () => {
  it("filters providers and puts preferred models first", () => {
    const models = [
      { id: "openai/a", provider: "openai" },
      { id: "local/b", provider: "local" },
      { id: "local/c", provider: "local" },
    ] as ModelInfo[];
    const result = applyModelProfile(models, { id: "team", allowedProviders: ["local"], preferredModelIds: ["local/c"] });
    expect(result.map((model) => model.id)).toEqual(["local/c", "local/b"]);
  });
});
