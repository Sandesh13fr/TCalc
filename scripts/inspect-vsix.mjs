#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import yauzl from "yauzl";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

async function main() {
  const expected = JSON.parse(readFileSync(resolve(repoRoot, "apps/vscode-extension/package.json"), "utf-8"));
  const vsixPath = resolve(repoRoot, "dist-vsix", `${expected.name}-${expected.version}.vsix`);
  if (!existsSync(vsixPath)) {
    console.error(`Expected VSIX not found: ${vsixPath}. Run pnpm package:vscode first.`);
    process.exit(1);
  }
  console.log(`Inspecting: ${vsixPath}`);
  console.log("");

  const requiredFiles = [
    "package.json",
    "dist/extension.js",
    "catalogs/models.json",
    "catalogs/providers.json",
    "README.md",
  ];

  const foundFiles = [];
  let packagedVersion;

  await new Promise((resolve, reject) => {
    yauzl.open(vsixPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("Failed to open zip"));
        return;
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.endsWith("/")) {
          const parts = entry.fileName.split("/");
          const innerPath = parts.slice(1).join("/");
          if (innerPath) {
            foundFiles.push(innerPath);
          }
          if (innerPath === "package.json") {
            zipfile.openReadStream(entry, (streamError, stream) => {
              if (streamError || !stream) return reject(streamError ?? new Error("Failed to read package.json"));
              let json = "";
              stream.on("data", (chunk) => json += chunk);
              stream.on("end", () => {
                packagedVersion = JSON.parse(json).version;
                zipfile.readEntry();
              });
              stream.on("error", reject);
            });
            return;
          }
        }
        zipfile.readEntry();
      });
      zipfile.on("end", () => resolve());
      zipfile.on("error", reject);
    });
  });

  const normalizedFound = foundFiles.map((f) => f.replace(/readme\.md$/i, "README.md"));

  console.log(`Total files in VSIX: ${foundFiles.length}`);
  console.log("");

  let allFound = true;
  for (const rf of requiredFiles) {
    const ok = normalizedFound.includes(rf);
    console.log(`  ${ok ? "✓" : "✗"} ${rf}`);
    if (!ok) allFound = false;
  }

  const versionMatches = packagedVersion === expected.version;
  console.log(`  ${versionMatches ? "\u2713" : "\u2717"} version ${expected.version}`);
  allFound &&= versionMatches;

  console.log("");
  if (allFound) {
    console.log("All required files present.");
  } else {
    console.error("Some required files are missing!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
