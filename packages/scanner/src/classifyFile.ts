import path from "node:path";
import type { RiskFlag } from "@wma/core";

interface ClassificationResult {
  language: string;
  riskFlags: RiskFlag[];
  isBinary: boolean;
  isGenerated: boolean;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript React",
  ".js": "JavaScript",
  ".jsx": "JavaScript React",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".md": "Markdown",
  ".mdx": "MDX",
  ".css": "CSS",
  ".scss": "SCSS",
  ".less": "Less",
  ".html": "HTML",
  ".py": "Python",
  ".rb": "Ruby",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".dart": "Dart",
  ".php": "PHP",
  ".c": "C",
  ".cpp": "C++",
  ".h": "C/C++ Header",
  ".cs": "C#",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".astro": "Astro",
  ".sql": "SQL",
  ".sh": "Shell",
  ".bash": "Bash",
  ".zsh": "Zsh",
  ".fish": "Fish",
  ".ps1": "PowerShell",
  ".bat": "Batch",
  ".cmd": "Batch",
  ".toml": "TOML",
  ".xml": "XML",
  ".svg": "SVG",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".proto": "Protocol Buffers",
  ".lock": "Lockfile",
};

const GENERATED_EXTENSIONS = new Set([".min.js", ".min.css", ".bundle.js", ".chunk.js"]);
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
  ".mp4", ".mp3", ".woff", ".woff2", ".ttf", ".eot",
  ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
]);

const LARGE_TEXT_EXTENSIONS = new Set([".svg"]);

const LOCKFILE_NAMES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "Gemfile.lock", "Cargo.lock", "poetry.lock", "composer.lock",
  "bun.lockb",
]);

const SECRET_FILE_PATTERNS = [
  ".env", ".env.local", ".env.production",
  "*.pem", "*.key", "*.p12", "*.pfx", "id_rsa", "id_ed25519",
  "service-account.json", "credentials.json",
  ".netrc", ".npmrc",
];

const SECRET_CONTENT_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{16,}['"]/i,
  /(?:access[_-]?token|accesstoken)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  /gh[ps]_[A-Za-z0-9]{36,}/,
  /sk-(?:live|test|prod|dev)_[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /(?:secret)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
];

function matchesGlob(fileName: string, pattern: string): boolean {
  if (pattern.startsWith("*.") && fileName.endsWith(pattern.slice(1))) return true;
  if (pattern === fileName) return true;
  return false;
}

function isSecretFile(relativePath: string): boolean {
  const name = path.basename(relativePath);
  for (const p of SECRET_FILE_PATTERNS) {
    if (matchesGlob(name, p)) return true;
  }
  return false;
}

function isGeneratedFile(relativePath: string): boolean {
  const ext = path.extname(relativePath);
  if (GENERATED_EXTENSIONS.has(ext)) return true;
  return false;
}

function isLockfile(relativePath: string): boolean {
  return LOCKFILE_NAMES.has(path.basename(relativePath));
}

function isBuildOutput(relativePath: string): boolean {
  const parts = relativePath.replace(/\\/g, "/").split("/");
  const buildDirs = new Set(["dist", "build", "out", ".next", ".nuxt", "coverage"]);
  return parts.some(p => buildDirs.has(p) || p.endsWith("-lockfile"));
}

function isDatabaseDump(relativePath: string): boolean {
  const ext = path.extname(relativePath);
  return [".sql", ".dump", ".sqlite", ".db"].includes(ext) && !ext.includes(".proto");
}

function isLogFile(relativePath: string): boolean {
  return path.extname(relativePath) === ".log";
}

export function classifyFile(relativePath: string, sizeBytes: number): ClassificationResult {
  const ext = path.extname(relativePath).toLowerCase();
  const name = path.basename(relativePath);

  const language = EXTENSION_LANGUAGE_MAP[ext] || guessLanguage(name) || "Unknown";
  const isBinary = BINARY_EXTENSIONS.has(ext) && !LARGE_TEXT_EXTENSIONS.has(ext);
  const isGenerated = isGeneratedFile(relativePath);

  const riskFlags: RiskFlag[] = [];
  if (isSecretFile(relativePath)) riskFlags.push("secret");
  if (isGenerated) riskFlags.push("generated");
  if (isLockfile(relativePath)) riskFlags.push("lockfile");
  if (isBuildOutput(relativePath)) riskFlags.push("build-output");
  if (isBinary) riskFlags.push("binary");
  if (isDatabaseDump(relativePath)) riskFlags.push("database-dump");
  if (isLogFile(relativePath)) riskFlags.push("log-file");
  if (sizeBytes > 500_000) riskFlags.push("large-file");

  return { language, riskFlags, isBinary, isGenerated };
}

export function detectSecretRisk(filePath: string, contentPreview: string): RiskFlag[] {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return [];

  for (const pattern of SECRET_CONTENT_PATTERNS) {
    if (pattern.test(contentPreview)) {
      return ["secret"];
    }
  }
  return [];
}

function guessLanguage(fileName: string): string | undefined {
  if (fileName === "Dockerfile") return "Dockerfile";
  if (fileName === "Makefile") return "Makefile";
  if (fileName.endsWith("Dockerfile")) return "Dockerfile";
  if (fileName === ".gitignore" || fileName === ".dockerignore") return "Ignore";
  return undefined;
}
