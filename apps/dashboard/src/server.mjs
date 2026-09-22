import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_REPORT_BYTES = 1_000_000;
const SESSION_COOKIE = "tcalc_dashboard_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SESSIONS = 1000;
const defaultPublicDir = fileURLToPath(new URL("../out", import.meta.url));
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".map", "application/json; charset=utf-8"], [".png", "image/png"],
  [".svg", "image/svg+xml"], [".txt", "text/plain; charset=utf-8"], [".woff2", "font/woff2"],
]);

export function createDashboardServer(options = {}) {
  const dataDir = path.resolve(options.dataDir ?? process.env.TCALC_DATA_DIR ?? ".tcalc-dashboard");
  const token = options.token ?? process.env.TCALC_DASHBOARD_TOKEN;
  const publicRead = options.publicRead ?? isEnabled(process.env.TCALC_DASHBOARD_PUBLIC_READ);
  const publicDir = path.resolve(options.publicDir ?? defaultPublicDir);
  // Read-only browser sessions, created by proving knowledge of the token at POST /api/session.
  const sessions = new Map();

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/api/reports") {
        const denied = denyRead(request, token, publicRead, sessions);
        if (denied) return json(response, denied.status, denied.body, denied.headers);
        return json(response, 200, await listReports(dataDir));
      }
      if (request.method === "POST" && url.pathname === "/api/session") {
        if (!token) return json(response, 503, { error: "Report access is disabled until TCALC_DASHBOARD_TOKEN is set" });
        let credentials;
        try {
          credentials = JSON.parse(await readBody(request));
        } catch (error) {
          if (error instanceof SyntaxError) return json(response, 400, { error: "Session body must be valid JSON" });
          throw error;
        }
        if (!isRecord(credentials) || typeof credentials.token !== "string" || !timingSafeMatch(credentials.token, token)) {
          return json(response, 401, { error: "Unauthorized" });
        }
        const id = randomUUID();
        pruneSessions(sessions);
        sessions.set(id, Date.now() + SESSION_TTL_MS);
        return json(response, 200, { ok: true }, { "set-cookie": sessionCookie(request, id, SESSION_TTL_MS) });
      }
      if (request.method === "DELETE" && url.pathname === "/api/session") {
        const current = readSessionId(request);
        if (current) sessions.delete(current);
        return json(response, 200, { ok: true }, { "set-cookie": sessionCookie(request, "", 0) });
      }
      if (request.method === "POST" && url.pathname === "/api/reports") {
        if (!token) return json(response, 503, { error: "Report uploads are disabled until TCALC_DASHBOARD_TOKEN is set" });
        // Writes stay bearer-only on purpose: browsers attach cookies automatically, so accepting a
        // session cookie here would make uploads forgeable cross-site.
        if (!hasBearer(request, token)) return json(response, 401, { error: "Unauthorized" }, WWW_AUTHENTICATE);
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
        const denied = denyRead(request, token, publicRead, sessions);
        if (denied) return json(response, denied.status, denied.body, denied.headers);
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

function json(response, status, value, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers });
  response.end(JSON.stringify(value));
}

const WWW_AUTHENTICATE = { "www-authenticate": 'Bearer realm="TCalc reports"' };

/**
 * Saved reports expose workspace paths and file-level metadata, so reads are denied unless the
 * caller proves knowledge of the token or the operator has deliberately opted into public reads.
 */
function denyRead(request, token, publicRead, sessions) {
  // Fail closed first: without a token there is nothing to authenticate against, so reads stay
  // disabled even when public reads are opted into. Removing the token must never widen access.
  if (!token) return { status: 503, body: { error: "Report access is disabled until TCALC_DASHBOARD_TOKEN is set" } };
  if (publicRead) return null;
  if (hasBearer(request, token) || hasSession(request, sessions)) return null;
  return { status: 401, body: { error: "Unauthorized" }, headers: WWW_AUTHENTICATE };
}

function hasBearer(request, token) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") && timingSafeMatch(header.slice(7), token);
}

function hasSession(request, sessions) {
  const id = readSessionId(request);
  if (!id) return false;
  const expiresAt = sessions.get(id);
  if (expiresAt === undefined) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(id);
    return false;
  }
  return true;
}

function readSessionId(request) {
  for (const pair of (request.headers.cookie ?? "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    return pair.slice(separator + 1).trim();
  }
  return undefined;
}

function sessionCookie(request, id, maxAgeMs) {
  // HttpOnly keeps the session out of reach of page scripts; SameSite=Strict blocks cross-site use.
  const attributes = [`${SESSION_COOKIE}=${id}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (isSecureRequest(request)) attributes.push("Secure");
  return attributes.join("; ");
}

function isSecureRequest(request) {
  // Only ever adds the Secure attribute, so a spoofed header cannot downgrade the cookie.
  return Boolean(request.socket?.encrypted) || String(request.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https";
}

function pruneSessions(sessions) {
  const now = Date.now();
  for (const [id, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(id);
  }
  if (sessions.size < MAX_SESSIONS) return;
  for (const id of [...sessions.keys()].slice(0, sessions.size - MAX_SESSIONS + 1)) sessions.delete(id);
}

function timingSafeMatch(candidate, expected) {
  const left = Buffer.from(String(candidate), "utf8");
  const right = Buffer.from(String(expected), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.TCALC_DASHBOARD_HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8787);
  createDashboardServer().listen(port, host, () => {
    console.log(`TCalc dashboard: http://${host}:${port}`);
    if (isEnabled(process.env.TCALC_DASHBOARD_PUBLIC_READ)) console.warn("TCALC_DASHBOARD_PUBLIC_READ is enabled: saved reports are readable without authentication.");
  });
}
