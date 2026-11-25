import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SQL against the LOCAL Supabase database container, as the postgres superuser, for test-only
 * setup and teardown (docs/specs/signed-in-home.md item 63). No migration adds a purge function and
 * no grant is widened: this only works on the local Docker stack. It refuses to run unless the
 * container exists and the Supabase URL the suite uses is 127.0.0.1 or localhost.
 */

function projectId(): string {
  // Playwright runs from apps/web.
  const config = readFileSync(join(process.cwd(), "..", "..", "supabase", "config.toml"), "utf8");
  const id = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
  if (!id) throw new Error("project_id missing in supabase/config.toml");
  return id;
}

function assertLocal(container: string) {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://invalid").hostname;
  if (host !== "127.0.0.1" && host !== "localhost")
    throw new Error("Refusing: the Supabase URL is not local.");
  const running = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  if (!running.split("\n").includes(container))
    throw new Error(`Refusing: container ${container} is not running.`);
}

export function localSql(sql: string): string {
  const container = `supabase_db_${projectId()}`;
  assertLocal(container);
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-qAt",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  );
}

/** Synthetic users only: example.test emails and the fake +91 900 test numbers. */
const DOOMED = `select id from auth.users where email like '%@example.test' or phone in
  ('919000000001','919000000002','919000000003','919000000004','919000000005')`;

/**
 * Deletes the suite's users and their patient-profile rows. The new tables use ON DELETE RESTRICT
 * (no silent loss of family data), so child rows go first, in order.
 */
export function purgeTestUsers() {
  localSql(`
    begin;
    create temporary table doomed on commit drop as ${DOOMED};
    create temporary table doomed_profiles on commit drop as
      select patient_profile_id as id from public.profile_access where account_id in (select id from doomed);
    delete from public.patient_addresses where patient_profile_id in (select id from doomed_profiles);
    delete from public.profile_access where account_id in (select id from doomed) or patient_profile_id in (select id from doomed_profiles);
    delete from public.patient_profiles where id in (select id from doomed_profiles);
    delete from public.account_deletion_requests where account_id in (select id from doomed);
    delete from auth.users where id in (select id from doomed);
    commit;
  `);
}

/** Shortens the recent sign-in window (app_settings row), for the expiry test. */
export function setRecentAuthMinutes(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error("bad minutes");
  localSql(
    `update public.app_settings set int_value = ${minutes} where key = 'recent_auth_minutes';`,
  );
}

export function restoreRecentAuthMinutes() {
  setRecentAuthMinutes(15);
}
