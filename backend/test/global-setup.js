// Plain JS, not TS — Jest's globalSetup runs in its own process before the transform
// pipeline (ts-jest) is wired up, so requiring a .ts file here would need its own
// separate ts-node registration for no real benefit; this file has no app code to share.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.test") });

const { Client } = require("pg");
const { DataSource } = require("typeorm");
const bcrypt = require("bcrypt");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 5432;
const DB_USERNAME = process.env.DB_USERNAME || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "postgres";
const DB_DATABASE = process.env.DB_DATABASE || "dineflow_test";

/** Runs once before the whole e2e suite: create the isolated test DB (if missing), migrate it
 * fresh every run (so e2e tests never depend on whatever schema state a previous run left), and
 * seed the one thing migrations can't do — a bcrypt-hashed admin password. */
module.exports = async function globalSetup() {
  if (DB_DATABASE === "dineflow" || DB_DATABASE === process.env.DEV_DB_DATABASE) {
    throw new Error(
      `Refusing to run e2e tests against '${DB_DATABASE}' — this looks like the real dev database, not an isolated test one. Check backend/.env.test.`,
    );
  }

  // Step 1: ensure the test database exists, connecting to Postgres's own maintenance DB.
  const admin = new Client({ host: DB_HOST, port: DB_PORT, user: DB_USERNAME, password: DB_PASSWORD, database: "postgres" });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${DB_DATABASE}"`);
    console.log(`[e2e setup] created database "${DB_DATABASE}"`);
  } catch (err) {
    if (err.code !== "42P04") throw err; // 42P04 = duplicate_database, i.e. already exists — fine
  } finally {
    await admin.end();
  }

  // Step 2: run every migration against it fresh, every run — this is what makes the suite
  // deterministic instead of depending on whatever a previous local run left behind.
  const dataSource = new DataSource({
    type: "postgres",
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    entities: [path.join(__dirname, "../src/modules/**/entities/*.entity{.ts,.js}")],
    migrations: [path.join(__dirname, "../src/database/migrations/*{.ts,.js}")],
    synchronize: false,
  });
  await dataSource.initialize();

  // Idempotent across repeated local runs: drop and recreate the schema so migrations always
  // start from empty, rather than accumulating "already exists" errors on a second run.
  await dataSource.query(`DROP SCHEMA IF EXISTS public CASCADE`);
  await dataSource.query(`CREATE SCHEMA public`);
  await dataSource.runMigrations();
  console.log("[e2e setup] migrations applied");

  // Step 3: seed the admin user — same shape as src/database/seed-admin.ts, duplicated rather
  // than imported since that script is a standalone CLI entrypoint, not an exported function.
  const adminRole = await dataSource.query(`SELECT id FROM roles WHERE name = 'ADMIN'`);
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await dataSource.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, status, email_verified_at)
     VALUES ($1, $2, $3, $4, 'ACTIVE', now())`,
    ["admin@e2e.test", passwordHash, "E2E Test Admin", adminRole[0].id],
  );
  console.log("[e2e setup] admin user seeded");

  await dataSource.destroy();
};
