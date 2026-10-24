import "./_env";
import { closeDb } from "@/db";
import { JOBS, JOB_ORDER } from "@/etl/jobs";

/**
 * Usage:
 *   npm run etl -- <job> [<job> …]
 *   npm run etl -- all
 *   npm run etl -- list
 */
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "list") {
    for (const name of JOB_ORDER) console.log(`${name.padEnd(22)} ${JOBS[name]!.schedule.padEnd(14)} ${JOBS[name]!.description}`);
    return;
  }
  const names = args[0] === "all" ? JOB_ORDER : args;
  let failed = false;
  for (const name of names) {
    const job = JOBS[name];
    if (!job) {
      console.error(`Unknown job "${name}". Run "npm run etl -- list".`);
      process.exitCode = 2;
      return;
    }
    const result = await job.run("cli");
    console.log(JSON.stringify({ job: name, ...result }));
    if (result.status === "failed") failed = true;
  }
  if (failed) process.exitCode = 1;
}

main().finally(closeDb);
