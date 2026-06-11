#!/usr/bin/env node

import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { executeScan } from "./commands/scan.js";
import { executeRecommend } from "./commands/recommend.js";
import { executeRepoMap } from "./commands/repoMap.js";
import { executeRules } from "./commands/rules.js";
import { executeReport } from "./commands/report.js";
import { executeCatalogValidate } from "./commands/catalog.js";
import { resolveTargetPath } from "./utils/paths.js";
import { handleError, CliError } from "./utils/errors.js";
import type { AgentTarget, OptimizationMode } from "@wma/core";

const program = new Command();

program
  .name("wma")
  .description("Workspace Model Advisor — local-first workspace analysis and AI agent optimization")
  .version("0.1.0")
  .option("--debug", "Show stack traces on error");

program
  .command("scan [path]")
  .description("Scan a workspace and print a summary")
  .option("--goal <goal>", "Workspace goal")
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)")
  .option("--format <format>", "Output format (table|json|markdown)", "table")
  .option("--output <file>", "Write output to file")
  .action(async (target, opts) => {
    try {
      const output = await executeScan({
        target,
        goal: opts.goal,
        privacy: opts.privacy,
        format: opts.format,
        output: opts.output,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("recommend [path]")
  .description("Scan workspace and recommend models")
  .option("--goal <goal>", "Workspace goal")
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)")
  .option("--catalog <path>", "Path to model catalog JSON")
  .option("--format <format>", "Output format (table|json)", "table")
  .option("--output <file>", "Write output to file")
  .option("--token-budget <number>", "Token budget")
  .action(async (target, opts) => {
    try {
      const output = await executeRecommend({
        target,
        goal: opts.goal,
        privacy: opts.privacy,
        catalog: opts.catalog,
        format: opts.format,
        output: opts.output,
        tokenBudget: opts.tokenBudget ? Number(opts.tokenBudget) : undefined,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("repo-map [path]")
  .description("Generate a repo map from a workspace scan")
  .option("--goal <goal>", "Workspace goal")
  .option("--budget <number>", "Token budget")
  .option("--output <file>", "Write output to file")
  .option("--format <format>", "Output format (markdown|json)", "markdown")
  .action(async (target, opts) => {
    try {
      const output = await executeRepoMap({
        target,
        goal: opts.goal,
        budget: opts.budget ? Number(opts.budget) : undefined,
        output: opts.output,
        format: opts.format,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("rules [path]")
  .description("Generate agent rules")
  .requiredOption("--target <target>", "Agent target (generic|cursor|claude-code|codex|cline|roo|continue|aider)")
  .option("--mode <mode>", "Optimization mode (normal|concise|patch-only|repo-map-first|ask-before-reading-large-files)", "normal")
  .option("--output <file>", "Write output to file")
  .option("--yes", "Overwrite without confirmation in non-interactive mode")
  .action(async (target, opts) => {
    try {
      const result = await executeRules({
        target,
        agentTarget: opts.target as AgentTarget,
        mode: opts.mode as OptimizationMode,
        output: opts.output,
        yes: opts.yes,
        debug: program.opts().debug,
      });

      const outputPath = opts.output || path.join(resolveTargetPath(target), result.fileName);

      const isTTY = process.stdout.isTTY;
      if (!opts.yes && isTTY) {
        console.log(`Would write to: ${outputPath}`);
        console.log("");
        console.log(result.content);
        return;
      }

      await writeFile(outputPath, result.content, "utf-8");
      console.log(`Agent rules written to ${outputPath}`);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("report [path]")
  .description("Generate full Markdown or JSON report")
  .option("--goal <goal>", "Workspace goal")
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)")
  .option("--catalog <path>", "Path to model catalog JSON")
  .option("--format <format>", "Output format (markdown|json)", "markdown")
  .option("--output <file>", "Write output to file")
  .option("--include-repo-map", "Include repo map in report")
  .action(async (target, opts) => {
    try {
      const output = await executeReport({
        target,
        goal: opts.goal,
        privacy: opts.privacy,
        catalog: opts.catalog,
        format: opts.format,
        output: opts.output,
        includeRepoMap: opts.includeRepoMap,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

const catalogCmd = program
  .command("catalog")
  .description("Manage model catalogs");

catalogCmd
  .command("validate [path]")
  .description("Validate model catalog JSON")
  .option("--format <format>", "Output format (table|json)", "table")
  .action(async (target, opts) => {
    try {
      const result = await executeCatalogValidate({
        path: target,
        format: opts.format,
        debug: program.opts().debug,
      });
      console.log(result.message);
      process.exit(result.exitCode);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (outputPath) {
    await writeFile(outputPath, content, "utf-8");
    console.error(`Output written to ${outputPath}`);
  } else {
    console.log(content);
  }
}

program.parse(process.argv);
