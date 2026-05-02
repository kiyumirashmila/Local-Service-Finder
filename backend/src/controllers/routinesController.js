const ServiceRequestFact = require("../models/ServiceRequestFact");

/**
 * Returns the median value of a sorted numeric array.
 * Assumes the array is already sorted ascending.
 */
function median(sortedArr) {
  const n = sortedArr.length;
  if (!n) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
    : sortedArr[mid];
}

/**
 * GET /api/routines
 *
 * Dynamically detects routine booking patterns from the service_requests_fact
 * collection.  All groupings, thresholds and scores are derived purely from the
 * live data — no hardcoded IDs or time-slots.
 *
 * Algorithm:
 *   1. MongoDB aggregation: group by (Customer_ID, Provider_ID, Service_ID, hourOfDay)
 *      and collect all Date_Time values plus running aggregates.
 *   2. Node.js post-processing per group:
 *      a. Sort dates → calculate consecutive intervals in days
 *      b. Compute median interval
 *      c. Keep groups where: median_interval ≤ 2 days AND frequency ≥ 5
 *      d. Compute routineness_score = (frequency × success_rate) / (avg_response_time / 10)
 *   3. Sort results by routineness_score descending.
 */
const getRoutines = async (req, res) => {
  try {
    // ── Stage 1: aggregation ──────────────────────────────────────────────────
    // Group only by Customer_ID, Provider_ID, Service_ID since Date_Time is a string
    // that might not parse cleanly in MongoDB.
    const pipeline = [
      {
        $group: {
          _id: {
            Customer_ID: "$Customer_ID",
            Provider_ID: "$Provider_ID",
            Service_ID:  "$Service_ID"
          },
          requests: {
            $push: {
              Date_Time: "$Date_Time",
              Final_Status: "$Final_Status",
              Response_Time_Mins: "$Response_Time_Mins",
              Revenue_Amount: "$Revenue_Amount"
            }
          }
        }
      }
    ];

    const groups = await ServiceRequestFact.aggregate(pipeline);

    // ── Stage 2: compute groups and metrics in Node.js ───────────────────────
    const results = [];

    for (const g of groups) {
      // Group by hour of day
      const hourBuckets = {};

      for (const req of g.requests) {
        if (!req.Date_Time) continue;
        const d = new Date(req.Date_Time);
        if (isNaN(d.getTime())) continue; // Skip invalid dates

        const hour = d.getHours();
        if (!hourBuckets[hour]) {
          hourBuckets[hour] = {
            frequency: 0,
            completedCount: 0,
            totalResponseTime: 0,
            totalRevenue: 0,
            dates: [],
            first_occurrence: d,
            last_occurrence: d
          };
        }

        const bucket = hourBuckets[hour];
        bucket.frequency += 1;
        if (req.Final_Status === "Completed") bucket.completedCount += 1;
        bucket.totalResponseTime += (req.Response_Time_Mins || 0);
        bucket.totalRevenue += (req.Revenue_Amount || 0);
        bucket.dates.push(d);
        if (d < bucket.first_occurrence) bucket.first_occurrence = d;
        if (d > bucket.last_occurrence) bucket.last_occurrence = d;
      }

      // Process each hour bucket
      for (const hourStr in hourBuckets) {
        const bucket = hourBuckets[hourStr];
        if (bucket.frequency < 5) continue; // Early filter

        // Sort timestamps ascending
        bucket.dates.sort((a, b) => a - b);

        // Build array of consecutive intervals in days
        const intervals = [];
        for (let i = 1; i < bucket.dates.length; i++) {
          const diffDays = (bucket.dates[i] - bucket.dates[i - 1]) / (1000 * 60 * 60 * 24);
          intervals.push(diffDays);
        }

        if (!intervals.length) continue;

        // Sort intervals for median calculation
        intervals.sort((a, b) => a - b);
        const medianInterval = median(intervals);

        // Apply the ≤ 2-day median threshold
        if (medianInterval > 2) continue;

        // ── Derived metrics ────────────────────────────────────────────────────
        const success_rate = (bucket.completedCount / bucket.frequency) * 100;
        const avg_response_time = bucket.totalResponseTime / bucket.frequency;

        // Avoid division by zero; groups with 0 avg response time score 0
        const routineness_score =
          avg_response_time > 0
            ? (bucket.frequency * success_rate) / (avg_response_time / 10)
            : 0;

        results.push({
          Customer_ID:          g._id.Customer_ID,
          Provider_ID:          g._id.Provider_ID,
          Service_ID:           g._id.Service_ID,
          hourOfDay:            parseInt(hourStr, 10),
          frequency:            bucket.frequency,
          first_occurrence:     bucket.first_occurrence,
          last_occurrence:      bucket.last_occurrence,
          success_rate:         Math.round(success_rate * 100) / 100,
          avg_response_time:    Math.round(avg_response_time * 100) / 100,
          total_revenue:        bucket.totalRevenue,
          median_interval_days: Math.round(medianInterval * 1000) / 1000,
          routineness_score:    Math.round(routineness_score * 100) / 100
        });
      }
    }

    // ── Stage 3: sort by routineness_score descending ─────────────────────────
    results.sort((a, b) => b.routineness_score - a.routineness_score);

    res.json({ count: results.length, routines: results });
  } catch (err) {
    console.error("[routinesController] getRoutines error:", err);
    res.status(500).json({ message: err.message || "Failed to compute routines." });
  }
};

module.exports = { getRoutines };
