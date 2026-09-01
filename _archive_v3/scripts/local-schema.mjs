/**
 * Applies every migration to an in-process Postgres, then optionally runs a
 * file of SQL against it.
 *
 * Why this exists: this machine has no Docker, so `supabase test db` only ever
 * ran in CI. Seven CI cycles in one session were spent on fixture SQL written
 * from memory — a missing quote, a unique constraint, a wrong column name, a
 * check constraint. None of those needed pgTAP to catch. They needed the schema
 * and three seconds.
 *
 *   node scripts/local-schema.mjs                        # apply migrations only
 *   node scripts/local-schema.mjs a.sql b.sql             # then run these, in order
 *
 * Files run in the order given, against one database — `learning_model_v2_arbitrary.sql`
 * is not standalone, it builds on the rows the durable fixture inserts.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const MIGRATIONS = path.normalize("supabase/migrations");

/**
 * The parts of Supabase the migrations assume exist. Kept deliberately small:
 * this stands in for the platform, not for the product, and anything the
 * product owns must come from a migration or it is not being tested.
 */
const BOOTSTRAP = `
create schema if not exists auth;
create schema if not exists extensions;
create role anon;
create role authenticated;
create role service_role;
create role supabase_auth_admin;
create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated') $$;

-- pg_cron is not in PGlite. The schedule calls are platform wiring, not product
-- logic, so they are accepted and discarded — a migration that only schedules a
-- job has nothing for this harness to check anyway.
create schema if not exists cron;
create or replace function cron.schedule(text, text, text) returns bigint
  language sql as $$ select 0::bigint $$;
create or replace function cron.unschedule(text) returns boolean
  language sql as $$ select true $$;
`;

const db = await PGlite.create({ extensions: { pgcrypto, uuid_ossp } });
await db.exec(BOOTSTRAP);

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
let applied = 0;
for (const file of files) {
  // Extensions the platform provides and PGlite does not ship. Dropping the
  // `create extension` line is safe because the harness defines shims for what
  // the migrations call; leaving it in would stop the run at platform wiring
  // rather than at anything the product owns.
  const sql = readFileSync(path.join(MIGRATIONS, file), "utf8").replace(
    /^\s*create extension if not exists (pg_cron|pgtap)\b[^;]*;/gim,
    "",
  );
  try {
    await db.exec(sql);
    applied += 1;
  } catch (error) {
    console.error(`\n✘ ${file}\n  ${String(error.message).split("\n")[0]}`);
    process.exit(1);
  }
}
console.log(`✓ ${applied} migration applied`);

for (const target of process.argv.slice(2)) {
  try {
    await db.exec(readFileSync(path.normalize(target), "utf8"));
    console.log(`✓ ${path.basename(target)} ran clean`);
  } catch (error) {
    console.error(`\n✘ ${path.basename(target)}\n  ${String(error.message).split("\n")[0]}`);
    process.exit(1);
  }
}
