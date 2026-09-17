import { ScheduleEngine } from '../src/lib/schedule-engine.js';

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

function assertThrows(fn, message) {
  try {
    fn();
    console.error(`✗ FAIL: ${message} (no error thrown)`);
    testsFailed++;
  } catch (e) {
    console.log(`✓ PASS: ${message}`);
    testsPassed++;
  }
}

export async function runScheduleEngineTests() {
  console.log("=== PHASE 7.2 SCHEDULE ENGINE UNIT TESTS ===\n");

  const engine = new ScheduleEngine();

  // Test 1: 2 SKS → 14 pertemuan
  console.log("Test 1: 2 SKS → 14 pertemuan");
  const schedule2SKS = engine.getMeetingSchedule({ sks: 2, group: 1 });
  const meetings2SKS = schedule2SKS.reduce((sum, week) => sum + week.meetings.length, 0);
  assert(meetings2SKS === 14, `2 SKS harus memiliki 14 pertemuan (actual: ${meetings2SKS})`);

  // Test 2: 3 SKS → 21 pertemuan
  console.log("\nTest 2: 3 SKS → 21 pertemuan");
  const schedule3SKS = engine.getMeetingSchedule({ sks: 3, group: 1 });
  const meetings3SKS = schedule3SKS.reduce((sum, week) => sum + week.meetings.length, 0);
  assert(meetings3SKS === 21, `3 SKS harus memiliki 21 pertemuan (actual: ${meetings3SKS})`);

  // Test 3: 4 SKS → 28 pertemuan
  console.log("\nTest 3: 4 SKS → 28 pertemuan");
  const schedule4SKS = engine.getMeetingSchedule({ sks: 4, group: 1 });
  const meetings4SKS = schedule4SKS.reduce((sum, week) => sum + week.meetings.length, 0);
  assert(meetings4SKS === 28, `4 SKS harus memiliki 28 pertemuan (actual: ${meetings4SKS})`);

  // Test 4: Kelompok 1 sebelum UTS → OFFLINE
  console.log("\nTest 4: PRE-UTS group switching Kelompok 1 → OFFLINE");
  const beforeUTSOffline = schedule2SKS.filter(w => w.phase === "BEFORE_UTS" && w.delivery_mode === "OFFLINE");
  assert(beforeUTSOffline.length > 0, `Kelompok 1 sebelum UTS harus OFFLINE`);

  // Test 5: Kelompok 1 sesudah UTS → ONLINE
  console.log("\nTest 5: POST-UTS group switching Kelompok 1 → ONLINE");
  const afterUTSOnline = schedule2SKS.filter(w => w.phase === "AFTER_UTS" && w.delivery_mode === "ONLINE");
  assert(afterUTSOnline.length > 0, `Kelompok 1 sesudah UTS harus ONLINE`);

  // Test 6: Kelompok 2 sebelum UTS → ONLINE
  console.log("\nTest 6: PRE-UTS group switching Kelompok 2 → ONLINE");
  const schedule2Group2 = engine.getMeetingSchedule({ sks: 2, group: 2 });
  const beforeUTSOnlineGroup2 = schedule2Group2.filter(w => w.phase === "BEFORE_UTS" && w.delivery_mode === "ONLINE");
  assert(beforeUTSOnlineGroup2.length > 0, `Kelompok 2 sebelum UTS harus ONLINE`);

  // Test 7: Kelompok 2 sesudah UTS → OFFLINE
  console.log("\nTest 7: POST-UTS group switching Kelompok 2 → OFFLINE");
  const afterUTSOfflineGroup2 = schedule2Group2.filter(w => w.phase === "AFTER_UTS" && w.delivery_mode === "OFFLINE");
  assert(afterUTSOfflineGroup2.length > 0, `Kelompok 2 sesudah UTS harus OFFLINE`);

  // Test 8: 3 SKS memiliki double meeting dalam 1 week (Week 2, dst)
  console.log("\nTest 8: 3 SKS 2 meeting dalam 1 week");
  const doubleMetings3SKS = schedule3SKS.filter(w => w.meetings.length === 2);
  assert(doubleMetings3SKS.length > 0, `3 SKS harus memiliki beberapa minggu dengan double meeting (found: ${doubleMetings3SKS.length})`);

  // Test 9: 4 SKS memiliki double meeting
  console.log("\nTest 9: 4 SKS 2 meeting dalam 1 week");
  const doubleMetings4SKS = schedule4SKS.filter(w => w.meetings.length === 2);
  assert(doubleMetings4SKS.length > 0, `4 SKS harus memiliki beberapa minggu dengan double meeting (found: ${doubleMetings4SKS.length})`);

  // Test 10: Invalid SKS throws error
  console.log("\nTest 10: Invalid SKS throws error");
  assertThrows(
    () => engine.getMeetingSchedule({ sks: 5, group: 1 }),
    "SKS 5 harus throw error"
  );

  // Test 11: 3 SKS OFFLINE tetap memiliki aktivitas (hanya mode nya OFFLINE, schedule jalan terus)
  console.log("\nTest 11: 3 SKS OFFLINE tetap memiliki schedule/aktivitas");
  const offline3SKS = schedule3SKS.filter(w => w.delivery_mode === "OFFLINE");
  assert(offline3SKS.length > 0, "Harus merender schedule dengan tag OFFLINE");

  // Test 12: Week dan Meeting tidak tertukar
  console.log("\nTest 12: Week dan Meeting tidak tertukar");
  const w2_4sks = schedule4SKS.find(w => w.week === 2);
  assert(w2_4sks.meetings[0].meeting === 3 && w2_4sks.meetings[1].meeting === 4, "Week 2 pada 4 SKS harus menampung meeting 3 dan 4.");

  // Test 13: 2 SKS tidak memiliki double meeting
  console.log("\nTest 13: 2 SKS 1 meeting/week");
  const doubleMetings2SKS = schedule2SKS.filter(w => w.meetings.length > 1);
  assert(doubleMetings2SKS.length === 0, `2 SKS tidak boleh memiliki double meeting (found: ${doubleMetings2SKS.length})`);

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runScheduleEngineTests();
