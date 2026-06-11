import type { RepoMapResult, RepoMapFile, RepoMapFolder, RepoMapLanguage } from "@wma/core";

export function formatRepoMapMarkdown(repoMap: RepoMapResult): string {
  const lines: string[] = [];

  lines.push("# Repo Map");
  lines.push("");

  appendSummary(lines, repoMap);
  appendProjectShape(lines, repoMap);
  appendImportantFiles(lines, repoMap);
  appendEntryPoints(lines, repoMap);
  appendTests(lines, repoMap);
  appendConfigAndTooling(lines, repoMap);
  appendDocumentation(lines, repoMap);
  appendLargeNoisyFiles(lines, repoMap);
  appendRiskSensitiveFiles(lines, repoMap);
  appendRecommendedAgentContext(lines, repoMap);
  appendSuggestedPromptPrefix(lines, repoMap);
  appendOverflowNotes(lines, repoMap);

  return lines.join("\n");
}

function appendSummary(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Workspace Root:** \`${repoMap.rootPath}\``);
  lines.push(`- **Generated:** ${repoMap.generatedAt}`);
  lines.push(`- **Token Budget:** ${repoMap.tokenBudget.toLocaleString()}`);
  lines.push(`- **Estimated Repo Map Tokens:** ${repoMap.estimatedTokens.toLocaleString()}`);
  lines.push(`- **Workspace Total Tokens:** ${repoMap.workspaceTotalTokens.toLocaleString()}`);
  lines.push(`- **Included Files:** ${repoMap.importantFiles.length}`);
  lines.push(`- **Excluded Files:** ${repoMap.excludedFiles.length}`);
  lines.push("");
  lines.push(repoMap.summary);
  lines.push("");
}

function appendProjectShape(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Project Shape");
  lines.push("");

  if (repoMap.topLevelFolders.length > 0) {
    lines.push("### Top-Level Folders");
    lines.push("");
    lines.push("| Folder | Files | Estimated Tokens |");
    lines.push("| --- | ---:| ---:|");
    for (const folder of repoMap.topLevelFolders) {
      lines.push(`| \`${folder.relativePath}\` | ${folder.fileCount} | ${folder.estimatedTokens.toLocaleString()} |`);
    }
    lines.push("");
  }

  if (repoMap.languageBreakdown.length > 0) {
    lines.push("### Language Breakdown");
    lines.push("");
    lines.push("| Language | Files | Estimated Tokens |");
    lines.push("| --- | ---:| ---:|");
    for (const lang of repoMap.languageBreakdown) {
      lines.push(`| ${lang.language} | ${lang.fileCount} | ${lang.estimatedTokens.toLocaleString()} |`);
    }
    lines.push("");
  }
}

function appendImportantFiles(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Important Files");
  lines.push("");

  if (repoMap.importantFiles.length === 0) {
    lines.push("No important files identified.");
    lines.push("");
    return;
  }

  lines.push("| Path | Reason | Tokens | Priority |");
  lines.push("| --- | --- | ---:| ---:|");
  const sorted = [...repoMap.importantFiles].sort((a, b) => b.priority - a.priority);
  for (const file of sorted) {
    lines.push(formatFileRow(file));
  }
  lines.push("");
}

function appendEntryPoints(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Entry Points");
  lines.push("");

  if (repoMap.entryPoints.length === 0) {
    lines.push("No entry points detected.");
    lines.push("");
    return;
  }

  for (const file of repoMap.entryPoints) {
    const lang = file.language ? ` (${file.language})` : "";
    lines.push(`- \`${file.relativePath}\`${lang} — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendTests(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Tests");
  lines.push("");

  if (repoMap.testFiles.length === 0) {
    lines.push("No test files detected.");
    lines.push("");
    return;
  }

  for (const file of repoMap.testFiles) {
    lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendConfigAndTooling(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Config & Tooling");
  lines.push("");

  if (repoMap.configFiles.length === 0) {
    lines.push("No config files detected.");
    lines.push("");
    return;
  }

  for (const file of repoMap.configFiles) {
    lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendDocumentation(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Documentation");
  lines.push("");

  if (repoMap.documentationFiles.length === 0) {
    lines.push("No documentation files detected.");
    lines.push("");
    return;
  }

  for (const file of repoMap.documentationFiles) {
    lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendLargeNoisyFiles(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Large / Noisy Files");
  lines.push("");

  if (repoMap.largeFiles.length === 0) {
    lines.push("No large or noisy files detected.");
    lines.push("");
    return;
  }

  lines.push("The following files exceed ~50K estimated tokens and should usually not be sent to an AI agent:");
  lines.push("");
  for (const file of repoMap.largeFiles) {
    lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendRiskSensitiveFiles(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Risk / Sensitive Files");
  lines.push("");

  if (repoMap.riskyFiles.length === 0) {
    lines.push("No risk-flagged files detected.");
    lines.push("");
    return;
  }

  lines.push("The following files may contain sensitive information. Contents are not exposed here:");
  lines.push("");
  for (const file of repoMap.riskyFiles) {
    lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
  }
  lines.push("");
}

function appendRecommendedAgentContext(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Recommended Agent Context");
  lines.push("");

  if (repoMap.recommendedInclude.length > 0) {
    lines.push("### Files to Read First");
    lines.push("");
    for (const file of repoMap.recommendedInclude.slice(0, 15)) {
      lines.push(`- \`${file.relativePath}\` — ${file.reason}`);
    }
    lines.push("");
  }

  if (repoMap.recommendedExclude.length > 0) {
    lines.push("### Files to Avoid");
    lines.push("");
    for (const file of repoMap.recommendedExclude.slice(0, 10)) {
      lines.push(`- \`${file.relativePath}\` — ~${file.estimatedTokens.toLocaleString()} tokens`);
    }
    lines.push("");
  }

  lines.push("### Guidelines");
  lines.push("");

  const guidelines = [
    "Ask before reading files marked as risky or sensitive.",
    "Summarize large files instead of reading them fully.",
    "Use patch-only output for code changes to minimize token usage.",
    "Prefer reading targeted files over scanning entire directories.",
  ];

  for (const g of guidelines) {
    lines.push(`- ${g}`);
  }
  lines.push("");
}

function appendSuggestedPromptPrefix(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Suggested Prompt Prefix");
  lines.push("");

  lines.push("> You are working in this repository. Start by reading this repo map. Do not read large files unless needed. Prefer targeted file reads. Use patch-only output for code changes. Ask before reading risky or generated files.");
  lines.push("");
}

function appendOverflowNotes(lines: string[], repoMap: RepoMapResult): void {
  lines.push("## Overflow Notes");
  lines.push("");

  if (repoMap.overflowNotes.length === 0) {
    lines.push("No budget trimming applied. All files fit within the requested budget.");
    lines.push("");
    return;
  }

  for (const note of repoMap.overflowNotes) {
    lines.push(`- ${note}`);
  }
  lines.push("");
}

function formatFileRow(file: RepoMapFile): string {
  return `| \`${file.relativePath}\` | ${file.reason} | ${file.estimatedTokens.toLocaleString()} | ${file.priority} |`;
}
