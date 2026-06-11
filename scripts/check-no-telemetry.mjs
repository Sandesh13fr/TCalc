#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const SUSPICIOUS_PATTERNS = [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\btelemetry\b/i,
  /\bappInsights\b/i,
  /\bXMLHttpRequest\b/i,
  /\bhttps?:\/\/[^\/]/,
];

const ALLOWED_URLS = [
  "github.com",
  "marketplace.visualstudio.com",
  "open-vsx.org",
  "opensource.org",
  "nodejs.org",
  "pnpm.io",
  "ollama.ai",
  "opencode",
];

function isUrlAllowed(url) {
  return ALLOWED_URLS.some((allowed) => url.includes(allowed));
}

async function main() {
  const sourceFiles = glob.sync("apps/**/*.ts", {
    cwd: repoRoot,
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  });

  let violations = [];

  for (const file of sourceFiles) {
    const filePath = resolve(repoRoot, file);
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of SUSPICIOUS_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const matched = match[0];
          if (matched.startsWith("http") && isUrlAllowed(matched)) {
            continue;
          }
          violations.push({ file, line: i + 1, content: line.trim() });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("No suspicious patterns found in source files.");
    process.exit(0);
  }

  console.log(`Found ${violations.length} potential violations:`);
  console.log("");
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.content}`);
    console.log("");
  }

  console.log("Review each match above. If expected, add to ALLOWED_URLS.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
