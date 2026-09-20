import { checkConsistency } from "./consistency-checks.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, createWriteStream } from "node:fs";
import { mkdir as mkdirAsync } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:http";
const root = resolve(import.meta.dirname, "..");
const api = resolve(root, "apps/api");
const require = createRequire(resolve(api, "package.json"));
const { Client } = require("pg");
const port = process.env.INTEGRATION_API_PORT || "4301";
const origin = process.env.INTEGRATION_ORIGIN || "http://localhost:4291";
const dbName = "integration_" + randomBytes(6).toString("hex");
const env = {
  ...process.env,
  NODE_ENV: "test",
  APP_PORT: port,
  API_PREFIX: "api",
  FRONTEND_DOMAIN: origin,
  BACKEND_DOMAIN: "http://localhost:" + port,
  APP_CORS_ORIGINS: origin,
  DATABASE_URL: "",
  DATABASE_HOST: process.env.TEST_DATABASE_HOST || "127.0.0.1",
  DATABASE_PORT: process.env.TEST_DATABASE_PORT || "55432",
  DATABASE_USERNAME: "enterprise",
  DATABASE_PASSWORD: "local-development-only",
  DATABASE_NAME: dbName,
  DATABASE_SYNCHRONIZE: "false",
  DATABASE_SSL_ENABLED: "false",
  DATABASE_MAX_CONNECTIONS: "10",
  FILE_DRIVER: "local",
  MAIL_HOST: "127.0.0.1",
  MAIL_PORT: process.env.TEST_MAIL_PORT || "51025",
  MAIL_IGNORE_TLS: "true",
  MAIL_SECURE: "false",
  MAIL_REQUIRE_TLS: "false",
  MAIL_DEFAULT_EMAIL: "noreply@example.com",
  MAIL_DEFAULT_NAME: "Enterprise",
  AUTH_JWT_TOKEN_EXPIRES_IN: "15m",
  AUTH_REFRESH_TOKEN_EXPIRES_IN: "30d",
  AUTH_FORGOT_TOKEN_EXPIRES_IN: "30m",
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: "1d",
  AUTH_UNIFORM_ERRORS: "true",
  RECAPTCHA_ENABLED: "false",
  REDIS_MODE: process.env.TEST_REDIS_MODE || "standalone",
  REDIS_URL:
    process.env.TEST_REDIS_URL ||
    "redis://:local-development-only@127.0.0.1:16379",
  REDIS_KEY_PREFIX: dbName,
  AUTH_RATE_LIMIT: "100",
  METRICS_TOKEN: randomBytes(32).toString("hex"),
  OTEL_ENABLED: process.env.TEST_OTEL_ENABLED || "false",
  SEED_ADMIN_EMAIL: "admin@example.com",
  SEED_ADMIN_PASSWORD: randomBytes(20).toString("hex"),
};
for (const key of ["JWT", "REFRESH", "FORGOT", "CONFIRM_EMAIL"])
  env["AUTH_" + key + "_SECRET"] = randomBytes(32).toString("hex");
const admin = new Client({
  host: env.DATABASE_HOST,
  port: +env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: "enterprise",
});
await mkdirAsync(resolve(root, ".verification"), { recursive: true });
const log = createWriteStream(
  resolve(root, ".verification/integration-api.log"),
);
let traceBatches = 0;
const collector = createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    traceBatches++;
    response.writeHead(200, { "Content-Type": "application/x-protobuf" });
    response.end();
  });
});
collector.listen(0, "127.0.0.1");
await once(collector, "listening");
env.OTEL_ENABLED = "true";
env.OTEL_EXPORTER_OTLP_ENDPOINT =
  "http://127.0.0.1:" + collector.address().port;
