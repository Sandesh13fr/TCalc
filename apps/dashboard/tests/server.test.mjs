import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { request } from "node:http";
import path from "node:path";
import { createDashboardServer } from "../src/server.mjs";

test("stores only authenticated versioned reports", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const server = createDashboardServer({ dataDir, token: "secret" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;
  try {
    assert.equal((await fetch(url, { method: "POST", body: "{}" })).status, 401);
    assert.equal((await fetch(url, { method: "POST", headers: { authorization: "Bearer secret" }, body: "{" })).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers: { authorization: "Bearer secret" }, body: JSON.stringify({ schemaVersion: "1.0.0", title: "Incomplete", summary: {} }) })).status, 400);
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify(report()),
    });
    assert.equal(response.status, 201);
    assert.equal((await (await fetch(url)).json()).length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("preserves UTF-8 split across request chunks", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const server = createDashboardServer({ dataDir, token: "secret" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const payload = Buffer.from(JSON.stringify(report("Café")));
    const split = payload.indexOf(Buffer.from("é")) + 1;
    const stored = await postChunks(port, payload.subarray(0, split), payload.subarray(split));
    assert.equal(stored.status, 201);
    const saved = await (await fetch(`http://127.0.0.1:${port}/api/reports/${stored.body.id}`)).json();
    assert.equal(saved.title, "Café");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("lists valid reports and skips malformed JSON without exposing report contents in diagnostics", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const warnings = [];
  const server = createDashboardServer({ dataDir, warn: (msg) => warnings.push(msg) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;

  try {
    const validReport = report("Valid Alpha");
    await writeFile(path.join(dataDir, "valid-1.json"), JSON.stringify(validReport), "utf8");

    const sensitiveSnippet = "SENSITIVE_LEAK_TOKEN_MALFORMED_12345";
    await writeFile(
      path.join(dataDir, "malformed.json"),
      `{"title": "${sensitiveSnippet}", "summary": { truncated...`,
      "utf8"
    );

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 1);
    assert.equal(body[0].id, "valid-1");
    assert.equal(body[0].title, "Valid Alpha");

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /malformed\.json/);
    assert.match(warnings[0], /malformed JSON/i);
    assert.equal(warnings[0].includes(sensitiveSnippet), false);
    assert.equal(warnings[0].includes("truncated"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("skips incompatible schema versions and invalid schemas while listing valid reports", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const warnings = [];
  const server = createDashboardServer({ dataDir, warn: (msg) => warnings.push(msg) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;

  try {
    const validReport = report("Valid Beta");
    await writeFile(path.join(dataDir, "valid-2.json"), JSON.stringify(validReport), "utf8");

    const sensitiveVersionToken = "SECRET_VERSION_PAYLOAD_99999";
    const incompatibleReport = {
      ...report("Old Beta"),
      schemaVersion: "2.0.0",
      secretData: sensitiveVersionToken,
    };
    await writeFile(path.join(dataDir, "incompatible-version.json"), JSON.stringify(incompatibleReport), "utf8");

    const sensitiveSchemaToken = "SECRET_SCHEMA_PAYLOAD_88888";
    const invalidSchemaReport = {
      ...report("Bad Schema Beta"),
      summary: "not-an-object",
      secretData: sensitiveSchemaToken,
    };
    await writeFile(path.join(dataDir, "invalid-schema.json"), JSON.stringify(invalidSchemaReport), "utf8");

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 1);
    assert.equal(body[0].id, "valid-2");
    assert.equal(body[0].title, "Valid Beta");

    assert.equal(warnings.length, 2);
    assert.ok(warnings.some((w) => w.includes("incompatible-version.json")));
    assert.ok(warnings.some((w) => w.includes("invalid-schema.json")));
    assert.ok(!warnings.some((w) => w.includes(sensitiveVersionToken)));
    assert.ok(!warnings.some((w) => w.includes(sensitiveSchemaToken)));
    assert.ok(!warnings.some((w) => w.includes("Old Beta")));
    assert.ok(!warnings.some((w) => w.includes("Bad Schema Beta")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("returns HTTP 200 with empty array when all report files are invalid", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const warnings = [];
  const server = createDashboardServer({ dataDir, warn: (msg) => warnings.push(msg) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;

  try {
    await writeFile(path.join(dataDir, "corrupt-1.json"), "{ broken json", "utf8");
    await writeFile(path.join(dataDir, "corrupt-2.json"), JSON.stringify({ schemaVersion: "0.1.0" }), "utf8");

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, []);
    assert.equal(warnings.length, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("sorts reports deterministically by newest generatedAt then id tie-breaker", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const warnings = [];
  const server = createDashboardServer({ dataDir, warn: (msg) => warnings.push(msg) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;

  try {
    const reportOlder = { ...report("Older"), generatedAt: "2026-07-18T10:00:00.000Z" };
    const reportTiedA = { ...report("Tied A"), generatedAt: "2026-07-19T12:00:00.000Z" };
    const reportTiedB = { ...report("Tied B"), generatedAt: "2026-07-19T12:00:00.000Z" };
    const reportNewest = { ...report("Newest"), generatedAt: "2026-07-20T15:00:00.000Z" };

    await writeFile(path.join(dataDir, "report-old.json"), JSON.stringify(reportOlder), "utf8");
    await writeFile(path.join(dataDir, "report-tied-a.json"), JSON.stringify(reportTiedA), "utf8");
    await writeFile(path.join(dataDir, "report-tied-b.json"), JSON.stringify(reportTiedB), "utf8");
    await writeFile(path.join(dataDir, "report-new.json"), JSON.stringify(reportNewest), "utf8");
    await writeFile(path.join(dataDir, "report-broken.json"), "invalid json", "utf8");

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.length, 4);

    assert.equal(body[0].id, "report-new");
    assert.equal(body[1].id, "report-tied-b");
    assert.equal(body[2].id, "report-tied-a");
    assert.equal(body[3].id, "report-old");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("emits safe diagnostic to console.warn by default when options.warn is omitted", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "tcalc-dashboard-"));
  const intercepted = [];
  const originalWarn = console.warn;
  console.warn = (msg) => { intercepted.push(String(msg)); };

  const server = createDashboardServer({ dataDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;

  try {
    const secretContent = "DO_NOT_LOG_THIS_RAW_CONTENT_777";
    await writeFile(path.join(dataDir, "corrupted.json"), `{ "raw": "${secretContent}", `, "utf8");

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, []);

    assert.equal(intercepted.length, 1);
    assert.ok(intercepted[0].includes("corrupted.json"));
    assert.ok(!intercepted[0].includes(secretContent));
  } finally {
    console.warn = originalWarn;
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("returns empty list with HTTP 200 when dataDir does not exist", async () => {
  const nonExistentDir = path.join(tmpdir(), `tcalc-nonexistent-${Date.now()}`);
  const server = createDashboardServer({ dataDir: nonExistentDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/reports`;
  try {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function report(title = "Report") {
  return {
    schemaVersion: "1.0.0", title, generatedAt: "2026-07-19", workspacePath: "/workspace", goal: "debug",
    summary: { totalFiles: 1, includedFiles: 1, excludedFiles: 0, totalEstimatedTokens: 10, includedTokens: 10 },
    topTokenConsumers: [], topFolders: [], languages: [], recommendations: null,
    warnings: [], assumptions: [], optimizationChecklist: [],
  };
}

function postChunks(port, ...chunks) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: "/api/reports", method: "POST", headers: { authorization: "Bearer secret", "content-type": "application/json" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}
