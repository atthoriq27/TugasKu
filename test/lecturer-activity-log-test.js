import { LecturerActivityLogEngine } from '../src/lib/lecturer-activity-log-engine.js';
import { JsonLecturerLogStore } from '../src/lib/storage/json-lecturer-log-store.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testLogDir = path.join(__dirname, '../test-logs');

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

async function runLecturerActivityLogTests() {
  console.log("=== LECTURER ACTIVITY LOG UNIT TESTS ===\n");

  const store = new JsonLecturerLogStore(testLogDir);
  const engine = new LecturerActivityLogEngine({ logStore: store });

  // Cleanup
  await store.clear();

  // Test 1: New activity → CREATED
  console.log("Test 1: New activity → CREATED");
  const snapshot1 = {
    course_id: 'C1',
    meetings: [{
      meeting: 1,
      activities: [
        { type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum 1' }
      ]
    }]
  };
  const events1 = await engine.detectActivityChanges('C1', 'DATA MINING', 'Dr. Ahmad', null, snapshot1);
  assert(events1.length === 1, 'Harus ada 1 event');
  assert(events1[0].event_type === 'CREATED', 'Event type harus CREATED');
  assert(events1[0].activity_type === 'FORUM_DISKUSI', 'Activity type harus FORUM_DISKUSI');

  // Test 2: No change → no new event
  console.log("\nTest 2: No change → no new event");
  const events2 = await engine.detectActivityChanges('C1', 'DATA MINING', 'Dr. Ahmad', snapshot1, snapshot1);
  assert(events2.length === 0, 'Tidak boleh ada event jika tidak ada perubahan');

  // Test 3: Activity removed → REMOVED
  console.log("\nTest 3: Activity removed → REMOVED");
  const snapshot2 = { course_id: 'C1', meetings: [{ meeting: 1, activities: [] }] };
  const events3 = await engine.detectActivityChanges('C1', 'DATA MINING', 'Dr. Ahmad', snapshot1, snapshot2);
  assert(events3.length === 1, 'Harus ada 1 event');
  assert(events3[0].event_type === 'REMOVED', 'Event type harus REMOVED');

  // Test 4: Multiple activities
  console.log("\nTest 4: Multiple activities");
  const snapshot3 = {
    course_id: 'C1',
    meetings: [{
      meeting: 1,
      activities: [
        { type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum' },
        { type: 'PENUGASAN_TERSTRUKTUR', available: true, id: 't1', title: 'Tugas' }
      ]
    }]
  };
  const events4 = await engine.detectActivityChanges('C1', 'DATA MINING', 'Dr. Ahmad', null, snapshot3);
  assert(events4.length === 2, 'Harus ada 2 events');

  // Test 5: Multiple courses
  console.log("\nTest 5: Multiple courses");
  const snapshot4 = {
    course_id: 'C2',
    meetings: [{
      meeting: 2,
      activities: [
        { type: 'POSTTEST', available: true, id: 'p1', title: 'Posttest' }
      ]
    }]
  };
  await engine.detectActivityChanges('C2', 'METODE NUMERIK', 'Dr. Budi', null, snapshot4);
  const logsC1 = await store.getByCourse('C1');
  const logsC2 = await store.getByCourse('C2');
  assert(logsC1.length > 0, 'Harus ada log untuk C1');
  assert(logsC2.length > 0, 'Harus ada log untuk C2');

  // Test 6: Filter by course
  console.log("\nTest 6: Filter by course");
  const filtered = await store.getByCourse('C1');
  assert(filtered.length >= 2, 'Filter course harus return events');
  assert(filtered.every(e => e.course_id === 'C1'), 'Semua event harus dari C1');

  // Test 7: Filter by meeting
  console.log("\nTest 7: Filter by meeting");
  const byMeeting = await store.getByMeeting('C1', 1);
  assert(byMeeting.length > 0, 'Filter meeting harus return events');
  assert(byMeeting.every(e => e.meeting === 1), 'Semua event harus dari meeting 1');

  // Test 8: Filter by date (today)
  console.log("\nTest 8: Filter by date");
  const today = new Date().toISOString().split('T')[0];
  const byDate = await store.getByDate(today);
  assert(byDate.length >= 3, 'Filter date harus return events');

  // Test 9: Lecturer name tersedia
  console.log("\nTest 9: Lecturer name tersedia");
  const logsWithLecturer = await store.getAll();
  const withLecturer = logsWithLecturer.filter(e => e.lecturer_name !== null);
  assert(withLecturer.length > 0, 'Ada event dengan lecturer name');
  assert(withLecturer[0].lecturer_name === 'Dr. Ahmad' || withLecturer[0].lecturer_name === 'Dr. Budi', 'Lecturer name harus benar');

  // Test 10: Lecturer name tidak tersedia
  console.log("\nTest 10: Lecturer name tidak tersedia");
  const snapshot5 = {
    course_id: 'C3',
    meetings: [{
      meeting: 1,
      activities: [
        { type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum' }
      ]
    }]
  };
  const events10 = await engine.detectActivityChanges('C3', 'COURSE 3', null, null, snapshot5);
  assert(events10[0].lecturer_name === null, 'Lecturer name boleh null');

  // Test 11: Duplicate scan tidak membuat duplicate event
  console.log("\nTest 11: Duplicate scan tidak membuat duplicate event");
  const beforeCount = (await store.getByCourse('C1')).length;
  await engine.detectActivityChanges('C1', 'DATA MINING', 'Dr. Ahmad', snapshot3, snapshot3);
  const afterCount = (await store.getByCourse('C1')).length;
  assert(beforeCount === afterCount, 'Duplicate scan tidak boleh tambah event');

  // Test 12: Incomplete scan tidak false REMOVED
  console.log("\nTest 12: Incomplete scan tidak false REMOVED");
  const snapshotIncomplete = { course_id: 'C4', meetings: [] };
  const events12 = await engine.detectActivityChanges('C4', 'COURSE 4', 'Dr. Citra', null, snapshotIncomplete);
  assert(events12.length === 0, 'Incomplete snapshot tidak boleh create CREATED event');

  // Test 13: JSON persistence
  console.log("\nTest 13: JSON persistence");
  const allLogs = await store.getAll();
  assert(Array.isArray(allLogs), 'Logs harus array');
  assert(allLogs.length > 0, 'Logs harus persist di file');

  // Test 14: Clear untuk test
  console.log("\nTest 14: Clear untuk test");
  await store.clear();
  const clearedLogs = await store.getAll();
  assert(clearedLogs.length === 0, 'Clear harus hapus semua logs');

  // Test 15: Structured notification output
  console.log("\nTest 15: Structured notification output");
  const testEvents = [
    {
      course_id: 'C1',
      course_name: 'DATA MINING',
      meeting: 1,
      lecturer_name: 'Dr. Ahmad',
      activity_type: 'PENUGASAN_TERSTRUKTUR',
      activity_title: 'Tugas 1',
      event_type: 'CREATED'
    },
    {
      course_id: 'C1',
      course_name: 'DATA MINING',
      meeting: 1,
      lecturer_name: 'Dr. Ahmad',
      activity_type: 'FORUM_DISKUSI',
      activity_title: 'Forum 1',
      event_type: 'CREATED'
    }
  ];
  const notification = engine.generateNotification(testEvents);
  assert(notification !== null, 'Notification harus tidak null');
  assert(notification.type === 'LECTURER_ACTIVITY_UPDATE', 'Type harus LECTURER_ACTIVITY_UPDATE');
  assert(notification.entries.length === 1, 'Harus ada 1 entry (grouped by course+meeting)');
  assert(notification.entries[0].activities.length === 2, 'Entry harus punya 2 activities');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runLecturerActivityLogTests();
