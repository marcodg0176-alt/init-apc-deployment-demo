"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseApcCsv } = require("../src/ingest");
const { buildDailyReport } = require("../src/report");

const dataPath = path.join(__dirname, "..", "data", "sample-apc-records.csv");
const csv = fs.readFileSync(dataPath, "utf8");
const { records, errors } = parseApcCsv(csv);
const report = buildDailyReport(records, errors);

console.log(JSON.stringify(report, null, 2));
