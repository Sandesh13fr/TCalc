import type { WorkspaceScanResult } from "@wma/core";
import type { SarifLog, SarifRule, SarifResult } from "./types/sarif.js";

const SARIF_SCHEMA = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";

const SARIF_RULES: SarifRule[] = [
  {
    id: "tcalc/secret-leak",
    name: "SecretOrCredentialExposed",
    shortDescription: { text: "Potential secret, credential, or private key discovered in workspace" },
    fullDescription: {
      text: "TCalc identified file patterns or content signatures matching API keys, tokens, or private credentials that should not be included in AI prompts or version control.",
    },
    help: {
      text: "Exclude this file from AI context immediately and rotate any exposed keys.",
      markdown: "### Remediation\n- Add this file to `.gitignore` or `.tcalcignore`.\n- Invalidate and rotate any credentials found.\n- Never allow secret files in coding agent prompts.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "tcalc/database-dump-exposed",
    name: "DatabaseDumpExposed",
    shortDescription: { text: "Raw database dump file present in workspace" },
    fullDescription: {
      text: "SQL dumps, SQLite databases, or binary dumps consume massive token budgets and may leak PII/sensitive tables to external LLM providers.",
    },
    help: {
      text: "Exclude database dump files from AI context using .tcalcignore.",
      markdown: "### Remediation\n- Ensure database fixtures are sanitized or excluded from scan.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "tcalc/large-file-token-bloat",
    name: "LargeFileTokenBloat",
    shortDescription: { text: "File exceeds 500KB or massive token consumption threshold" },
    fullDescription: {
      text: "Large files can instantly exhaust coding agent context windows, causing context truncation or high API billing costs.",
    },
    help: {
      text: "Refactor or modularize large files or exclude them from prompt context.",
      markdown: "### Remediation\n- Consider modularizing large monoliths or referencing them selectively.",
    },
    defaultConfiguration: { level: "warning" },
  },
  {
    id: "tcalc/build-output-leak",
    name: "BuildOutputIncluded",
    shortDescription: { text: "Compiled build artifact or dist file detected in source tree" },
    fullDescription: {
      text: "Build outputs (.dist, .build, .next) add redundant compiled artifacts to LLM context.",
    },
    help: {
      text: "Ensure build directories are listed in .gitignore and .tcalcignore.",
    },
    defaultConfiguration: { level: "warning" },
  },
  {
    id: "tcalc/generated-file-untracked",
    name: "GeneratedBundleIncluded",
    shortDescription: { text: "Minified script or generated bundle detected" },
    fullDescription: {
      text: "Minified assets (.min.js, bundle chunks) degrade LLM reasoning and should not be edited by coding agents.",
    },
    help: {
      text: "Exclude minified and generated code from coding agent prompts.",
    },
    defaultConfiguration: { level: "note" },
  },
  {
    id: "tcalc/lockfile-context-overhead",
    name: "LockfileContextOverhead",
    shortDescription: { text: "Package manager lockfile consuming prompt budget" },
    fullDescription: {
      text: "Package lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml) carry thousands of lines of metadata.",
    },
    help: {
      text: "Exclude lockfiles from coding agent context windows.",
    },
    defaultConfiguration: { level: "note" },
  },
];

const RULE_INDEX_MAP = new Map<string, { rule: SarifRule; index: number }>(
  SARIF_RULES.map((rule, index) => [rule.id, { rule, index }]),
);

export function generateSarifReport(
  scanResult: WorkspaceScanResult,
  options: { pretty?: boolean; version?: string } = {},
): string {
  const results: SarifResult[] = [];

  for (const file of scanResult.files) {
    const relUri = file.relativePath.replace(/\\/g, "/");

    for (const flag of file.riskFlags) {
      let ruleId: string | undefined;

      switch (flag) {
        case "secret":
          ruleId = "tcalc/secret-leak";
          break;
        case "database-dump":
          ruleId = "tcalc/database-dump-exposed";
          break;
        case "large-file":
          ruleId = "tcalc/large-file-token-bloat";
          break;
        case "build-output":
          ruleId = "tcalc/build-output-leak";
          break;
        case "generated":
          ruleId = "tcalc/generated-file-untracked";
          break;
        case "lockfile":
          ruleId = "tcalc/lockfile-context-overhead";
          break;
      }

      if (!ruleId) continue;

      const ruleEntry = RULE_INDEX_MAP.get(ruleId);
      if (!ruleEntry) continue;

      results.push({
        ruleId,
        ruleIndex: ruleEntry.index,
        level: ruleEntry.rule.defaultConfiguration.level,
        message: {
          text: `[${flag}] in ${relUri} (${file.estimatedTokens.toLocaleString()} tokens, ${file.bytes} bytes): ${ruleEntry.rule.shortDescription.text}`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: relUri,
              },
              region: {
                startLine: 1,
                startColumn: 1,
              },
            },
          },
        ],
        properties: {
          estimatedTokens: file.estimatedTokens,
          bytes: file.bytes,
          includedInContext: file.included,
          language: file.language,
          riskFlag: flag,
        },
      });
    }
  }

  const sarifLog: SarifLog = {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "tcalc",
            version: options.version ?? "0.1.4",
            informationUri: "https://github.com/Sandesh13fr/TCalc",
            rules: SARIF_RULES,
          },
        },
        results,
      },
    ],
  };

  return options.pretty ? JSON.stringify(sarifLog, null, 2) : JSON.stringify(sarifLog);
}
