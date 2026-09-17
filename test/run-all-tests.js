import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("\n" + "=".repeat(65));
console.log("             TUGASKU TEST SUITE RUNNER");
console.log("=".repeat(65) + "\n");

const testFiles = [
  "activity-engine-test.js",
  "assignment-privacy-test.js",
  "draft-names-toggle-test.js",
  "lecturer-activity-log-test.js",
  "luring-with-tasks-test.js",
  "message-formatter-validation-test.js",
  "multi-topic-forum-test.js",
  "phase7-2-test.js",
  "pipeline-orchestrator-test.js",
  "regression-test.js",
  "reminder-generator-test.js",
  "routing-fix-test.js",
  "schedule-engine-test.js",
  "scheduler-test.js",
  "whatsapp-adapter-integration-test.js",
  "whatsapp-integration-test.js"
];

let totalPassed = 0;
let totalFailed = 0;
const failures = [];

const startTime = Date.now();

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[SKIP] File not found: ${file}`);
    continue;
  }

  process.stdout.write(` Running ${file.padEnd(38)} ... `);
  try {
    execSync(`node "${filePath}"`, { stdio: "pipe" });
    console.log("[ PASS ]");
    totalPassed++;
  } catch (error) {
    console.log("[ FAIL ]");
    totalFailed++;
    failures.push({
      file,
      output: error.stdout ? error.stdout.toString() : error.message
    });
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log("\n" + "=".repeat(65));
console.log(` Summary: ${totalPassed} passed, ${totalFailed} failed in ${duration}s`);
console.log("=".repeat(65));

if (failures.length > 0) {
  console.log("\nDetailed Failures:\n");
  failures.forEach(f => {
    console.log(`--- ${f.file} ---`);
    console.log(f.output);
  });
  process.exit(1);
} else {
  console.log("\n ALL TESTS PASSED SUCCESSFULLY (100%)\n");
  process.exit(0);
}
