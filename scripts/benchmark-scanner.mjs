#!/usr/bin/env node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { scanWorkspace } from "../packages/scanner/dist/index.js";

const fileCount = Number(process.env.TCALC_BENCHMARK_FILES ?? 1000);
const root = mkdtempSync(join(tmpdir(), "tcalc-large-workspace-"));

try {
  for (let directory = 0; directory < 20; directory++) {
    const folder = join(root, `src-${directory}`);
    mkdirSync(folder);
    for (let index = directory; index < fileCount; index += 20) {
      writeFileSync(join(folder, `file-${index}.ts`), `export const value${index} = ${index};\n`);
    }
  }

  const started = performance.now();
  const result = await scanWorkspace({ rootPath: root });
  const elapsedMs = Math.round(performance.now() - started);
  if (result.totalFiles !== fileCount || result.includedFiles !== fileCount) {
    throw new Error(`Expected ${fileCount} included files, received ${result.includedFiles}/${result.totalFiles}`);
  }
  console.log(`Scanned ${fileCount} files in ${elapsedMs} ms (${result.includedTokens.toLocaleString()} estimated tokens).`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
