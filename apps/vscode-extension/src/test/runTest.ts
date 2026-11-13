import { runTests } from "@vscode/test-electron";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const extensionDevelopmentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const extensionTestsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "suite",
  "index.js",
);
const workspaceRoot = await mkdtemp(path.join(tmpdir(), "tcalc-vscode-test-"));
await mkdir(path.join(workspaceRoot, "alpha"));
await mkdir(path.join(workspaceRoot, "beta"));
await mkdir(path.join(workspaceRoot, "alpha", ".vscode"));
await mkdir(path.join(workspaceRoot, "beta", ".vscode"));
await writeFile(
  path.join(workspaceRoot, "alpha", ".vscode", "settings.json"),
  JSON.stringify({
    "wma.defaultGoal": "add-feature",
    "wma.privacyMode": "local-first",
  }),
);
await writeFile(
  path.join(workspaceRoot, "beta", ".vscode", "settings.json"),
  JSON.stringify({
    "wma.defaultGoal": "debug",
    "wma.privacyMode": "cloud-ok",
  }),
);
const workspaceFile = path.join(workspaceRoot, "multi-root.code-workspace");
await writeFile(
  workspaceFile,
  JSON.stringify({ folders: [{ path: "alpha" }, { path: "beta" }] }),
);

await runTests({
  extensionDevelopmentPath,
  extensionTestsPath,
  launchArgs: ["--disable-extensions", workspaceFile],
});
