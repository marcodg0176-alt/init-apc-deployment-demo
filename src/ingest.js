"use strict";

function parseApcCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], errors: [] };
  }

  const [header, ...rows] = lines;
  const columns = header.split(",").map((col) => col.trim());
  const expected = ["tripId", "line", "stop", "sequence", "timestamp", "boarding", "alighting"];
  const missing = expected.filter((col) => !columns.includes(col));
  if (missing.length > 0) {
    throw new Error("Fehlende Spalten im APC-Export: " + missing.join(", "));
  }

  const records = [];
  const errors = [];

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const values = row.split(",").map((value) => value.trim());
    if (values.length !== columns.length) {
      errors.push({ line: lineNumber, reason: "Spaltenanzahl stimmt nicht mit Header ueberein" });
      return;
    }

    const raw = Object.fromEntries(columns.map((col, i) => [col, values[i]]));
    const sequence = Number(raw.sequence);
    const boarding = Number(raw.boarding);
    const alighting = Number(raw.alighting);
    const timestamp = new Date(raw.timestamp);

    if (!raw.tripId || !raw.line || !raw.stop) {
      errors.push({ line: lineNumber, reason: "tripId, line oder stop fehlt" });
      return;
    }
    if (!Number.isFinite(sequence) || !Number.isFinite(boarding) || !Number.isFinite(alighting)) {
      errors.push({ line: lineNumber, reason: "sequence, boarding oder alighting ist keine gueltige Zahl" });
      return;
    }
    if (Number.isNaN(timestamp.getTime())) {
      errors.push({ line: lineNumber, reason: "timestamp ist kein gueltiges Datum" });
      return;
    }

    records.push({
      tripId: raw.tripId,
      line: raw.line,
      stop: raw.stop,
      sequence: sequence,
      timestamp: timestamp,
      boarding: boarding,
      alighting: alighting,
    });
  });

  return { records, errors };
}

module.exports = { parseApcCsv };
