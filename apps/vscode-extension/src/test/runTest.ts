import { runTests } from "@vscode/test-electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionDevelopmentPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const extensionTestsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "suite", "index.js");

await runTests({ extensionDevelopmentPath, extensionTestsPath });
