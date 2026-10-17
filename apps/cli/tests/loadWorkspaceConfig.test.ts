import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadWorkspaceConfig } from "../src/utils/loadWorkspaceConfig.js";
import { CliError } from "../src/utils/errors.js";
import { DEFAULT_CONFIG } from "@wma/core";

const CONFIG_FILENAME = ".tcalc.json";

describe("loadWorkspaceConfig validation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "wma-config-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("preserves defaults when configuration file is omitted", async () => {
    const config = await loadWorkspaceConfig(tempDir);
    expect(config.defaultGoal).toBe(DEFAULT_CONFIG.defaultGoal);
    expect(config.privacyMode).toBe(DEFAULT_CONFIG.privacyMode);
    expect(config.currency).toBe(DEFAULT_CONFIG.currency);
    expect(config.tokenBudget).toEqual(DEFAULT_CONFIG.tokenBudget);
    expect(config.agentRules).toEqual(DEFAULT_CONFIG.agentRules);
    expect(config.models).toEqual(DEFAULT_CONFIG.models);
  });

  it("preserves defaults for omitted fields in partial config", async () => {
    await writeFile(
      path.join(tempDir, CONFIG_FILENAME),
      JSON.stringify({
        currency: "EUR",
        agentRules: {
          preferPatchOnly: true,
        },
      }),
      "utf8",
    );

    const config = await loadWorkspaceConfig(tempDir);
    expect(config.currency).toBe("EUR");
    expect(config.agentRules.preferPatchOnly).toBe(true);
    expect(config.agentRules.defaultMode).toBe(DEFAULT_CONFIG.agentRules.defaultMode);
    expect(config.agentRules.allowCavemanMode).toBe(DEFAULT_CONFIG.agentRules.allowCavemanMode);
    expect(config.agentRules.askBeforeLargeFileRead).toBe(DEFAULT_CONFIG.agentRules.askBeforeLargeFileRead);
    expect(config.defaultGoal).toBe(DEFAULT_CONFIG.defaultGoal);
    expect(config.tokenBudget).toEqual(DEFAULT_CONFIG.tokenBudget);
    expect(config.models).toEqual(DEFAULT_CONFIG.models);
  });

  it("ignores unknown fields without error and omits them from config", async () => {
    await writeFile(
      path.join(tempDir, CONFIG_FILENAME),
      JSON.stringify({
        $schema: "https://example.com/schema.json",
        unknownProperty: "should-be-ignored",
        agentRules: {
          extraAgentProp: "also-ignored",
        },
      }),
      "utf8",
    );

    const config = await loadWorkspaceConfig(tempDir);
    expect(config).not.toHaveProperty("$schema");
    expect(config).not.toHaveProperty("unknownProperty");
    expect(config.agentRules).not.toHaveProperty("extraAgentProp");
  });

  describe("tokenBudget ordering invariants", () => {
    it("rejects warnAt greater than maxFullWorkspaceScan", async () => {
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({
          tokenBudget: {
            warnAt: 600_000,
            maxFullWorkspaceScan: 500_000,
          },
        }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        new RegExp(`Workspace config at .*${CONFIG_FILENAME.replace(".", "\\.")}.*warnAt.*cannot exceed maxFullWorkspaceScan`),
      );
    });

    it("rejects defaultContextBudget greater than maxFullWorkspaceScan", async () => {
      const configPath = path.join(tempDir, CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({
          tokenBudget: {
            defaultContextBudget: 1_200_000,
            maxFullWorkspaceScan: 1_000_000,
          },
        }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        new RegExp(`Workspace config at .*${CONFIG_FILENAME.replace(".", "\\.")}.*defaultContextBudget.*cannot exceed maxFullWorkspaceScan`),
      );
    });
  });

  describe("nested field validation", () => {
    it("rejects non-string currency", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ currency: 123 }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /has invalid currency; expected a non-empty string/,
      );
    });

    it("rejects non-object agentRules", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ agentRules: "bad" }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /agentRules must be an object/,
      );
    });

    it("rejects invalid agentRules.defaultMode", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ agentRules: { defaultMode: "invalid-mode" } }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /has invalid agentRules\.defaultMode/,
      );
    });

    it("rejects non-boolean agentRules options", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ agentRules: { allowCavemanMode: "yes" } }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /has invalid agentRules\.allowCavemanMode; expected a boolean/,
      );
    });

    it("rejects non-object models", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ models: [1, 2, 3] }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /models must be an object/,
      );
    });

    it("rejects non-string-array models.preferredProviders", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ models: { preferredProviders: ["openai", 123] } }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /has invalid models\.preferredProviders; expected an array of non-empty strings/,
      );
    });

    it("rejects non-boolean models options", async () => {
      await writeFile(
        path.join(tempDir, CONFIG_FILENAME),
        JSON.stringify({ models: { allowLocalModels: 1 } }),
        "utf8",
      );

      await expect(loadWorkspaceConfig(tempDir)).rejects.toThrow(
        /has invalid models\.allowLocalModels; expected a boolean/,
      );
    });
  });
});
