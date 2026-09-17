import { WorldClock } from '../src/lib/world-clock.js';
import { SchedulerEngine } from '../src/lib/scheduler-engine.js';
import { ScheduleEngine } from '../src/lib/schedule-engine.js';
import { JsonSchedulerStore } from '../src/lib/storage/json-scheduler-store.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, '../test-scheduler-data');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    testsPassed++;
  }
}

async function runSchedulerTests() {
  console.log("=== SCHEDULER & WORLD CLOCK UNIT TESTS ===\n");

  const clock = new WorldClock("Asia/Jakarta");
  const store = new JsonSchedulerStore(testDataDir);
  const scheduleEngine = new ScheduleEngine();
  const scheduler = new SchedulerEngine({ clock, logStore: store, scheduleConfig: {
    timezone: "Asia/Jakarta",
    jobs: {
      mentariScan: { enabled: true },
      studentReminder: { enabled: true },
      lecturerActivityUpdate: { enabled: true }
    },
    retry: { maxAttempts: 3, delayMs: 30000 }
  }});

  // Cleanup
  await store.clear();

  // Test 1: World clock timezone
  console.log("Test 1: World clock timezone");
  assert(clock.timezone === 'Asia/Jakarta', 'Timezone harus Asia/Jakarta');

  // Test 2: Current Jakarta time
  console.log("\nTest 2: Current Jakarta time");
  const iso = clock.nowISO();
  assert(iso.includes('T'), 'ISO format harus include T');
  assert(iso.includes('+') || iso.includes('Z'), 'ISO format harus include timezone');

  // Test 3: Today date
  console.log("\nTest 3: Today date");
  const today = clock.today();
  assert(today.length === 10, 'Date format harus YYYY-MM-DD');

  // Test 4: 2 SKS schedule
  console.log("\nTest 4: 2 SKS schedule");
  const courses2SKS = [
    { course_id: 'C1', course_name: 'DATA MINING', sks: 2, group: 1 }
  ];
  const schedule2SKS = scheduleEngine.getMeetingSchedule({ sks: 2, group: 1 });
  assert(schedule2SKS.length === 14, '2 SKS harus 14 pertemuan');

  // Test 5: 3 SKS schedule
  console.log("\nTest 5: 3 SKS schedule");
  const schedule3SKS = scheduleEngine.getMeetingSchedule({ sks: 3, group: 1 });
  const totalMeetings3SKS = schedule3SKS.reduce((sum, week) => sum + week.meetings.length, 0);
  assert(totalMeetings3SKS === 21, '3 SKS harus 21 pertemuan');

  // Test 6: 4 SKS schedule
  console.log("\nTest 6: 4 SKS schedule");
  const schedule4SKS = scheduleEngine.getMeetingSchedule({ sks: 4, group: 1 });
  const totalMeetings4SKS = schedule4SKS.reduce((sum, week) => sum + week.meetings.length, 0);
  assert(totalMeetings4SKS === 28, '4 SKS harus 28 pertemuan');

  // Test 7: Double meeting detection
  console.log("\nTest 7: Double meeting detection");
  const doubleMetings = schedule3SKS.filter(w => w.meetings.length === 2);
  assert(doubleMetings.length > 0, '3 SKS harus punya double meeting');

  // Test 8: Online period
  console.log("\nTest 8: Online period");
  const onlinePeriodsGrp1 = scheduleEngine.getOnlinePeriodsForGroup(1);
  assert(onlinePeriodsGrp1.length > 0, 'Kelompok 1 harus punya online period');

  // Test 9: Offline period
  console.log("\nTest 9: Offline period");
  const offlineSchedules = schedule2SKS.filter(w => w.delivery_mode === 'OFFLINE');
  assert(offlineSchedules.length > 0, 'Harus ada offline schedule');

  // Test 10: Job generation
  console.log("\nTest 10: Job generation");
  const jobs = scheduler.generateScheduledJobs(courses2SKS, scheduleEngine);
  assert(jobs.length > 0, 'Harus generate jobs');

  // Test 11: Job uniqueness
  console.log("\nTest 11: Job uniqueness");
  const uniqueKeys = new Set(jobs.map(j => j.unique_key));
  assert(uniqueKeys.size === jobs.length, 'Setiap job harus punya unique key');

  // Test 12: Duplicate prevention
  console.log("\nTest 12: Duplicate prevention");
  const deduplicated = scheduler.deduplicateJobs([...jobs, ...jobs]);
  assert(deduplicated.length === jobs.length, 'Duplicate harus dicegah');

  // Test 13: Job state PENDING
  console.log("\nTest 13: Job state PENDING");
  assert(jobs[0].status === 'PENDING', 'Job baru harus PENDING');

  // Test 14: Job retry configuration
  console.log("\nTest 14: Job retry configuration");
  assert(jobs[0].max_attempts === 3, 'Max attempts harus 3');
  assert(scheduler.getRetryDelay() === 30000, 'Retry delay harus 30000ms');

  // Test 15: Failed MENTARI request handling
  console.log("\nTest 15: Failed MENTARI request handling");
  const job = jobs[0];
  const failedJob = await scheduler.markJobFailed(job, new Error('Connection timeout'));
  assert(failedJob.status === 'FAILED', 'Status harus FAILED');
  assert(failedJob.error.includes('Connection timeout'), 'Error message harus tersimpan');

  // Test 16: Dry run output
  console.log("\nTest 16: Dry run output");
  const dryRunOutput = scheduler.formatDryRun(jobs);
  assert(dryRunOutput.includes('TUGASKU SCHEDULER'), 'Dry run harus punya header');
  assert(dryRunOutput.includes('READY') || dryRunOutput.includes('WAITING'), 'Dry run harus punya status');

  // Test 17: Manual execution mark running
  console.log("\nTest 17: Manual execution mark running");
  const newJob = jobs[0];
  const runningJob = await scheduler.markJobRunning(newJob);
  assert(runningJob.status === 'RUNNING', 'Status harus RUNNING');
  assert(runningJob.attempts === 1, 'Attempts harus increment');

  // Test 18: Persistence
  console.log("\nTest 18: Persistence");
  const allJobs = await store.getAll();
  assert(allJobs.length > 0, 'Jobs harus persist');

  // Test 19: Multiple courses
  console.log("\nTest 19: Multiple courses");
  const multiCourses = [
    { course_id: 'C1', course_name: 'DATA MINING', sks: 2, group: 1 },
    { course_id: 'C2', course_name: 'METODE NUMERIK', sks: 3, group: 1 }
  ];
  const multiJobs = scheduler.generateScheduledJobs(multiCourses, scheduleEngine);
  assert(multiJobs.length > jobs.length, 'Multiple courses harus generate lebih banyak jobs');

  // Test 20: Multiple meetings
  console.log("\nTest 20: Multiple meetings");
  const c1Jobs = multiJobs.filter(j => j.course_id === 'C1');
  assert(c1Jobs.length >= 14, 'C1 (2 SKS) harus minimal 14 jobs');

  // Test 21: Scheduler restart idempotency
  console.log("\nTest 21: Scheduler restart idempotency");
  const existingJob = await store.getByUniqueKey(jobs[0].unique_key);
  assert(existingJob !== null, 'Job harus tersimpan dengan unique key');

  // Test 22: Filter by type
  console.log("\nTest 22: Filter by type");
  const scanJobs = await store.getByType('MENTARI_SCAN');
  assert(scanJobs.length > 0, 'Filter by type harus work');

  // Test 23: Filter by status
  console.log("\nTest 23: Filter by status");
  const pendingJobs = await store.getByStatus('PENDING');
  assert(Array.isArray(pendingJobs), 'Filter by status harus return array');

  // Test 24: Filter by course
  console.log("\nTest 24: Filter by course");
  const courseJobs = await store.getByCourse('C1');
  assert(courseJobs.length > 0, 'Filter by course harus work');

  // Test 26: Manual runJob success
  console.log("\nTest 26: Manual runJob success");
  const manualJob = scheduler.createJob('MENTARI_SCAN', 'C5', 'MANUAL COURSE', 1, 'BEFORE_UTS', 'ONLINE', 1);
  const manualResult = await scheduler.runJob(manualJob, async () => ({ ok: true }));
  assert(manualResult.job.status === 'COMPLETED', 'Manual runJob sukses harus COMPLETED');
  assert(manualResult.result.ok === true, 'Manual runJob harus return result');

  // Test 27: Unknown configuration handling
  console.log("\nTest 27: Unknown configuration handling");
  const badScheduler = new SchedulerEngine({ clock, scheduleConfig: { timezone: 'Asia/Jakarta', jobs: {} } });
  const configStatus = badScheduler.getConfigurationStatus();
  assert(configStatus.status === 'CONFIG_REQUIRED', 'Konfigurasi tidak lengkap harus CONFIG_REQUIRED');
  assert(configStatus.missing.includes('retry'), 'Missing config harus mencakup retry');

  // Test 25: Should retry logic
  console.log("\nTest 25: Should retry logic");
  const failJob = {
    status: 'FAILED',
    attempts: 1,
    max_attempts: 3
  };
  assert(scheduler.shouldRetry(failJob) === true, 'Failed job dengan attempts < max harus retry');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSchedulerTests();

