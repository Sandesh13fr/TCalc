import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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

test("serves legitimate static files and preserves existing missing-file behavior", async () => {
  const publicDir = await mkdtemp(path.join(tmpdir(), "tcalc-public-"));
  await mkdir(path.join(publicDir, "assets"), { recursive: true });
  await writeFile(path.join(publicDir, "index.html"), "<h1>Home</h1>", "utf8");
  await writeFile(path.join(publicDir, "pricing.html"), "<h1>Pricing</h1>", "utf8");
  await writeFile(path.join(publicDir, "assets", "style.css"), "body { color: red; }", "utf8");

  const server = createDashboardServer({ publicDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const rootRes = await fetch(`${base}/`);
    assert.equal(rootRes.status, 200);
    assert.equal(await rootRes.text(), "<h1>Home</h1>");
    assert.match(rootRes.headers.get("content-type") ?? "", /text\/html/);

    const indexRes = await fetch(`${base}/index.html`);
    assert.equal(indexRes.status, 200);
    assert.equal(await indexRes.text(), "<h1>Home</h1>");

    const cssRes = await fetch(`${base}/assets/style.css`);
    assert.equal(cssRes.status, 200);
    assert.equal(await cssRes.text(), "body { color: red; }");
    assert.match(cssRes.headers.get("content-type") ?? "", /text\/css/);

    const pricingRes = await fetch(`${base}/pricing`);
    assert.equal(pricingRes.status, 200);
    assert.equal(await pricingRes.text(), "<h1>Pricing</h1>");

    const missingRes = await fetch(`${base}/missing.txt`);
    assert.equal(missingRes.status, 404);
    assert.deepEqual(await missingRes.json(), { error: "Not found" });

    const traversalRes = await fetch(`${base}/%2e%2e/secret.txt`);
    assert.equal(traversalRes.status, 404);
    assert.deepEqual(await traversalRes.json(), { error: "Not found" });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(publicDir, { recursive: true, force: true });
  }
});

test("rejects directory symlinks escaping publicDir including prefix collisions", async () => {
  const baseDir = await mkdtemp(path.join(tmpdir(), "tcalc-symlink-dir-"));
  const publicDir = path.join(baseDir, "public");
  const outsideDir = path.join(baseDir, "outside");
  const prefixSiblingDir = path.join(baseDir, "publicity");

  await mkdir(publicDir, { recursive: true });
  await mkdir(outsideDir, { recursive: true });
  await mkdir(prefixSiblingDir, { recursive: true });

  await writeFile(path.join(outsideDir, "secret.txt"), "OUTSIDE_DIR_SECRET", "utf8");
  await writeFile(path.join(outsideDir, "index.html"), "<h1>Outside Directory</h1>", "utf8");
  await writeFile(path.join(prefixSiblingDir, "sibling.txt"), "PREFIX_SIBLING_SECRET", "utf8");

  const linkType = process.platform === "win32" ? "junction" : "dir";
  await symlink(outsideDir, path.join(publicDir, "ext"), linkType);
  await symlink(prefixSiblingDir, path.join(publicDir, "prefix-link"), linkType);

  // Legitimate internal symlink
  await mkdir(path.join(publicDir, "internal"), { recursive: true });
  await writeFile(path.join(publicDir, "internal", "data.txt"), "INTERNAL_SAFE_DATA", "utf8");
  await symlink(path.join(publicDir, "internal"), path.join(publicDir, "internal-link"), linkType);

  const server = createDashboardServer({ publicDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // Escaping directory symlink with target file
    const escapedFileRes = await fetch(`${base}/ext/secret.txt`);
    assert.equal(escapedFileRes.status, 404);
    const escapedFileText = await escapedFileRes.text();
    assert.equal(escapedFileText.includes("OUTSIDE_DIR_SECRET"), false);

    // Escaping directory symlink with trailing slash resolving index.html
    const escapedDirSlashRes = await fetch(`${base}/ext/`);
    assert.equal(escapedDirSlashRes.status, 404);
    const escapedDirSlashText = await escapedDirSlashRes.text();
    assert.equal(escapedDirSlashText.includes("Outside Directory"), false);

    // Escaping directory symlink without trailing slash
    const escapedDirRes = await fetch(`${base}/ext`);
    assert.equal(escapedDirRes.status, 404);
    const escapedDirText = await escapedDirRes.text();
    assert.equal(escapedDirText.includes("Outside Directory"), false);

    // Prefix collision escape (public vs publicity)
    const prefixRes = await fetch(`${base}/prefix-link/sibling.txt`);
    assert.equal(prefixRes.status, 404);
    const prefixText = await prefixRes.text();
    assert.equal(prefixText.includes("PREFIX_SIBLING_SECRET"), false);

    // Legitimate directory symlink inside publicDir remains accessible
    const internalRes = await fetch(`${base}/internal-link/data.txt`);
    assert.equal(internalRes.status, 200);
    assert.equal(await internalRes.text(), "INTERNAL_SAFE_DATA");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("rejects file symlinks escaping publicDir", async () => {
  const baseDir = await mkdtemp(path.join(tmpdir(), "tcalc-symlink-file-"));
  const publicDir = path.join(baseDir, "public");
  const outsideDir = path.join(baseDir, "outside");

  await mkdir(publicDir, { recursive: true });
  await mkdir(outsideDir, { recursive: true });

  const outsideSecret = path.join(outsideDir, "secret.txt");
  const insideSafe = path.join(publicDir, "safe.txt");
  await writeFile(outsideSecret, "OUTSIDE_FILE_SECRET", "utf8");
  await writeFile(insideSafe, "SAFE_FILE_DATA", "utf8");

  let canCreateFileSymlinks = true;
  try {
    await symlink(outsideSecret, path.join(publicDir, "escaped.txt"), "file");
  } catch (error) {
    if (process.platform === "win32" && (error.code === "EPERM" || error.code === "EEXIST")) {
      canCreateFileSymlinks = false;
    } else {
      throw error;
    }
  }

  const server = createDashboardServer({ publicDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const safeRes = await fetch(`${base}/safe.txt`);
    assert.equal(safeRes.status, 200);
    assert.equal(await safeRes.text(), "SAFE_FILE_DATA");

    if (canCreateFileSymlinks) {
      const escapedRes = await fetch(`${base}/escaped.txt`);
      assert.equal(escapedRes.status, 404);
      const escapedText = await escapedRes.text();
      assert.equal(escapedText.includes("OUTSIDE_FILE_SECRET"), false);

      // Legitimate file symlink inside publicDir
      await symlink(insideSafe, path.join(publicDir, "safe-link.txt"), "file");
      const linkRes = await fetch(`${base}/safe-link.txt`);
      assert.equal(linkRes.status, 200);
      assert.equal(await linkRes.text(), "SAFE_FILE_DATA");
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("handles nonexistent publicDir without crashing", async () => {
  const server = createDashboardServer({ publicDir: path.join(tmpdir(), "nonexistent-" + Date.now()) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/index.html`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
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
