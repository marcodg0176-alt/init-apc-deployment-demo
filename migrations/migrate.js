"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MIGRATIONS_DIR = __dirname;
const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0] || "status";
const envArg = ARGS.find((arg) => arg.startsWith("--env="));
const ENV = envArg ? envArg.split("=")[1] : "local";
const STATE_FILE = path.join(MIGRATIONS_DIR, ".migration-state." + ENV + ".json");

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { applied: [] };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function listUpMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !file.includes(".down."))
    .sort();
}

function up() {
  const state = loadState();
  const migrations = listUpMigrations();
  const pending = migrations.filter((file) => !state.applied.includes(file));

  if (pending.length === 0) {
    console.log("[" + ENV + "] Keine ausstehenden Migrationen.");
    return;
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log("[" + ENV + "] Wende Migration an: " + file);
    console.log(sql.trim());
    state.applied.push(file);
    saveState(state);
  }
  console.log("[" + ENV + "] " + pending.length + " Migration(en) angewendet.");
}

function down() {
  const state = loadState();
  const last = state.applied.pop();

  if (!last) {
    console.log("[" + ENV + "] Keine Migration zum Zurueckrollen vorhanden.");
    return;
  }

  const downFile = last.replace(".sql", ".down.sql");
  const downPath = path.join(MIGRATIONS_DIR, downFile);

  if (!fs.existsSync(downPath)) {
    console.error("[" + ENV + "] Kein Rollback-Skript gefunden fuer: " + last);
    process.exitCode = 1;
    return;
  }

  const sql = fs.readFileSync(downPath, "utf8");
  console.log("[" + ENV + "] Rolle Migration zurueck: " + last);
  console.log(sql.trim());
  saveState(state);
  console.log("[" + ENV + "] Rollback abgeschlossen.");
}

function status() {
  const state = loadState();
  const migrations = listUpMigrations();
  console.log("[" + ENV + "] Migrationsstatus:");
  for (const file of migrations) {
    const applied = state.applied.includes(file);
    console.log("  [" + (applied ? "x" : " ") + "] " + file);
  }
}

switch (COMMAND) {
  case "up":
    up();
    break;
  case "down":
    down();
    break;
  case "status":
    status();
    break;
  default:
    console.error("Unbekannter Befehl: " + COMMAND);
    process.exitCode = 1;
}
