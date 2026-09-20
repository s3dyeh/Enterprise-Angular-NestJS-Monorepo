import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { cpus, platform, arch, totalmem } from "node:os";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const credentials = JSON.parse(
  await readFile(resolve(root, ".verification/browser-session.json"), "utf8"),
);
const web = process.env.E2E_BASE_URL || "http://localhost:4291";
const require = createRequire(resolve(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");
const output = resolve(root, "docs/evidence");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(web + "/login");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(credentials.email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await page.waitForLoadState("networkidle");
  await page.locator("mat-snack-bar-container").waitFor({ state: "hidden" });
  await page.screenshot({
    path: resolve(output, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page.goto(web + "/accounting/account-credits");
  await page.locator("app-section-tabs nav").waitFor();
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: resolve(output, "account-credits.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(web + "/dashboard");
  await page.waitForLoadState("networkidle");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile layout must not overflow",
  );
  await page.screenshot({
    path: resolve(output, "dashboard-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

// A small, explicitly bounded local smoke workload. It is not a capacity test.
const login = await fetch(credentials.base + "/api/v1/auth/browser/login", {
  method: "POST",
  headers: { Origin: web, "Content-Type": "application/json" },
  body: JSON.stringify({
    email: credentials.email,
    password: credentials.password,
  }),
});
assert.equal(login.status, 200);
const { token } = await login.json();
const endpoint = "/api/v1/admin/account-credits?page=1&page_size=25";
const samples = [];
let errors = 0;
let records;
const call = async (record) => {
  const start = performance.now();
  try {
    const response = await fetch(credentials.base + endpoint, {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    records = payload.data.count;
  } catch {
    if (record) errors++;
  }
  if (record) samples.push(performance.now() - start);
};
for (let i = 0; i < 10; i++) await call(false);
const started = performance.now();
const durationMs = 10000;
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (performance.now() - started < durationMs) await call(true);
  }),
);
const elapsedMs = performance.now() - started;
samples.sort((a, b) => a - b);
const percentile = (p) =>
  Number(
    samples[
      Math.min(samples.length - 1, Math.ceil(samples.length * p) - 1)
    ].toFixed(2),
  );
const files = [
  "apps/api/src/accounting/account-credits.service.ts",
  "apps/api/src/admin/admin-query.ts",
  "apps/api/package-lock.json",
];
const fingerprints = Object.fromEntries(
  await Promise.all(
    files.map(async (file) => [
      file,
      createHash("sha256")
        .update(await readFile(resolve(root, file)))
        .digest("hex"),
    ]),
  ),
);
const evidence = {
  capturedAt: new Date().toISOString(),
  kind: "Local development smoke measurement; not production capacity or an SLA",
  runtime: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
    memoryGiB: Number((totalmem() / 2 ** 30).toFixed(1)),
  },
  dependencies:
    "Local Docker Compose PostgreSQL and Redis; API and client share host; telemetry enabled",
  source: { state: "Local working tree", sha256: fingerprints },
  workload: {
    endpoint,
    concurrency: 5,
    warmupRequests: 10,
    intendedDurationMs: durationMs,
    elapsedMs: Math.round(elapsedMs),
    records,
  },
  result: {
    requests: samples.length,
    errors,
    requestsPerSecond: Number(((samples.length * 1000) / elapsedMs).toFixed(2)),
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    },
  },
};
await writeFile(
  resolve(output, "local-smoke.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
assert.equal(errors, 0, "Smoke workload returned errors");
console.log(
  "Saved three verified screenshots and local smoke measurements to docs/evidence",
);
