import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WorldClock } from "./src/lib/world-clock.js";
import { SchedulerEngine } from "./src/lib/scheduler-engine.js";
import { ScheduleEngine } from "./src/lib/schedule-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schedulerConfigPath = path.join(__dirname, "config", "scheduler.json");
const schedulerConfig = JSON.parse(fs.readFileSync(schedulerConfigPath, "utf-8"));
const clock = new WorldClock(schedulerConfig.timezone || "Asia/Jakarta");
const scheduler = new SchedulerEngine({ clock, scheduleConfig: schedulerConfig });
const scheduleEngine = new ScheduleEngine();

const courses = [
  { course_id: "20252-04TPLE003-22TIF0162", course_name: "DATA MINING", sks: 3, group: 1 },
  { course_id: "20252-04TPLE003-22TIF0213", course_name: "METODE NUMERIK", sks: 3, group: 1 }
];

if (process.argv.includes("--dry-run")) {
  const jobs = scheduler.deduplicateJobs(scheduler.generateScheduledJobs(courses, scheduleEngine));
  console.log(scheduler.formatDryRun(jobs));
} else {
  console.log("Gunakan: node scheduler.js --dry-run");
}
