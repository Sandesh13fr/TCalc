import type { WorkspaceScanResult, RepoMapOptions, RepoMapFile } from "@wma/core";

const CONFIG_PATTERNS = [
  /^package\.json$/,
  /^pnpm-workspace\.yaml$/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^tsconfig\.json$/,
  /^tsconfig\..*\.json$/,
  /^vite\.config\..*/,
  /^next\.config\..*/,
  /^astro\.config\..*/,
  /^nuxt\.config\..*/,
  /^svelte\.config\..*/,
  /^tailwind\.config\..*/,
  /^eslint\.config\..*/,
  /^prettier\.config\..*/,
  /^biome\.json$/,
  /^turbo\.json$/,
  /^nx\.json$/,
  /^docker-compose\..*/,
  /^Dockerfile$/,
  /^\.env\.example$/,
];

const DOC_PATTERNS = [
  /^README\.md$/i,
  /^instructions\.md$/i,
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
  /^CONTRIBUTING\.md$/i,
  /^SECURITY\.md$/i,
  /^docs\//,
];

const ENTRY_POINT_PATTERNS = [
  /^src\/index\./,
  /^src\/main\./,
  /^src\/app\./,
  /^src\/server\./,
  /^src\/extension\./,
  /^app\//,
  /^pages\//,
  /^routes\//,
  /^api\//,
  /^server\./,
  /^index\./,
  /^main\./,
];

const TEST_PATTERNS = [
  /^test\//,
  /^tests\//,
  /\/__tests__\//,
  /\.test\./,
  /\.spec\./,
  /^vitest\.config\..*/,
  /^jest\.config\..*/,
  /^playwright\.config\..*/,
];

const IMPORTANT_SOURCE_PATTERNS = [
  /^src\//,
  /^app\//,
  /^packages\//,
  /^apps\//,
  /^lib\//,
  /^server\//,
  /^client\//,
  /^components\//,
  /^commands\//,
  /^views\//,
  /^webview\//,
];

const EXCLUDED_PATTERNS = [
  /^node_modules\//,
  /^dist\//,
  /^build\//,
  /^out\//,
  /^coverage\//,
  /^\.git\//,
  /^\.next\//,
];

const LARGE_FILE_THRESHOLD = 50000;
const GENERATED_EXTENSIONS = new Set([".min.js", ".bundle.js", ".generated.ts", ".generated.js"]);

function isGeneratedFile(relativePath: string, extension: string): boolean {
  if (GENERATED_EXTENSIONS.has(extension)) return true;
  const base = relativePath.split("/").pop() ?? "";
  return base.includes(".min.") || base.includes(".bundle.");
}

function matchPattern(relativePath: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(relativePath));
}

function getLanguage(extension: string): string | undefined {
  const langMap: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C Header",
    ".cs": "C#",
    ".scala": "Scala",
    ".vue": "Vue",
    ".svelte": "Svelte",
    ".md": "Markdown",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".less": "Less",
    ".html": "HTML",
    ".sh": "Shell",
    ".bat": "Batch",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".graphql": "GraphQL",
    ".prisma": "Prisma",
  };
  return langMap[extension];
}

