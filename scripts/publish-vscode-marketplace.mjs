#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist-vsix");
const extPkg = JSON.parse(
  readFileSync(resolve(repoRoot, "apps/vscode-extension/package.json"), "utf-8"),
);

function findVsix() {
  const expectedPath = resolve(distDir, `${extPkg.name}-${extPkg.version}.vsix`);
  return existsSync(expectedPath) ? expectedPath : null;
}

const isDryRun = process.argv.includes("--dry-run");
const pat = process.env.VSCE_TOKEN;

if (!isDryRun && !pat) {
  console.error("ERROR: VSCE_TOKEN environment variable is not set.");
  console.error("");
  console.error("Get a token from https://dev.azure.com/ -> User Settings -> Personal access tokens.");
  console.error("The token needs the 'Marketplace (Publish)' scope.");
  console.error("Then re-run:");
  console.error("  export VSCE_TOKEN=...  (PowerShell: $env:VSCE_TOKEN='...')");
  console.error("  pnpm publish:vscode:local");
  process.exit(1);
}

if (!isDryRun && pat && pat.length < 16) {
  console.error("ERROR: VSCE_TOKEN looks too short. Aborting.");
  process.exit(1);
}

console.log("VS Code Marketplace publish");
console.log("============================");
console.log("");

if (isDryRun) {
  console.log("Mode: dry run (no publish)");
  console.log("");
}

console.log("Step 1/4: check:extension-metadata");
execSync("node scripts/check-extension-metadata.mjs", {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log("");
console.log("Step 2/4: pnpm build");
execSync("pnpm build", { cwd: repoRoot, stdio: "inherit" });

console.log("");
console.log("Step 3/4: pnpm test");
execSync("pnpm test", { cwd: repoRoot, stdio: "inherit" });

console.log("");
console.log("Step 4/4: pnpm package:vscode + inspect");
execSync("pnpm package:vscode", { cwd: repoRoot, stdio: "inherit" });
execSync("pnpm package:vscode:inspect", { cwd: repoRoot, stdio: "inherit" });

const vsixPath = findVsix();
if (!vsixPath) {
  console.error(
    `ERROR: Expected ${extPkg.name}-${extPkg.version}.vsix in dist-vsix/ after packaging.`,
  );
  process.exit(1);
}
const stat = statSync(vsixPath);
console.log("");
console.log(`VSIX ready: ${vsixPath} (${stat.size} bytes)`);

if (isDryRun) {
  console.log("");
  console.log("Dry run complete. No publish performed.");
  console.log("To publish for real, run:");
  console.log("  export VSCE_TOKEN=...");
  console.log("  pnpm publish:vscode:local");
  process.exit(0);
}

console.log("");
console.log("Publishing to VS Code Marketplace...");

try {
  execSync(`npx -y @vscode/vsce publish --packagePath "${vsixPath}" --pat ${pat}`, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, VSCE_TOKEN: pat },
  });
  console.log("");
  console.log("Published to VS Code Marketplace.");
  console.log("Verify at: https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc");
} catch (err) {
  console.error("Publish failed.");
  console.error(err.message || err);
  process.exit(1);
}
