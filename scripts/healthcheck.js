"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseApcCsv } = require("../src/ingest");
const { buildDailyReport } = require("../src/report");

const dataPath = path.join(__dirname, "..", "data", "sample-apc-records.csv");
const csv = fs.readFileSync(dataPath, "utf8");
const { records, errors } = parseApcCsv(csv);
const report = buildDailyReport(records, errors);

const checks = [
  { name: "Report enthaelt Datensaetze", pass: report.totalRecords > 0 },
  { name: "Keine Ingest-Fehler", pass: report.ingestErrors.length === 0 },
  { name: "Report-Struktur vollstaendig", pass: Boolean(report.generatedAt && report.occupancyByTrip) },
];

let healthy = true;
for (const check of checks) {
  console.log("[healthcheck] " + (check.pass ? "OK" : "FEHLER") + " - " + check.name);
  if (!check.pass) healthy = false;
}

if (!healthy) {
  console.error("[healthcheck] Deployment als UNGESUND markiert - Pipeline sollte abbrechen.");
  process.exitCode = 1;
} else {
  console.log("[healthcheck] Deployment als GESUND markiert.");
}
