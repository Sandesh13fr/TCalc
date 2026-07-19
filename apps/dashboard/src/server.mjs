import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_REPORT_BYTES = 1_000_000;
const defaultPublicDir = fileURLToPath(new URL("../out", import.meta.url));
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".map", "application/json; charset=utf-8"], [".png", "image/png"],
  [".svg", "image/svg+xml"], [".txt", "text/plain; charset=utf-8"], [".woff2", "font/woff2"],
]);

export function createDashboardServer(options = {}) {
  const dataDir = path.resolve(options.dataDir ?? process.env.TCALC_DATA_DIR ?? ".tcalc-dashboard");
  const token = options.token ?? process.env.TCALC_DASHBOARD_TOKEN;
  const publicDir = path.resolve(options.publicDir ?? defaultPublicDir);

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/api/reports") return json(response, 200, await listReports(dataDir));
      if (request.method === "POST" && url.pathname === "/api/reports") {
        if (!token) return json(response, 503, { error: "Report uploads are disabled until TCALC_DASHBOARD_TOKEN is set" });
        if (request.headers.authorization !== `Bearer ${token}`) return json(response, 401, { error: "Unauthorized" });
        let report;
        try {
          report = JSON.parse(await readBody(request));
        } catch (error) {
          if (error instanceof SyntaxError) return json(response, 400, { error: "Report body must be valid JSON" });
          throw error;
        }
        if (!isWorkspaceReport(report)) return json(response, 400, { error: "Expected a TCalc report with schemaVersion 1.0.0" });
        await mkdir(dataDir, { recursive: true });
        const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
        await writeFile(path.join(dataDir, `${id}.json`), JSON.stringify(report), { encoding: "utf8", flag: "wx" });
        return json(response, 201, { id });
      }
      const reportMatch = url.pathname.match(/^\/api\/reports\/([\w-]+)$/);
      if (request.method === "GET" && reportMatch) {
        try {
          return json(response, 200, JSON.parse(await readFile(path.join(dataDir, `${reportMatch[1]}.json`), "utf8")));
        } catch (error) {
          if (error.code === "ENOENT") return json(response, 404, { error: "Report not found" });
          throw error;
        }
      }
      if (request.method === "GET" && await serveStatic(response, publicDir, url.pathname)) return;
      json(response, 404, { error: "Not found" });
    } catch (error) {
      json(response, error?.message === "Report is too large" ? 413 : 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function serveStatic(response, publicDir, pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return false;
  }
  if (relativePath.split("/").includes("..")) return false;
  const root = path.resolve(publicDir);
  const requested = path.resolve(root, relativePath);
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) return false;
  const candidates = pathname.endsWith("/")
    ? [path.join(requested, "index.html")]
    : [requested, `${requested}.html`, path.join(requested, "index.html")];
  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate);
      const extension = path.extname(candidate).toLowerCase();
      const immutable = pathname.startsWith("/_next/static/");
      response.writeHead(200, {
        "content-type": CONTENT_TYPES.get(extension) ?? "application/octet-stream",
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
        "x-content-type-options": "nosniff",
        ...(extension === ".html" ? { "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';" } : {}),
      });
      response.end(content);
      return true;
    } catch (error) {
      if (!["ENOENT", "EISDIR"].includes(error.code)) throw error;
    }
  }
  return false;
}

async function listReports(dataDir) {
  try {
    const files = (await readdir(dataDir)).filter((file) => /^[\w-]+\.json$/.test(file));
    const reports = await Promise.all(files.map(async (file) => {
      const report = JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
      return { id: file.slice(0, -5), title: report.title, generatedAt: report.generatedAt, goal: report.goal, summary: report.summary };
    }));
    return reports.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readBody(request) {
  const declared = Number(request.headers["content-length"] ?? 0);
  if (declared > MAX_REPORT_BYTES) throw new Error("Report is too large");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_REPORT_BYTES) throw new Error("Report is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isWorkspaceReport(value) {
  if (!isRecord(value) || value.schemaVersion !== "1.0.0" || typeof value.title !== "string" || typeof value.generatedAt !== "string" || typeof value.workspacePath !== "string") return false;
  if (value.goal !== null && typeof value.goal !== "string") return false;
  if (!isRecord(value.summary) || !["totalFiles", "includedFiles", "excludedFiles", "totalEstimatedTokens", "includedTokens"].every((field) => nonNegativeNumber(value.summary[field]))) return false;
  if (!["topTokenConsumers", "topFolders", "languages", "warnings", "assumptions", "optimizationChecklist"].every((field) => Array.isArray(value[field]))) return false;
  return value.recommendations === null || isRecord(value.recommendations);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(value));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.TCALC_DASHBOARD_HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8787);
  createDashboardServer().listen(port, host, () => console.log(`TCalc dashboard: http://${host}:${port}`));
}
