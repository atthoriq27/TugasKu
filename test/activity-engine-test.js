import { ActivityEngine } from '../src/lib/activity-engine.js';
import { JsonSnapshotStore } from '../src/lib/storage/json-snapshot-store.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, '../test-snapshots');

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

async function runActivityEngineTests() {
  console.log("=== ACTIVITY ENGINE UNIT TESTS ===\n");

  const engine = new ActivityEngine();
  const store = new JsonSnapshotStore(testDataDir);

  // Cleanup before tests
  await store.clearAllSnapshots();

  // Test 1: Empty activities
  console.log("Test 1: Empty activities");
  const emptyResult = engine.detectActivities({ kode_course: 'TEST-001', data: [] });
  assert(emptyResult.meetings.length === 0, 'Empty course harus return empty meetings');

  // Test 2: Single activity
  console.log("\nTest 2: Single activity");
  const singleActivityCourse = {
    kode_course: 'TEST-002',
    data: [{
      kode_section: 'PERTEMUAN_1',
      sub_section: [
        { tipe: 'FORUM', kode_template: 'FORUM_DISKUSI', judul: 'Forum 1', id: 'forum-1' }
      ]
    }]
  };
  const singleResult = engine.detectActivities(singleActivityCourse);
  assert(singleResult.meetings.length === 1, 'Harus mendeteksi 1 pertemuan');
  assert(singleResult.meetings[0].activities.length === 1, 'Harus mendeteksi 1 aktivitas');
  assert(singleResult.meetings[0].activities[0].type === 'FORUM_DISKUSI', 'Activity type harus FORUM_DISKUSI');
  assert(singleResult.meetings[0].activities[0].available === true, 'Activity harus available (ada ID)');

  // Test 3: Multiple activities
  console.log("\nTest 3: Multiple activities");
  const multiActivityCourse = {
    kode_course: 'TEST-003',
    data: [{
      kode_section: 'PERTEMUAN_1',
      sub_section: [
        { tipe: 'QUIZ', kode_template: 'POSTTEST', judul: 'Posttest 1', id: 'post-1' },
        { tipe: 'FORUM', kode_template: 'FORUM_DISKUSI', judul: 'Forum 1', id: 'forum-1' },
        { tipe: 'ASSIGNMENT', kode_template: 'PENUGASAN_TERSTRUKTUR', judul: 'Tugas 1', id: 'task-1' }
      ]
    }]
  };
  const multiResult = engine.detectActivities(multiActivityCourse);
  assert(multiResult.meetings[0].activities.length === 3, 'Harus mendeteksi 3 aktivitas');

  // Test 4: Activity per meeting
  console.log("\nTest 4: Activity per meeting");
  const perMeetingCourse = {
    kode_course: 'TEST-004',
    data: [
      {
        kode_section: 'PERTEMUAN_1',
        sub_section: [{ tipe: 'FORUM', kode_template: 'FORUM_DISKUSI', judul: 'Forum 1', id: 'f1' }]
      },
      {
        kode_section: 'PERTEMUAN_2',
        sub_section: [{ tipe: 'FORUM', kode_template: 'FORUM_DISKUSI', judul: 'Forum 2', id: 'f2' }]
      }
    ]
  };
  const perMeetingResult = engine.detectActivities(perMeetingCourse);
  assert(perMeetingResult.meetings.length === 2, 'Harus mendeteksi 2 pertemuan');
  assert(perMeetingResult.meetings[0].meeting === 1, 'Pertemuan pertama harus meeting 1');
  assert(perMeetingResult.meetings[1].meeting === 2, 'Pertemuan kedua harus meeting 2');

  // Test 5: New activity detection
  console.log("\nTest 5: New activity detection");
  const snapshot1 = {
    course_id: 'TEST-005',
    meetings: [{
      meeting: 1,
      activities: [{ type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum' }]
    }]
  };
  const snapshot2 = {
    course_id: 'TEST-005',
    meetings: [{
      meeting: 1,
      activities: [
        { type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum' },
        { type: 'PENUGASAN_TERSTRUKTUR', available: true, id: 't1', title: 'Tugas' }
      ]
    }]
  };
  await store.saveSnapshot('TEST-005', snapshot1);
  const engineWithStore = new ActivityEngine({ snapshotStore: store });
  const detectionResult = await engineWithStore.detectNewActivities('TEST-005', snapshot2);
  assert(detectionResult.new_activities.length === 1, 'Harus mendeteksi 1 aktivitas baru');
  assert(detectionResult.new_activities[0].activity_type === 'PENUGASAN_TERSTRUKTUR', 'Aktivitas baru harus PENUGASAN_TERSTRUKTUR');

  // Test 6: No duplicate notification
  console.log("\nTest 6: No duplicate notification");
  await store.saveSnapshot('TEST-006', snapshot1);
  const noDuplicateResult = await engineWithStore.detectNewActivities('TEST-006', snapshot1);
  assert(noDuplicateResult.unchanged === true, 'Snapshot yang sama harus unchanged');
  assert(noDuplicateResult.new_activities.length === 0, 'Tidak boleh ada aktivitas baru');

  // Test 7: Activity removed
  console.log("\nTest 7: Activity removed");
  await store.saveSnapshot('TEST-007', snapshot2);
  const removalResult = await engineWithStore.detectNewActivities('TEST-007', snapshot1);
  assert(removalResult.removed_activities.length === 1, 'Harus mendeteksi 1 aktivitas yang dihapus');
  assert(removalResult.removed_activities[0].activity_type === 'PENUGASAN_TERSTRUKTUR', 'Aktivitas dihapus harus PENUGASAN_TERSTRUKTUR');

  // Test 8: First snapshot
  console.log("\nTest 8: First snapshot");
  const firstSnapshotResult = await engineWithStore.detectNewActivities('TEST-008-NEW', snapshot1);
  assert(firstSnapshotResult.is_first_snapshot === true, 'Harus mendeteksi sebagai first snapshot');
  assert(firstSnapshotResult.new_activities.length === 1, 'First snapshot harus generate new activities');

  // Test 9: Activity without ID
  console.log("\nTest 9: Activity without ID");
  const noIdCourse = {
    kode_course: 'TEST-009',
    data: [{
      kode_section: 'PERTEMUAN_1',
      sub_section: [
        { tipe: 'VIDEO', kode_template: 'VIDEO_AJAR', judul: 'Video 1', id: null }
      ]
    }]
  };
  const noIdResult = engine.detectActivities(noIdCourse);
  assert(noIdResult.meetings[0].activities[0].available === false, 'Activity tanpa ID harus available=false');
  assert(noIdResult.meetings[0].activities[0].id === null, 'Activity ID harus null (bukan string)');

  // Test 10: Unknown activity type ignored
  console.log("\nTest 10: Unknown activity type ignored");
  const unknownCourse = {
    kode_course: 'TEST-010',
    data: [{
      kode_section: 'PERTEMUAN_1',
      sub_section: [
        { tipe: 'UNKNOWN', kode_template: 'UNKNOWN_TYPE', judul: 'Unknown', id: 'u1' }
      ]
    }]
  };
  const unknownResult = engine.detectActivities(unknownCourse);
  assert(unknownResult.meetings.length === 0, 'Unknown activity type harus diabaikan (no meeting created)');

  // Test 11: Update notification generation
  console.log("\nTest 11: Update notification generation");
  const notificationSnapshot = {
    course_id: 'DATA_MINING',
    meetings: [
      {
        meeting: 1,
        activities: [
          { type: 'FORUM_DISKUSI', available: true, id: 'f1', title: 'Forum' },
          { type: 'PENUGASAN_TERSTRUKTUR', available: true, id: 't1', title: 'Tugas' }
        ]
      }
    ]
  };
  const notification = engine.generateUpdateNotification(notificationSnapshot);
  assert(notification !== null, 'Notification harus not null');
  assert(notification.updates.length === 2, 'Notification harus memiliki 2 updates');

  // Test 12: Combined update notification
  console.log("\nTest 12: Combined update notification");
  const snapshot2Course = {
    course_id: 'METODE_NUMERIK',
    meetings: [
      {
        meeting: 2,
        activities: [
          { type: 'PENUGASAN_TERSTRUKTUR', available: true, id: 't2', title: 'Tugas 2' }
        ]
      }
    ]
  };
  const combinedNotification = engine.generateCombinedUpdateNotification([notificationSnapshot, snapshot2Course]);
  assert(combinedNotification !== null, 'Combined notification harus not null');
  assert(combinedNotification.courses.length === 2, 'Combined notification harus memiliki 2 course');

  // Test 13: GENERAL dan UAS sections ignored
  console.log("\nTest 13: GENERAL dan UAS sections ignored");
  const specialSectionsCourse = {
    kode_course: 'TEST-013',
    data: [
      { kode_section: 'GENERAL', sub_section: [{ tipe: 'LINK', kode_template: 'RPS', judul: 'RPS', id: 'rps' }] },
      { kode_section: 'UAS', sub_section: [{ tipe: 'ASSIGNMENT', kode_template: 'PENUGASAN_TERSTRUKTUR', judul: 'UAS', id: 'uas' }] },
      { kode_section: 'PERTEMUAN_1', sub_section: [{ tipe: 'FORUM', kode_template: 'FORUM_DISKUSI', judul: 'Forum', id: 'f1' }] }
    ]
  };
  const specialResult = engine.detectActivities(specialSectionsCourse);
  assert(specialResult.meetings.length === 1, 'Hanya PERTEMUAN_1 yang harus dideteksi');
  assert(specialResult.meetings[0].meeting === 1, 'Meeting harus bernomor 1');

  // Cleanup after tests
  await store.clearAllSnapshots();

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runActivityEngineTests();
