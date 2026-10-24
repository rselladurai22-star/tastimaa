import "./_env";
import { closeDb } from "@/db";
import { JOBS, JOB_ORDER } from "@/etl/jobs";
import { cronMatches } from "@/lib/cron";
import { SERVICE_SCHEDULES } from "@/lib/schedules";
import { runMaintenance } from "@/server/maintenance";
import { sendDueReminders } from "@/server/reminders";

/**
 * Long-running scheduler for self-hosted deployments (see docs/DEPLOYMENT.md).
 * Checks every minute (UTC) and runs due tasks one at a time, so large imports
 * never overlap. Run with: npm run worker
 */
type Task = { name: string; schedule: string; run: () => Promise<unknown> };

const TASKS: Task[] = [
  ...JOB_ORDER.filter((name) => JOBS[name]!.schedule !== "manual").map((name) => ({ name, schedule: JOBS[name]!.schedule, run: () => JOBS[name]!.run("worker") })),
  { name: "maintenance", schedule: SERVICE_SCHEDULES.maintenance, run: () => runMaintenance() },
  { name: "reminders", schedule: SERVICE_SCHEDULES.reminders, run: () => sendDueReminders() },
];

const queue: Task[] = [];
let busy = false;
let stopping = false;

function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...data }));
}

async function drain() {
  if (busy) return;
  busy = true;
  while (queue.length && !stopping) {
    const task = queue.shift()!;
    const started = Date.now();
    log("task_start", { task: task.name });
    try {
      const result = await task.run();
      log("task_done", { task: task.name, ms: Date.now() - started, result });
    } catch (e) {
      log("task_failed", { task: task.name, ms: Date.now() - started, error: e instanceof Error ? e.message : String(e) });
    }
  }
  busy = false;
}

function tick() {
  const now = new Date();
  now.setUTCSeconds(0, 0);
  for (const task of TASKS) {
    if (cronMatches(task.schedule, now) && !queue.includes(task)) queue.push(task);
  }
  void drain();
}

function scheduleNextTick() {
  if (stopping) return;
  const ms = 60_000 - (Date.now() % 60_000) + 500;
  setTimeout(() => {
    tick();
    scheduleNextTick();
  }, ms);
}

async function shutdown(signal: string) {
  stopping = true;
  log("worker_stopping", { signal, pending: queue.map((t) => t.name), running: busy });
  // Let a running task finish its current statement; the next start resumes from the schedule.
  const deadline = Date.now() + 25_000;
  while (busy && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
  await closeDb();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

log("worker_started", { tasks: TASKS.map((t) => `${t.name} @ ${t.schedule}`) });
scheduleNextTick();
