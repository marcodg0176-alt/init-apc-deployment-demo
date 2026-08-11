const assert = require("node:assert/strict");
const test = require("node:test");
const { parseApcCsv } = require("../src/ingest");
const { computeOccupancy, hourlyVolumeByLine } = require("../src/aggregate");

const sampleCsv = [
  "tripId,line,stop,sequence,timestamp,boarding,alighting",
  "T1,Linie 2,Hauptbahnhof,1,2026-08-11T07:00:00,12,0",
  "T1,Linie 2,Marktplatz,2,2026-08-11T07:06:00,5,3",
  "T1,Linie 2,Europaplatz,3,2026-08-11T07:12:00,2,8",
  "T2,Linie 4,Hauptbahnhof,1,2026-08-11T08:00:00,20,0",
  "T2,Linie 4,Marktplatz,2,2026-08-11T08:07:00,4,25",
].join("\n");

test("computeOccupancy: berechnet kumulierte Auslastung korrekt", () => {
  const { records } = parseApcCsv(sampleCsv);
  const { occupancyByTrip } = computeOccupancy(records);

  assert.equal(occupancyByTrip.T1[0].occupancy, 12);
  assert.equal(occupancyByTrip.T1[1].occupancy, 14);
  assert.equal(occupancyByTrip.T1[2].occupancy, 8);
});

test("computeOccupancy: erkennt negative Auslastung als Anomalie", () => {
  const { records } = parseApcCsv(sampleCsv);
  const { anomalies } = computeOccupancy(records);

  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].tripId, "T2");
  assert.match(anomalies[0].reason, /Negative Auslastung/);
});

test("hourlyVolumeByLine: summiert Einsteiger je Linie und Stunde", () => {
  const { records } = parseApcCsv(sampleCsv);
  const volume = hourlyVolumeByLine(records);

  assert.equal(volume["Linie 2"]["07"], 19);
  assert.equal(volume["Linie 4"]["08"], 24);
});
