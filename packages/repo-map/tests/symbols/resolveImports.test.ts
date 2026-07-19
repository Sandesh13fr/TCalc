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
});