export function selectImportantFiles(
  scanResult: WorkspaceScanResult,
  options: RepoMapOptions,
): {
  importantFiles: RepoMapFile[];
  entryPoints: RepoMapFile[];
  testFiles: RepoMapFile[];
  configFiles: RepoMapFile[];
  documentationFiles: RepoMapFile[];
  riskyFiles: RepoMapFile[];
  largeFiles: RepoMapFile[];
  generatedFiles: RepoMapFile[];
  excludedFiles: RepoMapFile[];
  recommendedInclude: RepoMapFile[];
  recommendedExclude: RepoMapFile[];
} {
  const includedFiles = scanResult.files.filter((f) => f.included);

  const entryPoints: RepoMapFile[] = [];
  const testFiles: RepoMapFile[] = [];
  const configFiles: RepoMapFile[] = [];
  const documentationFiles: RepoMapFile[] = [];
  const riskyFiles: RepoMapFile[] = [];
  const largeFiles: RepoMapFile[] = [];
  const generatedFiles: RepoMapFile[] = [];
  const excludedFiles: RepoMapFile[] = [];
  const sourceFiles: RepoMapFile[] = [];
  const otherFiles: RepoMapFile[] = [];

  for (const file of includedFiles) {
    const rp = file.relativePath.replace(/\\/g, "/");
    const priority = getPriority(rp, file.extension, file.riskFlags, file.estimatedTokens);
    const reason = getReason(rp, priority);
    const repoFile: RepoMapFile = {
      relativePath: rp,
      language: getLanguage(file.extension),
      estimatedTokens: file.estimatedTokens,
      reason,
      priority,
    };

    if (isGeneratedFile(rp, file.extension)) {
      generatedFiles.push(repoFile);
    }

    if (file.estimatedTokens > LARGE_FILE_THRESHOLD) {
      largeFiles.push(repoFile);
    }

    if (file.riskFlags.length > 0 && !file.riskFlags.includes("large-file")) {
      riskyFiles.push(repoFile);
    }

    if (priority >= 100) {
      entryPoints.push(repoFile);
    } else if (priority >= 90) {
      configFiles.push(repoFile);
    } else if (priority >= 80) {
      documentationFiles.push(repoFile);
    } else if (priority >= 70) {
      testFiles.push(repoFile);
    } else if (priority >= 60) {
      sourceFiles.push(repoFile);
    } else if (priority <= 10) {
      excludedFiles.push(repoFile);
    } else {
      otherFiles.push(repoFile);
    }
  }

  for (const file of scanResult.files.filter((f) => !f.included)) {
    const rp = file.relativePath.replace(/\\/g, "/");
    excludedFiles.push({
      relativePath: rp,
      language: getLanguage(file.extension),
      estimatedTokens: file.estimatedTokens,
      reason: file.excludedReason ?? "Excluded by configuration",
      priority: 0,
    });
  }

  const allImportant = [...entryPoints, ...configFiles, ...documentationFiles, ...testFiles, ...sourceFiles];

  const recommendedInclude = allImportant
    .filter((f) => f.priority >= 60)
    .slice(0, options.maxFiles ?? 50);

  const recommendedExclude = [...largeFiles, ...generatedFiles, ...excludedFiles, ...riskyFiles]
    .filter((f) => f.estimatedTokens > 1000);

  return {
    importantFiles: allImportant,
    entryPoints,
    testFiles,
    configFiles,
    documentationFiles,
    riskyFiles,
    largeFiles,
    generatedFiles,
    excludedFiles,
    recommendedInclude,
    recommendedExclude,
  };
}

function getPriority(
  relativePath: string,
  extension: string,
  riskFlags: string[],
  estimatedTokens: number,
): number {
  const rp = relativePath.replace(/\\/g, "/");

  if (matchPattern(rp, EXCLUDED_PATTERNS)) return 5;
  if (isGeneratedFile(rp, extension)) return 10;
  if (riskFlags.includes("secret")) return 10;
  if (riskFlags.includes("lockfile")) return 15;
  if (riskFlags.includes("database-dump")) return 10;
  if (riskFlags.includes("log-file")) return 5;

  if (estimatedTokens > LARGE_FILE_THRESHOLD) return 20;

  if (matchPattern(rp, ENTRY_POINT_PATTERNS)) return 100;
  if (matchPattern(rp, CONFIG_PATTERNS)) return 90;
  if (matchPattern(rp, DOC_PATTERNS)) return 80;
  if (matchPattern(rp, TEST_PATTERNS)) return 70;
  if (matchPattern(rp, IMPORTANT_SOURCE_PATTERNS)) return 60;

  return 40;
}

function getReason(relativePath: string, priority: number): string {
  if (priority >= 100) return "Likely entry point";
  if (priority >= 90) return "Config / tooling file";
  if (priority >= 80) return "Documentation / instructions";
  if (priority >= 70) return "Test file";
  if (priority >= 60) return "Important source file";
  if (priority >= 30) return "Other source file";
  if (priority >= 10) return "Low-priority";
  return "Excluded";
}
