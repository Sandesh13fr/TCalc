#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist-vsix");

function findVsix() {
  if (!existsSync(distDir)) return null;
  const entries = readdirSync(distDir);
  const vsix = entries.filter((e) => e.endsWith(".vsix"));
  if (vsix.length === 0) return null;
  return resolve(distDir, vsix[0]);
}

const pat = process.env.OPEN_VSX_TOKEN;
if (!pat) {
  console.error("ERROR: OPEN_VSX_TOKEN environment variable is not set.");
  console.error("");
  console.error("Get a token from https://open-vsx.org/ -> User Settings -> Access Tokens.");
  console.error("Then re-run:");
  console.error("  export OPEN_VSX_TOKEN=...  (PowerShell: $env:OPEN_VSX_TOKEN='...')");
  console.error("  pnpm publish:open-vsx:local");
  process.exit(1);
}

if (pat.length < 16) {
  console.error("ERROR: OPEN_VSX_TOKEN looks too short. Aborting.");
  process.exit(1);
}

console.log("Open VSX local publish");
console.log("=======================");
console.log("");

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
  console.error("ERROR: No .vsix found in dist-vsix/ after packaging.");
  process.exit(1);
}
const stat = statSync(vsixPath);
console.log("");
console.log(`VSIX ready: ${vsixPath} (${stat.size} bytes)`);

console.log("");
console.log("Step 5/5: ovsx publish (this will push to open-vsx.org)");
console.log("");

try {
  execSync(`npx -y ovsx publish "${vsixPath}" --pat ${pat}`, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, OPEN_VSX_TOKEN: pat },
  });
  console.log("");
  console.log("Published to Open VSX.");
  console.log("Verify at: https://open-vsx.org/namespace/<your-publisher>");
} catch (err) {
  console.error("Publish failed.");
  console.error(err.message || err);
  process.exit(1);
}
