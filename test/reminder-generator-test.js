import { ReminderEngine } from '../src/lib/reminder-engine.js';
import { MessageGenerator } from '../src/lib/message-generator.js';

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

async function runReminderGeneratorTests() {
  console.log("=== REMINDER GENERATOR UNIT TESTS ===\n");

  const engine = new ReminderEngine();

  // Test 1: Semua mahasiswa sudah selesai
  console.log("Test 1: Semua mahasiswa sudah selesai");
  const allDoneStudents = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "SUDAH_MENGERJAKAN",
      forum_reply_count: 2,
      forum_status: "MEMENUHI"
    },
    {
      nim: "002",
      nama_mahasiswa: "Budi",
      posttest_status: "SUDAH_MENGERJAKAN",
      forum_reply_count: 3,
      forum_status: "MEMENUHI"
    }
  ];
  const allDoneCandidates = engine.getReminderCandidates(allDoneStudents);
  assert(allDoneCandidates.length === 0, "Tidak ada reminder jika semua sudah selesai");

  // Test 2: Semua mahasiswa belum selesai
  console.log("\nTest 2: Semua mahasiswa belum selesai");
  const allNotDoneStudents = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 0,
      forum_status: "BELUM_MENGERJAKAN"
    },
    {
      nim: "002",
      nama_mahasiswa: "Budi",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 0,
      forum_status: "BELUM_MENGERJAKAN"
    }
  ];
  const allNotDoneCandidates = engine.getReminderCandidates(allNotDoneStudents);
  assert(allNotDoneCandidates.length === 2, "Semua mahasiswa harus di-reminder");

  // Test 3: Sebagian belum Posttest
  console.log("\nTest 3: Sebagian belum Posttest");
  const mixedPosttest = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 2,
      forum_status: "MEMENUHI"
    },
    {
      nim: "002",
      nama_mahasiswa: "Budi",
      posttest_status: "SUDAH_MENGERJAKAN",
      forum_reply_count: 2,
      forum_status: "MEMENUHI"
    }
  ];
  const mixedPosttestCandidates = engine.getReminderCandidates(mixedPosttest);
  assert(mixedPosttestCandidates.length === 1, "Hanya Ahmad yang di-reminder");
  assert(mixedPosttestCandidates[0].reason.includes("BELUM_POSTTEST"), "Alasan harus BELUM_POSTTEST");

  // Test 4: Sebagian Forum <2
  console.log("\nTest 4: Sebagian Forum <2");
  const mixedForum = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "SUDAH_MENGERJAKAN",
      forum_reply_count: 1,
      forum_status: "BELUM_MEMENUHI"
    },
    {
      nim: "002",
      nama_mahasiswa: "Budi",
      posttest_status: "SUDAH_MENGERJAKAN",
      forum_reply_count: 2,
      forum_status: "MEMENUHI"
    }
  ];
  const mixedForumCandidates = engine.getReminderCandidates(mixedForum);
  assert(mixedForumCandidates.length === 1, "Hanya Ahmad yang di-reminder");
  assert(mixedForumCandidates[0].reason.includes("FORUM_BELUM_MEMENUHI"), "Alasan harus FORUM_BELUM_MEMENUHI");

  // Test 5: Mahasiswa gagal kedua aktivitas
  console.log("\nTest 5: Mahasiswa gagal kedua aktivitas");
  const bothFailed = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 0,
      forum_status: "BELUM_MENGERJAKAN"
    }
  ];
  const bothFailedCandidates = engine.getReminderCandidates(bothFailed);
  assert(bothFailedCandidates.length === 1, "Ahmad harus di-reminder");
  assert(bothFailedCandidates[0].reason.length === 2, "Ahmad harus punya 2 alasan");
  assert(bothFailedCandidates[0].reason.includes("BELUM_POSTTEST"), "Harus ada BELUM_POSTTEST");
  assert(bothFailedCandidates[0].reason.includes("FORUM_BELUM_MEMENUHI"), "Harus ada FORUM_BELUM_MEMENUHI");

  // Test 6: Tidak ada duplicate student
  console.log("\nTest 6: Tidak ada duplicate student");
  const duplicateInput = [
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 0,
      forum_status: "BELUM_MENGERJAKAN"
    },
    {
      nim: "001",
      nama_mahasiswa: "Ahmad",
      posttest_status: "BELUM_MENGERJAKAN",
      forum_reply_count: 0,
      forum_status: "BELUM_MENGERJAKAN"
    }
  ];
  const noDuplicates = engine.getReminderCandidates(duplicateInput);
  assert(noDuplicates.length === 1, "Tidak boleh ada duplicate Ahmad");

  // Test 7: Simple message format
  console.log("\nTest 7: Simple message format");
  const courseMetadata = {
    course_name: "DATA MINING",
    course_id: "TEST-001",
    meeting: 1,
    whatsapp_group: "DATA_MINING_GROUP"
  };
  const candidates = [
    { nim: "001", nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] },
    { nim: "002", nama_mahasiswa: "Budi", reason: ["FORUM_BELUM_MEMENUHI"] }
  ];
  const simpleMsg = MessageGenerator.generateStudentReminderSimple(courseMetadata, candidates);
  assert(simpleMsg !== null, "Simple message harus tidak null");
  assert(simpleMsg.includes("Ahmad"), "Harus mencakup Ahmad");
  assert(simpleMsg.includes("Budi"), "Harus mencakup Budi");
  assert(simpleMsg.includes("DATA MINING"), "Harus mencakup nama matkul");

  // Test 8: Detail message format
  console.log("\nTest 8: Detail message format");
  const detailMsg = MessageGenerator.generateStudentReminderDetail(courseMetadata, candidates);
  assert(detailMsg !== null, "Detail message harus tidak null");
  assert(detailMsg.includes("Posttest"), "Harus show 'Posttest' untuk Ahmad");
  assert(detailMsg.includes("Forum Diskusi"), "Harus show 'Forum Diskusi' untuk Budi");
  assert(detailMsg.includes("Ahmad — Posttest"), "Format harus benar");

  // Test 9: Empty result
  console.log("\nTest 9: Empty result");
  const emptyMsg = MessageGenerator.generateStudentReminderSimple(courseMetadata, []);
  assert(emptyMsg === null, "Empty candidates harus return null");

  // Test 10: Single student
  console.log("\nTest 10: Single student");
  const singleStudent = [{ nim: "001", nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] }];
  const singleMsg = MessageGenerator.generateStudentReminderSimple(courseMetadata, singleStudent);
  assert(singleMsg !== null, "Single student message harus tidak null");
  assert(singleMsg.includes("1. Ahmad"), "Format harus correct");

  // Test 11: Multiple courses
  console.log("\nTest 11: Multiple courses");
  const coursesList = [
    {
      metadata: { course_name: "DATA MINING", course_id: "C1", meeting: 1, whatsapp_group: "G1" },
      candidates: [{ nim: "001", nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] }],
      mode: "SIMPLE"
    },
    {
      metadata: { course_name: "METODE NUMERIK", course_id: "C2", meeting: 2, whatsapp_group: "G2" },
      candidates: [{ nim: "002", nama_mahasiswa: "Budi", reason: ["FORUM_BELUM_MEMENUHI"] }],
      mode: "SIMPLE"
    }
  ];
  const multiCourseReminders = engine.generateMultipleCourseReminders(coursesList);
  assert(multiCourseReminders.length === 2, "Harus ada 2 reminder");
  assert(multiCourseReminders[0].course_name === "DATA MINING", "Course 1 harus DATA MINING");
  assert(multiCourseReminders[1].course_name === "METODE NUMERIK", "Course 2 harus METODE NUMERIK");

  // Test 12: Course metadata
  console.log("\nTest 12: Course metadata");
  const reminder = engine.generateReminder(courseMetadata, candidates, "SIMPLE");
  assert(reminder.course_id === "TEST-001", "Course ID harus terserah");
  assert(reminder.meeting === 1, "Meeting harus 1");
  assert(reminder.whatsapp_group === "DATA_MINING_GROUP", "WhatsApp group harus terserah");

  // Test 13: Main group vs course group separation
  console.log("\nTest 13: Main group vs course group separation");
  const mainUpdate = engine.generateMainGroupUpdate(multiCourseReminders);
  assert(mainUpdate !== null, "Main group update harus tidak null");
  assert(mainUpdate.type === "MAIN_GROUP_UPDATE", "Type harus MAIN_GROUP_UPDATE");
  assert(mainUpdate.courses.length === 2, "Harus ada 2 course dalam main update");
  assert(mainUpdate.courses[0].course_name === "DATA MINING", "Course 1 harus DATA MINING");

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runReminderGeneratorTests();
