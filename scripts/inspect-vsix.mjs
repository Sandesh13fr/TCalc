#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { ZipFile } from "yauzl";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

async function main() {
  const vsixPattern = resolve(repoRoot, "apps/vscode-extension/*.vsix");
  const files = glob.sync(vsixPattern);

  if (files.length === 0) {
    const altPattern = resolve(repoRoot, "dist-vsix/*.vsix");
    const altFiles = glob.sync(altPattern);
    if (altFiles.length === 0) {
      console.error("No .vsix file found. Run pnpm package:vscode first.");
      process.exit(1);
    }
    files.push(...altFiles);
  }

  const vsixPath = files[0];
  console.log(`Inspecting: ${vsixPath}`);
  console.log("");

  const requiredFiles = [
    "package.json",
    "dist/extension.js",
    "catalogs/models.json",
    "catalogs/providers.json",
    "README.md",
  ];

  const foundFiles: string[] = [];

  await new Promise<void>((resolve, reject) => {
    ZipFile.open(vsixPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("Failed to open zip"));
        return;
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.endsWith("/")) {
          // entry is inside extension folder, strip the top-level dir
          const parts = entry.fileName.split("/");
          const innerPath = parts.slice(1).join("/");
          if (innerPath) {
            foundFiles.push(innerPath);
          }
        }
        zipfile.readEntry();
      });
      zipfile.on("end", () => resolve());
      zipfile.on("error", reject);
    });
  });

  console.log(`Total files in VSIX: ${foundFiles.length}`);
  console.log("");

  let allFound = true;
  for (const rf of requiredFiles) {
    const ok = foundFiles.includes(rf);
    console.log(`  ${ok ? "✓" : "✗"} ${rf}`);
    if (!ok) allFound = false;
  }

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