env.OTEL_BSP_SCHEDULE_DELAY = "1000";
env.OTEL_TRACES_SAMPLER = "always_on";
let server;
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => server?.kill(signal));
let cookie = "";
let token = "";
const base = "http://127.0.0.1:" + port;
async function run(args) {
  const process = spawn(globalThis.process.execPath, args, {
    cwd: api,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.pipe(log, { end: false });
  process.stderr.pipe(log, { end: false });
  const [code] = await once(process, "exit");
  assert.equal(
    code,
    0,
    args.join(" ") + " failed; see .verification/integration-api.log",
  );
}
async function request(path, method = "GET", body, status = 200, options = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const raw = await response.text();
  assert.equal(response.status, status, method + " " + path + ": " + raw);
  const set = response.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { response, data: raw ? JSON.parse(raw) : undefined };
}
async function login(
  email = env.SEED_ADMIN_EMAIL,
  password = env.SEED_ADMIN_PASSWORD,
) {
  const result = await request("/api/v1/auth/browser/login", "POST", {
    email,
    password,
  });
  assert.ok(result.response.headers.get("set-cookie").includes("HttpOnly"));
  assert.ok(!("refreshToken" in result.data));
  assert.ok(!("password" in result.data.user));
  token = result.data.token;
  return result;
}
async function consumeConcurrently(path, body) {
  const statuses = await Promise.all(
    [1, 2].map(async () => {
      const response = await fetch(base + path, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await response.text();
      return response.status;
    }),
  );
  assert.deepEqual(
    statuses.sort(),
    [204, 422],
    "Only one concurrent request may consume an account link",
  );
}
async function mailHash(address, route) {
  const mail = "http://127.0.0.1:" + (process.env.TEST_MAIL_UI_PORT || "51080");
  for (let attempt = 0; attempt < 20; attempt++) {
    const messages = await (await fetch(mail + "/email")).json();
    for (const message of messages
      .filter((message) =>
        message.to?.some((recipient) => recipient.address === address),
      )
      .reverse()) {
      const content = await (await fetch(mail + "/email/" + message.id)).json();
      const match = content.html?.match(
        new RegExp(route + '\\?hash=([^"&<]+)'),
      );
      if (match) return decodeURIComponent(match[1]);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Confirmation/reset mail was not received");
}
try {
  await admin.connect();
  await admin.query('CREATE DATABASE "' + dbName + '"');
  await run(["dist/database/run-migrations.js"]);
  await run(["dist/database/seeds/run-seed.js"]);
  await checkConsistency({ require, api, env });
  await run(["dist/database/seeds/run-seed.js"]);
  server = spawn(process.execPath, ["dist/main.js"], {
    cwd: api,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.pipe(log, { end: false });
  server.stderr.pipe(log, { end: false });
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null)
      throw new Error("API exited; see integration-api.log");
    try {
      ready = (await fetch(base + "/health/ready")).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "API readiness timeout");
  await request("/health/live");
  const schema = (await request("/docs-json")).data;
  for (const name of [
    "AccountResponseDto",
    "AccountCreditResponseDto",
    "SettingResponseDto",
    "DashboardResponseDto",
  ]) {
    assert.ok(
      schema.components.schemas[name]?.properties,
      "Missing OpenAPI response schema: " + name,
    );
  }
  assert.equal(
    (await request("/api/v1/auth/browser/config")).data.recaptcha.enabled,
    false,
  );
  await request("/api/v1/admin/users", "GET", undefined, 401);
  await request(
    "/api/v1/auth/browser/login",
    "POST",
    { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
    403,
    { headers: { Origin: "https://untrusted.example" } },
  );
  await login();
  const oldCookie = cookie;
  token = (await request("/api/v1/auth/browser/refresh", "POST", {})).data
    .token;
  assert.notEqual(cookie, oldCookie);
  await request("/api/v1/auth/browser/refresh", "POST", {}, 401, {
    headers: { Cookie: oldCookie },
  });
  const profile = (await request("/api/v1/auth/me")).data;
  assert.equal(profile.email, env.SEED_ADMIN_EMAIL);
  const region = (
    await request(
      "/api/v1/admin/regions",
      "POST",
      { name: "Integration region" },
      201,
    )
  ).data.data;
  const city = (
    await request(
      "/api/v1/admin/cities",
      "POST",
      { name: "Integration city", region_id: region.id },
      201,
    )
  ).data.data;
  assert.equal(
    (await request("/api/v1/admin/cities?search=Integration")).data.data.count,
    1,
  );
  await request("/api/v1/admin/regions/" + region.id, "DELETE", undefined, 409);
  await request("/api/v1/admin/cities?page_size=100000", "GET", undefined, 422);
  await request("/api/v1/admin/cities?order_by=password");
  const role = (
    await request(
      "/api/v1/admin/roles",
      "POST",
      { name: "Regional reader", resources: "city:read" },
      201,
    )
  ).data.data;
  const password = "Integration-password-123!";
  const user = (
    await request(
      "/api/v1/admin/users",
      "POST",
      {
        full_name: "Regional Reader",
        username: "reader",
        email: "reader@example.com",
        password,
        role_id: role.id,
        status: "active",
      },
      201,
    )
  ).data.data;
  const customer = (
    await request(
      "/api/v1/admin/customers",
      "POST",
      {
        full_name: "Test Customer",
        username: "customer",
        email: "customer@example.com",
        password,
        status: "active",
      },
      201,
    )
  ).data.data;
  const accountFields = [
    "id",
    "full_name",
    "username",
    "email",
    "phone",
    "type",
    "role_id",
    "status",
  ].sort();
  assert.deepEqual(Object.keys(user).sort(), accountFields);
  assert.deepEqual(Object.keys(customer).sort(), accountFields);
  assert.equal(customer.role_id, 2);
  await request(
    "/api/v1/admin/users/" + profile.id,
    "PUT",
    { status: "in_active" },
    400,
  );
  await request(
    "/api/v1/admin/users/" + profile.id,
    "PUT",
    { role_id: 2 },
    400,
  );
  await request("/api/v1/admin/users/" + profile.id, "DELETE", undefined, 400);
  await request("/api/v1/admin/users/" + profile.id, "PUT", { role_id: 1 });
  await request(
    "/api/v1/admin/users/" + user.id,
    "PUT",
    { full_name: "   " },
    400,
  );
  await request(
    "/api/v1/admin/users/" + user.id,
    "PUT",
    { password: "é".repeat(40) },
    400,
  );
  await request("/api/v1/admin/users/" + user.id, "PUT", {}, 400);
  await request(
    "/api/v1/admin/customers/" + user.id,
    "PUT",
    { full_name: "Wrong type" },
    404,
  );
  await request("/api/v1/admin/customers/" + user.id, "DELETE", undefined, 404);
  await request(
    "/api/v1/admin/users/" + user.id,
    "PUT",
    { role_id: 2147483647 },
    409,
  );
  const foundUsers = (
    await request(
      "/api/v1/admin/users?search=Regional%20Reader&order_by=full_name&direction=asc",
    )
  ).data.data;
  assert.equal(foundUsers.count, 1);
  assert.deepEqual(Object.keys(foundUsers.list[0]).sort(), accountFields);
  assert.equal(
    (await request("/api/v1/admin/users?search=%25")).data.data.count,
    0,
  );
  assert.equal(
    (await request("/api/v1/admin/users?search=Test%20Customer")).data.data
      .count,
    0,
  );
  await request("/api/v1/admin/users?order_by=__proto__");
  const disposable = (
    await request(
      "/api/v1/admin/customers",
      "POST",
      {
        full_name: "Temporary Customer",
        username: "temporary",
        email: "TEMPORARY@example.com",
        password,
        status: "active",
        role_id: 1,
      },
      201,
    )
  ).data.data;
  assert.equal(disposable.email, "temporary@example.com");
  assert.equal(disposable.role_id, 2);
  await login(disposable.email, password);
  const disposableToken = token;
  await login();
  await request(
    "/api/v1/admin/customers/" + disposable.id,
    "DELETE",
    undefined,
    204,
  );
  await request("/api/v1/auth/me", "GET", undefined, 401, {
    headers: { Authorization: "Bearer " + disposableToken },
  });
  assert.equal(
    (await request("/api/v1/admin/customers?search=temporary")).data.data.count,
    0,
  );
  await request(
    "/api/v1/admin/customers/" + disposable.id,
    "DELETE",
    undefined,
    404,
  );
  const secondAdmin = (
    await request(
      "/api/v1/admin/users",
      "POST",
      {
        full_name: "Second Administrator",
        username: "second_admin",
        email: "second-admin@example.com",
        password,
        status: "active",
        role_id: 1,
      },
      201,
    )
  ).data.data;
  await request(
    "/api/v1/admin/users/" + secondAdmin.id,
    "DELETE",
    undefined,
    400,
  );
  const firstAdminToken = token;
  await login(secondAdmin.email, password);
  const secondAdminToken = token;
  const disableAs = (actorToken, targetId) =>
    fetch(base + "/api/v1/admin/users/" + targetId, {
      method: "PUT",
      headers: {
        Origin: origin,
        Authorization: "Bearer " + actorToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "in_active" }),
      signal: AbortSignal.timeout(10000),
    }).then(async (response) => ({
      status: response.status,
      body: await response.text(),
    }));
  const adminRace = await Promise.all([
    disableAs(firstAdminToken, secondAdmin.id),
    disableAs(secondAdminToken, profile.id),
  ]);
  assert.equal(
    adminRace.filter((response) => response.status === 200).length,
    1,
    JSON.stringify(adminRace),
  );
  assert.ok(
    adminRace.some((response) => [400, 401].includes(response.status)),
    JSON.stringify(adminRace),
  );
  if (adminRace[1].status === 200) {
    await login(secondAdmin.email, password);
    await request("/api/v1/admin/users/" + profile.id, "PUT", {
      status: "active",
    });
  }
  await login();
  await request("/api/v1/admin/users/" + secondAdmin.id, "PUT", { role_id: 2 });
  await request(
    "/api/v1/admin/users/" + secondAdmin.id,
    "DELETE",
    undefined,
    204,
  );
  const currency = (
    await request(
      "/api/v1/admin/currencies",
      "POST",
      { name: "Test Dinar", symbol: "TST" },
      201,
    )
  ).data.data;
  const adjustment = {
    account_id: customer.id,
    currency_id: currency.id,
    amount: "10.1250",
    reason: "Integration credit",
    idempotency_key: randomUUID(),
  };
  const responses = await Promise.all([
    request(
      "/api/v1/admin/account-credits/adjustments",
      "POST",
      adjustment,
      201,
    ),
    request(
      "/api/v1/admin/account-credits/adjustments",
      "POST",
      {
        ...adjustment,
        idempotency_key: adjustment.idempotency_key.toUpperCase(),
      },
      201,
    ),
  ]);
  assert.equal(
    responses.filter((result) => result.data.data.replayed).length,
    1,
  );
  assert.equal(responses[0].data.data.balance, "10.1250");
  await request(
    "/api/v1/admin/account-credits/adjustments",
    "POST",
    { ...adjustment, amount: "20" },
    409,
  );
  assert.equal(
    (await request("/api/v1/admin/account-credits")).data.data.count,
    1,
  );
  const creditsPath = "/api/v1/admin/account-credits/adjustments";
  const replay = await request(
    creditsPath,
    "POST",
    { ...adjustment, amount: "010.125" },
    201,
  );
  assert.equal(replay.data.data.replayed, true);
  for (const changed of [
    { reason: "Different reason" },
    { account_id: user.id },
  ]) {
    await request(creditsPath, "POST", { ...adjustment, ...changed }, 409);
  }
  await request(
    creditsPath,
    "POST",
    { ...adjustment, amount: "-0.0000", idempotency_key: randomUUID() },
    400,
  );
  await Promise.all(
    Array.from({ length: 4 }, () =>
      request(
        creditsPath,
        "POST",
        {
          ...adjustment,
          amount: "0.0001",
          idempotency_key: randomUUID(),
        },
        201,
      ),
    ),
  );
  const debit = await request(
    creditsPath,
    "POST",
    { ...adjustment, amount: "-0.1254", idempotency_key: randomUUID() },
    201,
  );
  assert.equal(debit.data.data.balance, "10.0000");
  const large = await request(
    creditsPath,
    "POST",
    {
      ...adjustment,
      amount: "999999999999999.9999",
      idempotency_key: randomUUID(),
    },
    201,
  );
  assert.equal(large.data.data.balance, "1000000000000009.9999");
  const listedCredits = (
    await request("/api/v1/admin/account-credits?search=dinar")
  ).data.data;
  assert.equal(listedCredits.count, 1);
  assert.equal(listedCredits.list[0].currency, currency.name);
  assert.equal(listedCredits.list[0].balance, large.data.data.balance);
  assert.equal(
    (await request("/api/v1/admin/account-credits?search=%25")).data.data.count,
    0,
  );
  assert.equal(
    (await request("/api/v1/admin/account-credits?page=2&page_size=1")).data
      .data.list.length,
    0,
  );
  assert.equal(
    (await request("/api/v1/admin/account-credits")).data.data.count,
    1,
  );
  const settings = (await request("/api/v1/admin/settings")).data.data.list;
  await request("/api/v1/admin/settings/" + settings[0].id, "PUT", {
    ...settings[0],
    value: "Integration",
  });
  await request("/api/v1/admin/clear-cache/dashboard", "PUT", {});
  assert.ok((await request("/api/v1/admin/dashboard")).data.data.accounts >= 3);
  assert.ok((await request("/api/v1/admin/activities")).data.data.count >= 6);
  await request("/api/v1/admin/login-blocks");
  const fixtures = new Client({
    host: env.DATABASE_HOST,
    port: +env.DATABASE_PORT,
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: dbName,
  });
  await fixtures.connect();
  try {
    await fixtures.query(
      `INSERT INTO login_blocks(key,attempts,locked_until) VALUES
      ($1,5,now()+interval '2 minutes'),($2,6,now()+interval '2 minutes'),($3,7,now()-interval '1 minute')`,
      ["a".repeat(64), "b".repeat(64), "c".repeat(64)],
    );
    const blocked = (await request("/api/v1/admin/login-blocks?page_size=1"))
      .data.data;
    assert.equal(blocked.count, 2);
    assert.equal(blocked.list[0].key, "a".repeat(64));
    assert.equal(blocked.list[0].locked, true);
    assert.equal(blocked.list[0].stage, 1);
    assert.ok(
      blocked.list[0].retry_after_sec > 0 &&
        blocked.list[0].retry_after_sec <= 120,
    );
    const nextBlock = (
      await request("/api/v1/admin/login-blocks?page_size=1&page=2")
    ).data.data;
    assert.equal(nextBlock.count, 2);
    assert.equal(nextBlock.list[0].key, "b".repeat(64));
    for (const key of ["a".repeat(64), "b".repeat(64)]) {
      await request(
        "/api/v1/admin/login-blocks/unblock",
        "POST",
        { ip: key },
        201,
      );
    }
    assert.equal(
      (await request("/api/v1/admin/login-blocks")).data.data.count,
      0,
    );
    const unblockActivities = (
      await request(
        "/api/v1/admin/activities?search=login.unblocked&page_size=1",
      )
    ).data.data;
    assert.equal(unblockActivities.count, 2);
    assert.equal(unblockActivities.list.length, 1);
    assert.ok(unblockActivities.list[0].username);
    assert.equal(
      (await request("/api/v1/admin/activities?search=%25")).data.data.count,
      0,
    );
    assert.equal(
      (await request("/api/v1/admin/regions?search=%25")).data.data.count,
      0,
    );
    await request("/api/v1/admin/roles?order_by=__proto__");
  } finally {
    await fixtures.end();
  }
  // Exercise the throttling guard's upsert against PostgreSQL without exhausting
  // the shared rate limit needed by the remaining authentication checks.
  const { DataSource } = require("typeorm");
  const { LoginBlockEntity } = require(
    resolve(api, "dist/platform/persistence/login-block.entity.js"),
  );
  const { AuthProtectionGuard } = require(
    resolve(api, "dist/platform/auth-protection.guard.js"),
  );
  const blockSource = new DataSource({
    type: "postgres",
    host: env.DATABASE_HOST,
    port: +env.DATABASE_PORT,
    username: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database: dbName,
    entities: [LoginBlockEntity],
  });
  await blockSource.initialize();
  try {
    const headers = new Map();
    const guard = new AuthProtectionGuard(
      {
        config: { rateWindowSeconds: 60, rateLimit: 1 },
        consume: () => Promise.resolve({ count: 2, retryAfter: 60 }),
      },
      {},
      {},
      blockSource,
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: "203.0.113.99" }),
        getResponse: () => ({
          setHeader: (name, value) => headers.set(name, value),
        }),
      }),
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      await assert.rejects(
        guard.canActivate(context),
        (error) => error.getStatus() === 429,
      );
    }
    assert.equal(headers.get("Retry-After"), 60);
    const blockKey = require("node:crypto")
      .createHash("sha256")
      .update("203.0.113.99")
      .digest("hex");
    const storedBlock = await blockSource
      .getRepository(LoginBlockEntity)
      .findOneByOrFail({ key: blockKey });
    assert.equal(storedBlock.attempts, 2);
    assert.ok(storedBlock.locked_until.getTime() > Date.now());
    await request(
      "/api/v1/admin/login-blocks/unblock",
      "POST",
      { ip: blockKey },
      201,
    );
  } finally {
    await blockSource.destroy();
  }
  await login("reader@example.com", password);
  await request("/api/v1/admin/cities");
  await request(
    "/api/v1/admin/cities",
    "POST",
    { name: "Forbidden", region_id: region.id },
    403,
  );
  await request("/api/v1/admin/users", "GET", undefined, 403);
  const readerToken = token;
  await login();
  await request("/api/v1/admin/users/" + user.id, "PUT", {
    status: "in_active",
  });
  await request("/api/v1/admin/cities", "GET", undefined, 401, {
    headers: { Authorization: "Bearer " + readerToken },
  });
  await request("/api/v1/admin/cities/" + city.id, "DELETE", undefined, 204);
  await request("/api/v1/admin/regions/" + region.id, "DELETE", undefined, 204);
  const metrics = await fetch(base + "/metrics", {
    headers: { Authorization: "Bearer " + env.METRICS_TOKEN },
  });
  assert.equal(metrics.status, 200);
  assert.match(await metrics.text(), /http_request_duration_seconds_count/);
  assert.equal((await fetch(base + "/metrics")).status, 404);
  await request("/api/v1/auth/browser/logout", "POST", {}, 204);
  await request("/api/v1/auth/me", "GET", undefined, 401);
  const email = dbName + "@example.com";
  await request(
    "/api/v1/auth/email/register",
    "POST",
    { email, password, firstName: "New", lastName: "Account" },
    204,
  );
  await request("/api/v1/auth/browser/login", "POST", { email, password }, 422);
  await request("/api/v1/auth/email/resend", "POST", { email }, 204);
  const confirmation = await mailHash(email, "confirm-email");
  await consumeConcurrently("/api/v1/auth/email/confirm", {
    hash: confirmation,
  });
  await request(
    "/api/v1/auth/email/confirm",
    "POST",
    { hash: confirmation },
    422,
  );
  await login(email, password);
  const beforeReset = token;
  await request("/api/v1/auth/forgot/password", "POST", { email }, 204);
  const reset = await mailHash(email, "password-change");
  const newPassword = "Changed-password-123!";
  await consumeConcurrently("/api/v1/auth/reset/password", {
    hash: reset,
    password: newPassword,
  });
  await request(
    "/api/v1/auth/reset/password",
    "POST",
    { hash: reset, password: newPassword },
    422,
  );
  await request("/api/v1/auth/me", "GET", undefined, 401, {
    headers: { Authorization: "Bearer " + beforeReset },
  });
  await login(email, newPassword);
  const changedEmail = "changed-" + email;
  await request("/api/v1/auth/me", "PATCH", {
    firstName: "Updated",
    email: changedEmail,
  });
  const emailChange = await mailHash(changedEmail, "confirm-new-email");
  await consumeConcurrently("/api/v1/auth/email/confirm/new", {
    hash: emailChange,
  });
  await request("/api/v1/auth/me", "GET", undefined, 401);
  const registered = (await login(changedEmail, newPassword)).data.user;
  await login();
  await request("/api/v1/admin/users/" + registered.id, "PUT", {
    status: "in_active",
  });
  await request(
    "/api/v1/auth/email/resend",
    "POST",
    { email: changedEmail },
    204,
  );
  await request(
    "/api/v1/auth/email/confirm",
    "POST",
    { hash: confirmation },
    422,
  );
  await request(
    "/api/v1/auth/browser/login",
    "POST",
    { email: changedEmail, password: newPassword },
    422,
  );
  for (let attempt = 0; traceBatches === 0 && attempt < 10; attempt++)
    await new Promise((resolve) => setTimeout(resolve, 500));
  assert.ok(traceBatches > 0, "OpenTelemetry did not export traces");
  console.log(
    "PASS: migrations, sessions, CSRF, permissions, revocation, business CRUD, credit concurrency/idempotency, Redis, registration/email confirmation/password reset, readiness, metrics and OTLP trace export",
  );
  if (process.env.INTEGRATION_KEEP === "true") {
    console.log(
      "Browser test API: " +
        base +
        "; credentials saved in ignored .verification/browser-session.json",
    );
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      resolve(root, ".verification/browser-session.json"),
      JSON.stringify({
        base,
        email: env.SEED_ADMIN_EMAIL,
        password: env.SEED_ADMIN_PASSWORD,
      }),
    );
    await once(server, "exit");
  }
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  // Only the random database created by this run is eligible for deletion.
  if (/^integration_[a-f0-9]{12}$/.test(dbName))
    await admin
      .query('DROP DATABASE IF EXISTS "' + dbName + '" WITH (FORCE)')
      .catch(() => {});
  await admin.end();
  log.end();
  collector.close();
}
