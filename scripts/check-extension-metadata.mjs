#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const extRoot = resolve(repoRoot, "apps/vscode-extension");
const pkgPath = resolve(extRoot, "package.json");
const rootPkgPath = resolve(repoRoot, "package.json");
const vscodeignorePath = resolve(extRoot, ".vscodeignore");

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function ok(msg) {
  console.log(`  \u2713 ${msg}`);
}

if (!existsSync(pkgPath)) {
  fail(`Missing extension package.json at ${pkgPath}`);
  console.log(`Found ${errors.length} error(s).`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const rootPkg = existsSync(rootPkgPath)
  ? JSON.parse(readFileSync(rootPkgPath, "utf-8"))
  : null;

console.log("Checking extension metadata for Open VSX compatibility...");
console.log("");

const required = [
  ["name", "string"],
  ["displayName", "string"],
  ["description", "string"],
  ["version", "string"],
  ["publisher", "string"],
  ["license", "string"],
  ["engines", "object"],
  ["main", "string"],
  ["categories", "array"],
  ["keywords", "array"],
  ["activationEvents", "array"],
  ["contributes", "object"],
];

for (const [key, type] of required) {
  const v = pkg[key];
  if (v === undefined || v === null) {
    fail(`Missing required field: ${key}`);
    continue;
  }
  if (type === "string" && typeof v !== "string") {
    fail(`Field ${key} must be a string`);
    continue;
  }
  if (type === "array" && !Array.isArray(v)) {
    fail(`Field ${key} must be an array`);
    continue;
  }
  if (type === "object" && (typeof v !== "object" || Array.isArray(v))) {
    fail(`Field ${key} must be an object`);
    continue;
  }
  if (type === "string" && key === "version" && !/^\d+\.\d+\.\d+/.test(v)) {
    fail(`Field version "${v}" is not semver-like (expected X.Y.Z)`);
    continue;
  }
  if (key === "publisher" && !/^[a-z0-9][a-z0-9-]*$/i.test(v)) {
    fail(`Field publisher "${v}" is not a valid Open VSX namespace (use letters, digits, hyphens)`);
    continue;
  }
  if (key === "name" && !/^[a-z0-9][a-z0-9._-]*$/i.test(v)) {
    fail(`Field name "${v}" is not a valid extension name (use lowercase letters, digits, dots, underscores, hyphens)`);
    continue;
  }
  ok(`${key}: ${typeof v === "string" ? v : `<${type} len=${v.length}>`}`);
}

if (pkg.engines && typeof pkg.engines === "object") {
  if (!pkg.engines.vscode) {
    fail("engines.vscode must be set");
  } else {
    ok(`engines.vscode: ${pkg.engines.vscode}`);
  }
}

if (!pkg.repository || typeof pkg.repository !== "object" || !pkg.repository.url) {
  fail("repository.url must be set");
} else {
  ok(`repository: ${pkg.repository.url}`);
}

if (!pkg.bugs || typeof pkg.bugs !== "object" || !pkg.bugs.url) {
  fail("bugs.url must be set");
} else {
  ok(`bugs: ${pkg.bugs.url}`);
}

if (!pkg.homepage || typeof pkg.homepage !== "string") {
  fail("homepage must be set");
} else {
  ok(`homepage: ${pkg.homepage}`);
}

if (pkg.icon) {
  const iconPath = resolve(extRoot, pkg.icon);
  if (!existsSync(iconPath)) {
    fail(`Icon declared in manifest (${pkg.icon}) does not exist at ${iconPath}`);
  } else {
    const stat = statSync(iconPath);
    if (!stat.isFile()) ok(`icon: ${pkg.icon} (not a regular file)`);
    else ok(`icon: ${pkg.icon} (${stat.size} bytes)`);
  }
} else {
  warn("icon: not declared (Open VSX will show a default placeholder)");
}

const requiredFiles = [
  { rel: "README.md", label: "README" },
  { rel: "CHANGELOG.md", label: "CHANGELOG" },
  { rel: "LICENSE", label: "LICENSE" },
];

for (const f of requiredFiles) {
  const full = resolve(extRoot, f.rel);
  if (!existsSync(full)) {
    fail(`Required file missing: apps/vscode-extension/${f.rel}`);
  } else {
    const stat = statSync(full);
    ok(`${f.label}: apps/vscode-extension/${f.rel} (${stat.size} bytes)`);
  }
}

const requiredCatalogs = [
  "catalogs/models.json",
  "catalogs/providers.json",
];

for (const rel of requiredCatalogs) {
  const full = resolve(extRoot, rel);
  if (!existsSync(full)) {
    fail(`Required catalog missing: apps/vscode-extension/${rel}`);
  } else {
    try {
      JSON.parse(readFileSync(full, "utf-8"));
      ok(`catalog: apps/vscode-extension/${rel} (valid JSON)`);
    } catch (e) {
      fail(`Catalog apps/vscode-extension/${rel} is not valid JSON: ${e.message}`);
    }
  }
}

if (existsSync(vscodeignorePath)) {
  const vscodeignore = readFileSync(vscodeignorePath, "utf-8");
  const lines = vscodeignore
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  for (const rel of requiredFiles.map((f) => f.rel)) {
    if (lines.includes(rel)) {
      fail(`.vscodeignore excludes required file: ${rel}`);
    }
  }
  for (const rel of requiredCatalogs) {
    if (lines.includes(rel)) {
      fail(`.vscodeignore excludes required catalog: ${rel}`);
    }
  }
  if (lines.includes("package.json")) {
    fail(`.vscodeignore excludes package.json (this will break the extension)`);
  } else {
    ok(".vscodeignore does not block required manifest/files");
  }
  ok(`.vscodeignore loaded (${lines.length} rules)`);
} else {
  warn(".vscodeignore not found; VSIX will include everything in apps/vscode-extension/");
}

if (rootPkg && typeof rootPkg.version === "string") {
  if (rootPkg.version !== pkg.version) {
    warn(
      `Version mismatch: root package.json is ${rootPkg.version}, extension is ${pkg.version}. ` +
        `This is allowed but you may want to keep them in sync.`,
    );
  } else {
    ok(`version matches root: ${pkg.version}`);
  }
}

const requiredCategories = pkg.categories || [];
if (requiredCategories.includes("Other")) {
  warn(
    "categories includes 'Other' — Open VSX accepts it but a more specific category is preferred",
  );
}

const allContribCommands =
  pkg.contributes && Array.isArray(pkg.contributes.commands)
    ? pkg.contributes.commands
    : [];
if (allContribCommands.length > 0) {
  const seen = new Set();
  for (const c of allContribCommands) {
    if (!c.command || typeof c.command !== "string") {
      fail(`contributes.commands entry missing 'command' field: ${JSON.stringify(c)}`);
      continue;
    }
    if (seen.has(c.command)) {
      fail(`contributes.commands has duplicate command id: ${c.command}`);
    }
    seen.add(c.command);
    if (!c.title || typeof c.title !== "string") {
      warn(`contributes.commands entry missing 'title': ${c.command}`);
    }
  }
  ok(`contributes.commands: ${allContribCommands.length} commands (all have unique ids)`);
}

const activationEvents = pkg.activationEvents || [];
const commandIds = allContribCommands.map((c) => c.command);
for (const evt of activationEvents) {
  if (typeof evt === "string" && evt.startsWith("onCommand:")) {
    const id = evt.slice("onCommand:".length);
    if (!commandIds.includes(id)) {
      warn(`activationEvents references unknown command: ${evt}`);
    }
  }
}
ok(`activationEvents: ${activationEvents.length} entries`);

console.log("");
if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
  console.log("");
}

if (errors.length === 0) {
  console.log("Extension metadata check passed.");
  process.exit(0);
} else {
  console.log(`Extension metadata check FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
