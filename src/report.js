"use strict";

const { computeOccupancy, hourlyVolumeByLine } = require("./aggregate");

function buildDailyReport(records, ingestErrors) {
  ingestErrors = ingestErrors || [];
  const { occupancyByTrip, anomalies } = computeOccupancy(records);
  const hourlyVolume = hourlyVolumeByLine(records);

  return {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    tripsAnalyzed: Object.keys(occupancyByTrip).length,
    ingestErrors: ingestErrors,
    anomalies: anomalies,
    hourlyVolumeByLine: hourlyVolume,
    occupancyByTrip: occupancyByTrip,
  };
}

module.exports = { buildDailyReport };
