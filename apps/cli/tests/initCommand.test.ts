import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { detectProjectStack, executeInit } from "../src/commands/init.js";
import { loadWorkspaceConfig } from "../src/utils/loadWorkspaceConfig.js";
import { findWorkspaceConfigPath, CANONICAL_CONFIG_FILENAME, LEGACY_CONFIG_FILENAME } from "../src/utils/paths.js";
import { CliError } from "../src/utils/errors.js";
import { DEFAULT_CONFIG } from "@wma/core";

describe("initCommand wizard", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "wma-init-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("detectProjectStack", () => {
    it("detects TypeScript project with framework dependencies", async () => {
      await writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify({
          dependencies: { next: "14.0.0", react: "18.0.0" },
          devDependencies: { vitest: "^1.0.0" },
        }),
      );
      await writeFile(path.join(tempDir, "tsconfig.json"), "{}");

      const stack = await detectProjectStack(tempDir);
      expect(stack.primaryLanguage).toBe("typescript");
      expect(stack.isMonorepo).toBe(false);
      expect(stack.detectedFrameworks).toContain("Next.js");
      expect(stack.detectedFrameworks).toContain("React");
      expect(stack.detectedFrameworks).toContain("Testing (Vitest/Jest)");
      expect(stack.recommendedExcludes).toContain("dist");
      expect(stack.recommendedExcludes).toContain(".next");
      expect(stack.recommendedBudget).toBe(128_000);
    });

    it("detects Python project and adds virtualenv excludes", async () => {
      await writeFile(path.join(tempDir, "pyproject.toml"), "[project]\nname='my-app'");

      const stack = await detectProjectStack(tempDir);
      expect(stack.primaryLanguage).toBe("python");
      expect(stack.recommendedExcludes).toContain(".venv");
      expect(stack.recommendedExcludes).toContain("__pycache__");
    });

    it("detects Rust project and configures target exclusion", async () => {
      await writeFile(path.join(tempDir, "Cargo.toml"), '[package]\nname = "my-crate"');

      const stack = await detectProjectStack(tempDir);
      expect(stack.primaryLanguage).toBe("rust");
      expect(stack.recommendedExcludes).toContain("target");
    });

    it("detects Go project and configures vendor exclusion", async () => {
      await writeFile(path.join(tempDir, "go.mod"), "module example.com/app\ngo 1.22");

      const stack = await detectProjectStack(tempDir);
      expect(stack.primaryLanguage).toBe("go");
      expect(stack.recommendedExcludes).toContain("vendor");
      expect(stack.recommendedExcludes).toContain("bin");
    });

    it("detects monorepo workspaces and scales token budget", async () => {
      await writeFile(path.join(tempDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'");

      const stack = await detectProjectStack(tempDir);
      expect(stack.isMonorepo).toBe(true);
      expect(stack.recommendedBudget).toBe(200_000);
    });
  });

  describe("executeInit", () => {
    it("returns JSON preview in dry-run mode without creating disk file", async () => {
      const output = await executeInit({
        target: tempDir,
        dryRun: true,
      });

      expect(output).toContain("[DRY RUN]");
      expect(output).toContain('"defaultGoal"');

      const configFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      let exists = false;
      try {
        await readFile(configFile);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    });

    it("writes formatted configuration file on disk with custom parameters", async () => {
      await writeFile(path.join(tempDir, "Cargo.toml"), "");

      const output = await executeInit({
        target: tempDir,
        goal: "refactor",
        privacy: "local-first",
      });

      expect(output).toContain("Initialized TCalc workspace configuration!");
      expect(output).toContain("File written:");

      const configFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      const content = await readFile(configFile, "utf8");
      const parsed = JSON.parse(content);

      expect(parsed.defaultGoal).toBe("refactor");
      expect(parsed.privacyMode).toBe("local-first");
      expect(parsed.exclude).toContain("target");
    });

    it("writes only known configuration keys", async () => {
      await executeInit({ target: tempDir });

      const configFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      const parsed = JSON.parse(await readFile(configFile, "utf8"));

      // The repository does not publish a schema.json, so a $schema URL would 404 in editors.
      expect(parsed).not.toHaveProperty("$schema");
      for (const key of Object.keys(parsed)) {
        expect(Object.keys(DEFAULT_CONFIG)).toContain(key);
      }
    });

    it("fails when configuration file already exists and force flag is absent", async () => {
      const configFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      await writeFile(configFile, '{"existing": true}', "utf8");

      await expect(
        executeInit({
          target: tempDir,
        }),
      ).rejects.toThrow(CliError);
    });

    it("fails when legacy configuration file already exists and force flag is absent", async () => {
      const legacyFile = path.join(tempDir, LEGACY_CONFIG_FILENAME);
      await writeFile(legacyFile, '{"existing": true}', "utf8");

      await expect(
        executeInit({
          target: tempDir,
        }),
      ).rejects.toThrow(CliError);
    });

    it("overwrites configuration when force flag is set", async () => {
      const configFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      await writeFile(configFile, '{"existing": true}', "utf8");

      const output = await executeInit({
        target: tempDir,
        force: true,
      });

      expect(output).toContain("Initialized TCalc workspace configuration!");
      const content = await readFile(configFile, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.existing).toBeUndefined();
      expect(parsed.defaultGoal).toBeDefined();
    });

    it("initializes workspace and allows loadWorkspaceConfig to reload selected settings", async () => {
      await executeInit({
        target: tempDir,
        goal: "refactor",
        privacy: "local-first",
      });

      const loaded = await loadWorkspaceConfig(tempDir);
      expect(loaded.defaultGoal).toBe("refactor");
      expect(loaded.privacyMode).toBe("local-first");
    });

    it("loads legacy .workspace-model-advisor.json if canonical .tcalc.json does not exist", async () => {
      const legacyFile = path.join(tempDir, LEGACY_CONFIG_FILENAME);
      await writeFile(
        legacyFile,
        JSON.stringify({ defaultGoal: "debug", privacyMode: "local-first" }),
        "utf8",
      );

      expect(findWorkspaceConfigPath(tempDir)).toBe(legacyFile);
      const loaded = await loadWorkspaceConfig(tempDir);
      expect(loaded.defaultGoal).toBe("debug");
      expect(loaded.privacyMode).toBe("local-first");
    });

    it("prefers canonical .tcalc.json over legacy file when both exist", async () => {
      const canonicalFile = path.join(tempDir, CANONICAL_CONFIG_FILENAME);
      const legacyFile = path.join(tempDir, LEGACY_CONFIG_FILENAME);

      await writeFile(
        legacyFile,
        JSON.stringify({ defaultGoal: "debug", privacyMode: "cloud-ok" }),
        "utf8",
      );
      await writeFile(
        canonicalFile,
        JSON.stringify({ defaultGoal: "refactor", privacyMode: "local-first" }),
        "utf8",
      );

      expect(findWorkspaceConfigPath(tempDir)).toBe(canonicalFile);
      const loaded = await loadWorkspaceConfig(tempDir);
      expect(loaded.defaultGoal).toBe("refactor");
      expect(loaded.privacyMode).toBe("local-first");
    });
  });
});
