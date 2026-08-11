"use strict";

function computeOccupancy(records) {
  const byTrip = new Map();
  for (const record of records) {
    if (!byTrip.has(record.tripId)) {
      byTrip.set(record.tripId, []);
    }
    byTrip.get(record.tripId).push(record);
  }

  const occupancyByTrip = {};
  const anomalies = [];

  for (const [tripId, tripRecords] of byTrip) {
    const sorted = tripRecords.slice().sort((a, b) => a.sequence - b.sequence);
    let occupancy = 0;
    const stops = [];

    for (const stop of sorted) {
      occupancy = occupancy + stop.boarding - stop.alighting;
      stops.push({
        stop: stop.stop,
        sequence: stop.sequence,
        boarding: stop.boarding,
        alighting: stop.alighting,
        occupancy: occupancy,
      });

      if (occupancy < 0) {
        anomalies.push({
          tripId: tripId,
          stop: stop.stop,
          sequence: stop.sequence,
          reason: "Negative Auslastung (" + occupancy + ") - moeglicher Zaehlfehler",
        });
      }
    }

    occupancyByTrip[tripId] = stops;
  }

  return { occupancyByTrip, anomalies };
}

function hourlyVolumeByLine(records) {
  const result = {};
  for (const record of records) {
    const hour = String(record.timestamp.getHours()).padStart(2, "0");
    result[record.line] = result[record.line] || {};
    result[record.line][hour] = (result[record.line][hour] || 0) + record.boarding;
  }
  return result;
}

module.exports = { computeOccupancy, hourlyVolumeByLine };
