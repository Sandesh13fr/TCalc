import { describe, expect, it } from "vitest";
import type { WorkspaceScanResult } from "@wma/core";
import { resolveImports } from "../../src/symbols/resolveImports.js";

describe("resolveImports", () => {
  it("resolves relative module paths to workspace files", () => {
    const scan = {
      files: [{ relativePath: "src/lib/value.ts" }],
    } as WorkspaceScanResult;
    const [entry] = resolveImports([{ source: "./lib/value", relativePath: "src/index.ts", kind: "import" }], scan);
    expect(entry.resolvedPath).toBe("src/lib/value.ts");
  });

  it("resolves Python relative modules and packages", () => {
    const scan = {
      files: [{ relativePath: "pkg/shared.py" }, { relativePath: "pkg/sub/helpers/__init__.py" }],
    } as WorkspaceScanResult;
    const resolved = resolveImports([
      { source: "..shared", relativePath: "pkg/sub/main.py", kind: "import" },
      { source: ".helpers", relativePath: "pkg/sub/main.py", kind: "import" },
    ], scan);
    expect(resolved.map((entry) => entry.resolvedPath)).toEqual(["pkg/shared.py", "pkg/sub/helpers/__init__.py"]);
  });

  it("resolves direct and index imports for .mts and .cts files (Issue #137)", () => {
    const scan = {
      files: [
        { relativePath: "src/esm/helper.mts" },
        { relativePath: "src/esm/config/index.mts" },
        { relativePath: "src/cjs/util.cts" },
        { relativePath: "src/cjs/models/index.cts" },
      ],
    } as WorkspaceScanResult;

    const resolved = resolveImports([
      { source: "./helper", relativePath: "src/esm/main.mts", kind: "import" },
      { source: "./config", relativePath: "src/esm/main.mts", kind: "import" },
      { source: "./util", relativePath: "src/cjs/app.cts", kind: "import" },
      { source: "./models", relativePath: "src/cjs/app.cts", kind: "import" },
      { source: "external-package", relativePath: "src/esm/main.mts", kind: "import" },
    ], scan);

    expect(resolved.map((entry) => entry.resolvedPath)).toEqual([
      "src/esm/helper.mts",
      "src/esm/config/index.mts",
      "src/cjs/util.cts",
      "src/cjs/models/index.cts",
      undefined,
    ]);
  });
});
