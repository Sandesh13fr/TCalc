import { access, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG, type PrivacySetting, type WorkspaceGoal, type WmaConfig } from "@wma/core";
import { resolveTargetPath } from "../utils/paths.js";
import { CliError } from "../utils/errors.js";

export interface InitOptions {
  target?: string;
  goal?: string;
  privacy?: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface DetectedStack {
  primaryLanguage: "typescript" | "javascript" | "python" | "rust" | "go" | "generic";
  isMonorepo: boolean;
  detectedFrameworks: string[];
  recommendedExcludes: string[];
  recommendedBudget: number;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectProjectStack(rootPath: string): Promise<DetectedStack> {
  const hasPkgJson = await fileExists(path.join(rootPath, "package.json"));
  const hasTsConfig = await fileExists(path.join(rootPath, "tsconfig.json"));
  const hasPyProject = await fileExists(path.join(rootPath, "pyproject.toml"));
  const hasRequirements = await fileExists(path.join(rootPath, "requirements.txt"));
  const hasCargo = await fileExists(path.join(rootPath, "Cargo.toml"));
  const hasGoMod = await fileExists(path.join(rootPath, "go.mod"));
  const hasPnpmWorkspace = await fileExists(path.join(rootPath, "pnpm-workspace.yaml"));
  const hasNx = await fileExists(path.join(rootPath, "nx.json"));
  const hasTurbo = await fileExists(path.join(rootPath, "turbo.json"));

  const isMonorepo = hasPnpmWorkspace || hasNx || hasTurbo;
  const detectedFrameworks: string[] = [];
  const recommendedExcludes: string[] = [...DEFAULT_CONFIG.exclude];

  let primaryLanguage: DetectedStack["primaryLanguage"] = "generic";

  if (hasCargo) {
    primaryLanguage = "rust";
    recommendedExcludes.push("target");
  } else if (hasGoMod) {
    primaryLanguage = "go";
    recommendedExcludes.push("vendor", "bin");
  } else if (hasPyProject || hasRequirements) {
    primaryLanguage = "python";
    recommendedExcludes.push(".venv", "venv", "__pycache__", ".pytest_cache", ".ruff_cache", "*.pyc");
  } else if (hasPkgJson || hasTsConfig) {
    primaryLanguage = hasTsConfig ? "typescript" : "javascript";
    recommendedExcludes.push("dist", "build", ".next", ".turbo", "coverage", "storybook-static");

    // Inspect package.json for frameworks
    if (hasPkgJson) {
      try {
        const pkgRaw = await readFile(path.join(rootPath, "package.json"), "utf8");
        const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps["next"]) detectedFrameworks.push("Next.js");
        if (allDeps["vite"]) detectedFrameworks.push("Vite");
        if (allDeps["react"]) detectedFrameworks.push("React");
        if (allDeps["vue"]) detectedFrameworks.push("Vue");
        if (allDeps["vitest"] || allDeps["jest"]) detectedFrameworks.push("Testing (Vitest/Jest)");
      } catch {
        // Ignore JSON read errors
      }
    }
  }

  // Deduplicate excludes
  const uniqueExcludes = [...new Set(recommendedExcludes)];
  const recommendedBudget = isMonorepo ? 200_000 : 128_000;

  return {
    primaryLanguage,
    isMonorepo,
    detectedFrameworks,
    recommendedExcludes: uniqueExcludes,
    recommendedBudget,
  };
}

export async function executeInit(options: InitOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const configPath = path.join(rootPath, ".workspace-model-advisor.json");

  const stack = await detectProjectStack(rootPath);

  const goal = (options.goal as WorkspaceGoal) ?? DEFAULT_CONFIG.defaultGoal;
  const privacy = (options.privacy as PrivacySetting) ?? (stack.primaryLanguage === "rust" ? "local-first" : DEFAULT_CONFIG.privacyMode);

  const newConfig: Partial<WmaConfig> = {
    defaultGoal: goal,
    privacyMode: privacy,
    exclude: stack.recommendedExcludes,
    tokenBudget: {
      defaultContextBudget: stack.recommendedBudget,
      maxFullWorkspaceScan: stack.recommendedBudget * 2,
      warnAt: Math.round(stack.recommendedBudget * 0.8),
    },
  };

  const formattedJson = JSON.stringify(newConfig, null, 2);

  if (options.dryRun) {
    return [
      `[DRY RUN] Inferred configuration for ${stack.primaryLanguage} project (${stack.isMonorepo ? "Monorepo" : "Single Package"}):`,
      formattedJson,
    ].join("\n");
  }

  const alreadyExists = await fileExists(configPath);
  if (alreadyExists && !options.force) {
    throw new CliError(
      `Configuration file already exists at ${configPath}. Use --force to overwrite it.`,
    );
  }

  await writeFile(configPath, formattedJson, "utf8");

  const lines: string[] = [
    `Initialized TCalc workspace configuration!`,
    `File written: ${configPath}`,
    ``,
    `Project Diagnostics:`,
    `- Primary Language: ${stack.primaryLanguage}`,
    `- Monorepo: ${stack.isMonorepo ? "Yes" : "No"}`,
    stack.detectedFrameworks.length > 0 ? `- Frameworks: ${stack.detectedFrameworks.join(", ")}` : "",
    `- Calibrated Context Budget: ${stack.recommendedBudget.toLocaleString()} tokens`,
    `- Default Goal: ${goal}`,
    `- Privacy Mode: ${privacy}`,
    `- Tailored Excludes: ${stack.recommendedExcludes.length} rules active`,
    ``,
    `You can now run:`,
    `  wma scan`,
    `  wma recommend`,
  ].filter(Boolean);

  return lines.join("\n");
}
