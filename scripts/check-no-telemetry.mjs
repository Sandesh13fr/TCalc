#!/usr/bin/env node
import { readFileSync } from "node:fs";
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
  "modelcontextprotocol.io",
  "dev.azure.com",
];

function isUrlAllowed(url) {
  return ALLOWED_URLS.some((allowed) => url.includes(allowed));
}

function extractUrl(line, startIndex) {
  const rest = line.slice(startIndex);
  const urlMatch = rest.match(/^https?:\/\/[^\s"'\`)>]+/);
  return urlMatch ? urlMatch[0] : null;
}

async function main() {
  const sourceFiles = glob.sync("apps/**/*.ts", {
    cwd: repoRoot,
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts", "**/node_modules/.pnpm/**"],
  });

  let violations = [];

  for (const file of sourceFiles) {
    const filePath = resolve(repoRoot, file);
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check URLs: match full URLs and check against allowlist
      const urlPattern = /\bhttps?:\/\/[^\s"'\`)>]+/g;
      let match;
      while ((match = urlPattern.exec(line)) !== null) {
        const fullUrl = extractUrl(line, match.index);
        if (fullUrl && !isUrlAllowed(fullUrl)) {
          violations.push({ file, line: i + 1, content: trimmed, reason: `unexpected URL: ${fullUrl}` });
        }
      }

      // Check other suspicious patterns
      for (const pattern of SUSPICIOUS_PATTERNS) {
        const match = trimmed.match(pattern);
        if (!match) continue;
        const matched = match[0];
        // Skip telemetry flag if line is documenting "no telemetry"
        if (matched.toLowerCase() === "telemetry" && trimmed.toLowerCase().includes("no telemetry")) continue;
        violations.push({ file, line: i + 1, content: trimmed, reason: `matched pattern: ${matched}` });
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
    console.log(`    Reason: ${v.reason}`);
    console.log("");
  }

  console.log("Review each match above. If expected, add to ALLOWED_URLS.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
