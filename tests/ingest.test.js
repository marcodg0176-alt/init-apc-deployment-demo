const assert = require("node:assert/strict");
const test = require("node:test");
const { parseApcCsv } = require("../src/ingest");

test("parseApcCsv: parst gueltige Zeilen korrekt", () => {
  const csv = [
    "tripId,line,stop,sequence,timestamp,boarding,alighting",
    "T1,Linie 2,Hauptbahnhof,1,2026-08-11T07:00:00,12,0",
  ].join("\n");

  const { records, errors } = parseApcCsv(csv);
  assert.equal(errors.length, 0);
  assert.equal(records.length, 1);
  assert.equal(records[0].line, "Linie 2");
  assert.equal(records[0].boarding, 12);
});

test("parseApcCsv: sammelt Fehler bei ungueltigen Zeilen statt abzubrechen", () => {
  const csv = [
    "tripId,line,stop,sequence,timestamp,boarding,alighting",
    "T1,Linie 2,Hauptbahnhof,1,2026-08-11T07:00:00,zwoelf,0",
    "T2,Linie 4,Marktplatz,1,2026-08-11T08:00:00,4,1",
  ].join("\n");

  const { records, errors } = parseApcCsv(csv);
  assert.equal(records.length, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 2);
});

test("parseApcCsv: wirft Fehler bei fehlenden Pflichtspalten", () => {
  const csv = "tripId,line,stop\nT1,Linie 2,Hauptbahnhof";
  assert.throws(() => parseApcCsv(csv), /Fehlende Spalten/);
});
