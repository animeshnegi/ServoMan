import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_$-]{0,62}$/;

function valid(value: string, label: string) { if (!IDENT.test(value)) throw Object.assign(new Error(`Invalid ${label}`), { status: 400 }); }
async function privileged(command: string, args: string[]) {
  try { if (typeof process.getuid === "function" && process.getuid() === 0) return exec(command, args, { timeout: 120_000 }); return exec("sudo", ["-n", command, ...args], { timeout: 120_000 }); }
  catch (e: any) { throw Object.assign(new Error(String(e?.stderr || e?.message || "database command failed").slice(0, 1000)), { status: 500 }); }
}

export async function createDatabase(name: string, engine: string) {
  valid(name, "database name"); const e = engine.toLowerCase();
  if (e.includes("postgres")) await privileged("createdb", [name]);
  else if (e.includes("mysql") || e.includes("maria")) await privileged("mysql", ["-e", `CREATE DATABASE IF NOT EXISTS \`${name}\``]);
  else throw Object.assign(new Error(`Unsupported database engine: ${engine}`), { status: 400 });
}
export async function dropDatabase(name: string, engine: string) {
  valid(name, "database name"); const e = engine.toLowerCase();
  if (e.includes("postgres")) await privileged("dropdb", ["--if-exists", name]);
  else if (e.includes("mysql") || e.includes("maria")) await privileged("mysql", ["-e", `DROP DATABASE IF EXISTS \`${name}\``]);
  else throw Object.assign(new Error(`Unsupported database engine: ${engine}`), { status: 400 });
}
export async function createDatabaseUser(username: string, password: string, dbName: string, engine: string, privileges = "ALL") {
  valid(username, "database username"); valid(dbName, "database name"); if (!password || password.length < 12) throw Object.assign(new Error("Database password must be at least 12 characters"), { status: 400 });
  const e = engine.toLowerCase();
  if (e.includes("postgres")) {
    const escaped = password.replace(/'/g, "''");
    await privileged("psql", ["-c", `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${username}') THEN CREATE ROLE \"${username}\" LOGIN PASSWORD '${escaped}'; ELSE ALTER ROLE \"${username}\" PASSWORD '${escaped}'; END IF; END $$; GRANT ${privileges === "ALL" ? "ALL PRIVILEGES" : "CONNECT"} ON DATABASE \"${dbName}\" TO \"${username}\";`]);
  } else if (e.includes("mysql") || e.includes("maria")) {
    const escaped = password.replace(/'/g, "''");
    await privileged("mysql", ["-e", `CREATE USER IF NOT EXISTS '${username}'@'localhost' IDENTIFIED BY '${escaped}'; ALTER USER '${username}'@'localhost' IDENTIFIED BY '${escaped}'; GRANT ${privileges === "ALL" ? "ALL PRIVILEGES" : "SELECT"} ON \`${dbName}\`.* TO '${username}'@'localhost'; FLUSH PRIVILEGES;`]);
  } else throw Object.assign(new Error(`Unsupported database engine: ${engine}`), { status: 400 });
}
export async function dropDatabaseUser(username: string, engine: string) {
  valid(username, "database username"); const e = engine.toLowerCase();
  if (e.includes("postgres")) await privileged("psql", ["-c", `DROP ROLE IF EXISTS \"${username}\"`]);
  else if (e.includes("mysql") || e.includes("maria")) await privileged("mysql", ["-e", `DROP USER IF EXISTS '${username}'@'localhost'`]);
  else throw Object.assign(new Error(`Unsupported database engine: ${engine}`), { status: 400 });
}
