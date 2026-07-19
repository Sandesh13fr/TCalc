import ts from "typescript";
import type { RepoMapImport, RepoMapSymbol } from "@wma/core";

export function extractTypeScriptSymbols(content: string, relativePath: string, ext: string): RepoMapSymbol[] {
  const source = parseSource(content, relativePath, ext);
  const symbols: RepoMapSymbol[] = [];

  for (const node of source.statements) {
    const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
    if (ts.isFunctionDeclaration(node) && node.name) {
      const kind = ext === ".tsx" && /^[A-Z]/.test(node.name.text) ? "component" : "function";
      symbols.push(symbol(node.name.text, kind, node, source, relativePath, exported, hasModifier(node, ts.SyntaxKind.AsyncKeyword)));
    } else if (ts.isClassDeclaration(node) && node.name) {
      symbols.push(symbol(node.name.text, "class", node, source, relativePath, exported));
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          symbols.push(symbol(`${node.name.text}.${member.name.getText(source)}`, "method", member, source, relativePath, exported, hasModifier(member, ts.SyntaxKind.AsyncKeyword)));
        }
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      symbols.push(symbol(node.name.text, "interface", node, source, relativePath, exported));
    } else if (ts.isTypeAliasDeclaration(node)) {
      symbols.push(symbol(node.name.text, "type", node, source, relativePath, exported));
    } else if (ts.isEnumDeclaration(node)) {
      symbols.push(symbol(node.name.text, "enum", node, source, relativePath, exported));
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const kind = ext === ".tsx" && /^[A-Z]/.test(declaration.name.text) ? "component" : "variable";
          symbols.push(symbol(declaration.name.text, kind, declaration, source, relativePath, exported));
        }
      }
    }
  }

  return symbols;
}

export function extractTypeScriptImports(content: string, relativePath: string, ext: string): RepoMapImport[] {
  const source = parseSource(content, relativePath, ext);
  const imports: RepoMapImport[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ source: node.moduleSpecifier.text, relativePath, kind: "import" });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ source: node.moduleSpecifier.text, relativePath, kind: "export-from" });
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        imports.push({ source: node.arguments[0].text, relativePath, kind: "dynamic-import" });
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        imports.push({ source: node.arguments[0].text, relativePath, kind: "require" });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return imports;
}

function parseSource(content: string, relativePath: string, ext: string): ts.SourceFile {
  const kind = ext === ".tsx" ? ts.ScriptKind.TSX : ext === ".jsx" ? ts.ScriptKind.JSX : ext === ".js" ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  return ts.createSourceFile(relativePath, content, ts.ScriptTarget.Latest, true, kind);
}

function symbol(
  name: string,
  kind: RepoMapSymbol["kind"],
  node: ts.Node,
  source: ts.SourceFile,
  relativePath: string,
  exported: boolean,
  async = false,
): RepoMapSymbol {
  return {
    name,
    kind,
    relativePath,
    lineStart: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    exported,
    async,
    priority: exported ? 7 : kind === "class" || kind === "interface" ? 5 : 3,
  };
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some((modifier) => modifier.kind === kind) ?? false;
}
