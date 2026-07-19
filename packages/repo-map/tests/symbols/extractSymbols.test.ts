import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { parseFileSymbols } from "../../src/symbols/parseFileSymbols.js";
import type { WorkspaceFileInfo } from "@wma/core";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "wma-symbols-test-"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function makeFileInfo(relativePath: string, ext: string, name: string, bytes = 1000): WorkspaceFileInfo {
  return {
    path: join(tempDir, name),
    relativePath,
    extension: ext,
    language: ext === ".py" ? "Python" : ext === ".tsx" || ext === ".jsx" ? "TypeScript React" : "TypeScript",
    bytes,
    estimatedTokens: Math.floor(bytes / 4),
    included: true,
    riskFlags: [],
  };
}

describe("parseFileSymbols - TypeScript", () => {
  it("extracts TS functions, classes, interfaces, types", () => {
    const content = `
export function hello(name: string): string {
  return "hello " + name;
}

class MyClass {
  doStuff() {}
}

interface MyInterface {
  name: string;
}

type MyType = string | number;

enum MyEnum {
  A,
  B,
}

const myConst = 42;
`;
    const f = join(tempDir, "test.ts");
    writeFileSync(f, content, "utf-8");
    const file = makeFileInfo("src/test.ts", ".ts", "test.ts");
    const result = parseFileSymbols(file, true);
    expect(result.error).toBeNull();
    const names = result.symbols.map((s) => s.name);
    expect(names).toContain("hello");
    expect(names).toContain("MyClass");
    expect(names).toContain("MyInterface");
    expect(names).toContain("MyType");
    expect(names).toContain("MyEnum");
    expect(names).toContain("myConst");
    expect(names).toContain("MyClass.doStuff");

    const hello = result.symbols.find((s) => s.name === "hello")!;
    expect(hello.exported).toBe(true);
    expect(hello.kind).toBe("function");
  });

  it("detects async functions", () => {
    const content = "export async function fetchData() { return null; }";
    const f = join(tempDir, "test2.ts");
    writeFileSync(f, content, "utf-8");
    const file = makeFileInfo("src/test.ts", ".ts", "test2.ts");
    const result = parseFileSymbols(file, true);
    const fn = result.symbols.find((s) => s.name === "fetchData");
    expect(fn).toBeDefined();
    expect(fn!.async).toBe(true);
  });

  it("extracts TSX React component-like symbols", () => {
    const content = `
const MyButton: React.FC<Props> = () => { return <button />; };
export function PrimaryButton() { return <button />; }
`;
    const f = join(tempDir, "Button.tsx");
    writeFileSync(f, content, "utf-8");
    const file = makeFileInfo("src/Button.tsx", ".tsx", "Button.tsx");
    const result = parseFileSymbols(file, true);
    const names = result.symbols.map((s) => s.name);
    expect(names).toContain("MyButton");
    expect(names).toContain("PrimaryButton");
    const primaryButton = result.symbols.find((s) => s.name === "PrimaryButton")!;
    expect(primaryButton.kind).toBe("component");
  });
});

describe("parseFileSymbols - additional languages", () => {
  it("extracts Java classes and methods", () => {
    const content = "public class AccountService {\n  public void refresh() {\n    return helper();\n  }\n}";
    const filePath = join(tempDir, "AccountService.java");
    writeFileSync(filePath, content, "utf-8");
    const result = parseFileSymbols(makeFileInfo("src/AccountService.java", ".java", "AccountService.java"), true);
    expect(result.symbols.map((symbol) => symbol.name)).toEqual(expect.arrayContaining(["AccountService", "refresh"]));
    expect(result.symbols.map((symbol) => symbol.name)).not.toContain("helper");
  });

  it("recognizes Go and Kotlin export rules", () => {
    writeFileSync(join(tempDir, "service.go"), "type Service struct {}\nfunc Run() {}\nfunc hidden() {}", "utf-8");
    const go = parseFileSymbols(makeFileInfo("service.go", ".go", "service.go"), true);
    expect(go.symbols.find((symbol) => symbol.name === "Service")).toMatchObject({ kind: "type", exported: true });
    expect(go.symbols.find((symbol) => symbol.name === "Run")?.exported).toBe(true);
    expect(go.symbols.find((symbol) => symbol.name === "hidden")?.exported).toBe(false);

    writeFileSync(join(tempDir, "Service.kt"), "class Service\nprivate fun hidden() {}", "utf-8");
    const kotlin = parseFileSymbols(makeFileInfo("Service.kt", ".kt", "Service.kt"), true);
    expect(kotlin.symbols.find((symbol) => symbol.name === "Service")?.exported).toBe(true);
    expect(kotlin.symbols.find((symbol) => symbol.name === "hidden")?.exported).toBe(false);
  });
});

describe("parseFileSymbols - JavaScript", () => {
  it("extracts JS functions, classes, imports", () => {
    const content = `
const fs = require("fs");
function greet(name) {
  return "Hello " + name;
}
class MyService {
  run() {}
}
`;
    const f = join(tempDir, "service.js");
    writeFileSync(f, content, "utf-8");
    const file = makeFileInfo("src/service.js", ".js", "service.js");
    const result = parseFileSymbols(file, true);
    const names = result.symbols.map((s) => s.name);
    expect(names).toContain("greet");
    expect(names).toContain("MyService");
    expect(result.imports.some((i) => i.source === "fs")).toBe(true);
  });
});

describe("parseFileSymbols - Python", () => {
  it("extracts Python functions, classes, imports", () => {
    const content = `
import os
from typing import Optional

class MyModel:
    def __init__(self):
        pass

    def predict(self):
        pass

def calculate(x):
    return x * 2

async def fetch():
    return None
`;
    const f = join(tempDir, "model.py");
    writeFileSync(f, content, "utf-8");
    const file = makeFileInfo("src/model.py", ".py", "model.py");
    const result = parseFileSymbols(file, true);
    const names = result.symbols.map((s) => s.name);
    expect(names).toContain("MyModel");
    expect(names).toContain("calculate");
    expect(names).toContain("fetch");
    const fetchSym = result.symbols.find((s) => s.name === "fetch")!;
    expect(fetchSym.async).toBe(true);
    expect(result.imports.some((i) => i.source === "os")).toBe(true);
    expect(result.imports.some((i) => i.source === "typing")).toBe(true);
  });
});

describe("parseFileSymbols - errors", () => {
  it("handles non-existent file gracefully", () => {
    const file: WorkspaceFileInfo = {
      path: join(tempDir, "nonexistent", "foo.ts"),
      relativePath: "src/nope.ts",
      extension: ".ts",
      language: "TypeScript",
      bytes: 100,
      estimatedTokens: 25,
      included: true,
      riskFlags: [],
    };
    const result = parseFileSymbols(file, true);
    expect(result.error).not.toBeNull();
    expect(result.symbols).toHaveLength(0);
  });

  it("handles unsupported extension", () => {
    const f = join(tempDir, "test.txt");
    writeFileSync(f, "some text", "utf-8");
    const file: WorkspaceFileInfo = {
      path: f,
      relativePath: "test.txt",
      extension: ".txt",
      language: "Text",
      bytes: 100,
      estimatedTokens: 25,
      included: true,
      riskFlags: [],
    };
    const result = parseFileSymbols(file, true);
    expect(result.error).toBeNull();
    expect(result.symbols).toHaveLength(0);
  });
});
