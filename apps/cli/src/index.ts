#!/usr/bin/env node

import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { executeScan } from "./commands/scan.js";
import { executeRecommend } from "./commands/recommend.js";
import { executeRepoMap } from "./commands/repoMap.js";
import { executeRules } from "./commands/rules.js";
import { executeReport } from "./commands/report.js";
import { executeCatalogFetch, executeCatalogValidate } from "./commands/catalog.js";
import { generateMcpConfig } from "./commands/mcpConfig.js";
import { resolveTargetPath } from "./utils/paths.js";
import { handleError, CliError } from "./utils/errors.js";
import { parseAgentTarget, parseGoal, parseMcpTarget, parseOptimizationMode, parsePositiveInteger, parsePrivacyMode, parseReportFormat, parseScanFormat, parseTableFormat } from "./utils/options.js";
import { startServer } from "@wma/mcp-server";
import { executeCompact } from "./commands/compact.js";

const program = new Command();

program
  .name("wma")
  .description("TCalc — local-first workspace analysis and AI agent optimization")
  .version("0.1.2")
  .option("--debug", "Show stack traces on error");

program
  .command("scan [path]")
  .description("Scan a workspace and print a summary")
  .option("--goal <goal>", "Workspace goal", parseGoal)
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)", parsePrivacyMode)
  .option("--format <format>", "Output format (table|json|markdown)", parseScanFormat, "table")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .option("--cache", "Reuse unchanged file estimates from .tcalc/scan-cache.json")
  .action(async (target, opts) => {
    try {
      const output = await executeScan({
        target,
        goal: opts.goal,
        privacy: opts.privacy,
        format: opts.format,
        output: opts.output,
        cache: opts.cache,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("recommend [path]")
  .description("Scan workspace and recommend models")
  .option("--goal <goal>", "Workspace goal", parseGoal)
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)", parsePrivacyMode)
  .option("--catalog <path>", "Path to model catalog JSON")
  .option("--format <format>", "Output format (table|json)", parseTableFormat, "table")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .option("--token-budget <number>", "Token budget", parsePositiveInteger)
  .action(async (target, opts) => {
    try {
      const output = await executeRecommend({
        target,
        goal: opts.goal,
        privacy: opts.privacy,
        catalog: opts.catalog,
        format: opts.format,
        output: opts.output,
        tokenBudget: opts.tokenBudget,
        debug: program.opts().debug,
      });
      await writeOutput(output, opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("repo-map [path]")
  .description("Generate a repo map from a workspace scan")
  .option("--goal <goal>", "Workspace goal", parseGoal)
  .option("--budget <number>", "Token budget", parsePositiveInteger)
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .option("--format <format>", "Output format (markdown|json)", parseReportFormat, "markdown")
  .option("--no-symbols", "Disable code-aware symbol extraction")
  .option("--max-symbols <number>", "Maximum symbols to include", parsePositiveInteger)
  .option("--max-parse-bytes <number>", "Maximum file bytes to parse for symbols", parsePositiveInteger)
  .action(async (target, opts) => {
    try {
      const output = await executeRepoMap({
        target,
        goal: opts.goal,
        budget: opts.budget,
        output: opts.output,
        format: opts.format,
        debug: program.opts().debug,
        noSymbols: opts.symbols === false,
        maxSymbols: opts.maxSymbols,
        maxParseBytes: opts.maxParseBytes,
      });
      await writeOutput(output, opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("rules [path]")
  .description("Generate agent rules")
  .requiredOption("--target <target>", "Agent target", parseAgentTarget)
  .option("--mode <mode>", "Optimization mode", parseOptimizationMode, "normal")
  .option("--output <file>", "Write output to file")
  .option("--stdout", "Print generated rules without writing a file")
  .option("--yes", "Overwrite without confirmation in non-interactive mode")
  .action(async (target, opts) => {
    try {
      const result = await executeRules({
        target,
        agentTarget: opts.target,
        mode: opts.mode,
        output: opts.output,
        yes: opts.yes,
        debug: program.opts().debug,
      });

      const outputPath = opts.output || path.join(resolveTargetPath(target), result.fileName);

      if (opts.stdout) {
        console.log(result.content);
        return;
      }

      if (!opts.yes) {
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
  .option("--goal <goal>", "Workspace goal", parseGoal)
  .option("--privacy <mode>", "Privacy mode (local-first|cloud-ok)", parsePrivacyMode)
  .option("--catalog <path>", "Path to model catalog JSON")
  .option("--format <format>", "Output format (markdown|json)", parseReportFormat, "markdown")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
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
      await writeOutput(output, opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("compact")
  .description("Compact a completed goal into reusable agent context")
  .requiredOption("--goal <goal>", "Completed workspace goal", parseGoal)
  .requiredOption("--summary <text>", "Short outcome summary")
  .option("--changed-file <path>", "Changed file (repeatable)", collect, [])
  .option("--decision <text>", "Decision to preserve (repeatable)", collect, [])
  .option("--next-step <text>", "Remaining next step (repeatable)", collect, [])
  .option("--source-tokens <number>", "Original context token count", parsePositiveInteger)
  .option("--format <format>", "Output format (markdown|json)", parseReportFormat, "markdown")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .action(async (opts) => {
    try {
      const output = executeCompact({
        goal: opts.goal,
        summary: opts.summary,
        changedFiles: opts.changedFile,
        decisions: opts.decision,
        nextSteps: opts.nextStep,
        sourceTokens: opts.sourceTokens,
        format: opts.format,
      });
      await writeOutput(output, opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("mcp")
  .description("Start MCP (Model Context Protocol) server")
  .action(async () => {
    try {
      await startServer();
    } catch (err) {
      console.error("Failed to start MCP server:", err);
      process.exit(1);
    }
  });

const catalogCmd = program
  .command("catalog")
  .description("Manage model catalogs");

catalogCmd
  .command("validate [path]")
  .description("Validate model catalog JSON")
  .option("--format <format>", "Output format (table|json)", parseTableFormat, "table")
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

catalogCmd
  .command("fetch <url>")
  .description("Fetch an optional HTTPS catalog feed")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .action(async (url, opts) => {
    try {
      await writeOutput(await executeCatalogFetch(url), opts.output, opts.force);
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

program
  .command("mcp-config")
  .description("Generate MCP server config for AI coding tools")
  .requiredOption("--target <target>", "Target tool (cursor|continue|claude-desktop|generic)", parseMcpTarget)
  .option("--command <command>", "MCP server command path")
  .option("--output <file>", "Write output to file")
  .option("--force", "Overwrite an existing output file")
  .option("--workspace <path>", "Workspace path for the config")
  .action(async (opts) => {
    try {
      const output = generateMcpConfig({
        target: opts.target,
        command: opts.command,
        workspace: opts.workspace,
      });
      if (opts.output) {
        await writeOutput(output, opts.output, opts.force);
      } else {
        console.log(output);
      }
    } catch (err) {
      handleError(err, program.opts().debug);
    }
  });

async function writeOutput(content: string, outputPath?: string, force = false): Promise<void> {
  if (outputPath) {
    try {
      await writeFile(outputPath, content, { encoding: "utf-8", flag: force ? "w" : "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new CliError(`Output file already exists: ${outputPath}. Use --force to overwrite it.`);
      }
      throw error;
    }
    console.error(`Output written to ${outputPath}`);
  } else {
    console.log(content);
  }
}

program.parse(process.argv);

function collect(value: string, values: string[]): string[] {
  return [...values, value];
}
