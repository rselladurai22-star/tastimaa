/**
 * Schedules (UTC) for the non-ingestion tasks. Ingestion schedules live with
 * each job in src/etl/jobs. The worker and vercel.json must both match these;
 * a unit test checks vercel.json.
 */
export const SERVICE_SCHEDULES = {
  maintenance: "15 3 * * *",
  reminders: "0 8 * * *",
} as const;
