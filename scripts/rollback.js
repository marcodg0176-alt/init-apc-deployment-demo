"use strict";

const fs = require("node:fs");
const path = require("node:path");

const HISTORY_FILE = path.join(__dirname, "release-history.json");

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return { releases: [] };
  }
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

const history = loadHistory();

if (history.releases.length < 2) {
  console.log("[rollback] Keine vorherige Version zum Zurueckrollen vorhanden.");
  process.exit(0);
}

const failed = history.releases.pop();
const previous = history.releases[history.releases.length - 1];

fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

console.log("[rollback] Deployment " + failed.version + " (" + failed.timestamp + ") wird zurueckgerollt.");
console.log("[rollback] Aktive Version ist jetzt wieder: " + previous.version + " (" + previous.timestamp + ").");
