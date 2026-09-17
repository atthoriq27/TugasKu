import { WhatsAppMessageRouter } from '../src/lib/whatsapp-message-router.js';
import { WhatsAppMessageFormatter } from '../src/lib/whatsapp-message-formatter.js';

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

async function runWhatsAppIntegrationTests() {
  console.log("=== WHATSAPP INTEGRATION UNIT TESTS (REVISED 7.1) ===\n");

  const router = new WhatsAppMessageRouter();

  const mockStudents = [
    { nim: "001", nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] },
    { nim: "002", nama_mahasiswa: "Budi", reason: ["FORUM_BELUM_MEMENUHI", "BELUM_POSTTEST"] }
  ];

  const mockReminderPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 1,
    meeting: 1,
    candidates: mockStudents
  };

  const mockActivityPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 1,
    meeting: 1,
    deadline: "10 Agustus",
    activities: [{ type: "FORUM_DISKUSI", title: "Forum Diskusi", status: "Tersedia" }]
  };

  const mockAggregatedPayloads = [
    {
      course_id: "20252-04TPLE003-22TIF0162",
      course_name: "DATA MINING",
      meeting: 1,
      deadline: "10 Agustus",
      activities: [{ type: "FORUM_DISKUSI", title: "Forum Diskusi" }]
    }
  ];

  // Test 1: Main group mapping
  console.log("Test 1: Main group mapping");
  const mainGroupId = router.getMainGroupId();
  assert(mainGroupId === null || typeof mainGroupId === 'string', 'Main group ID harus null atau string');

  // Test 2: Course group mapping
  console.log("\nTest 2: Course group mapping");
  const courseGroupId = router.getCourseGroupId("20252-04TPLE003-22TIF0162");
  assert(courseGroupId === null || typeof courseGroupId === 'string', 'Course group ID harus null atau string');

  // Test 3: Single-course reminder routing
  console.log("\nTest 3: Single-course reminder routing");
  const singleReminder = router.routeReminder(mockReminderPayload);
  assert(singleReminder.destination === "COURSE_GROUP", 'Single reminder harus ke COURSE_GROUP');
  assert(singleReminder.message_type === "STUDENT_REMINDER", 'Type harus STUDENT_REMINDER');

  // Test 4: Single-course activity routing
  console.log("\nTest 4: Single-course activity routing");
  const singleActivity = router.routeCourseActivityUpdate(mockActivityPayload);
  assert(singleActivity.destination === "COURSE_GROUP", 'Single activity harus ke COURSE_GROUP');
  assert(singleActivity.message_type === "COURSE_ACTIVITY_UPDATE", 'Type harus COURSE_ACTIVITY_UPDATE');

  // Test 5: Multi-course activity routing
  console.log("\nTest 5: Multi-course activity routing");
  const multiActivity = router.routeMainGroupActivityUpdate(1, mockAggregatedPayloads);
  assert(multiActivity.destination === "MAIN_GROUP", 'Multi activity harus ke MAIN_GROUP');
  assert(multiActivity.message_type === "MAIN_GROUP_ACTIVITY_UPDATE", 'Type harus MAIN_GROUP_ACTIVITY_UPDATE');

  // Test 6: Message formatting (Student Reminder Detail)
  console.log("\nTest 6: Message formatting");
  assert(singleReminder.message.includes("DATA MINING"), "Message format valid: nama matkul");
  assert(singleReminder.message.includes("Posttest"), "Message format valid: reason mapped");

  // Test 7: Empty student list
  console.log("\nTest 7: Empty student list");
  const emptyReminder = router.routeReminder({ ...mockReminderPayload, candidates: [] });
  assert(emptyReminder === null, 'Empty reminder harus return null');

  // Test 8: Multiple reminder reasons
  console.log("\nTest 8: Multiple reminder reasons");
  assert(singleReminder.message.includes("Forum Diskusi"), "Reason array map concat valid");

  // Test 9: Mention data extraction
  console.log("\nTest 9: Mention data");
  assert(singleReminder.mentions.length === 0, "NIM yang tak terdaftar phone tak memiliki mention true payload");

  // Test 10: Missing group mapping
  console.log("\nTest 10: Missing group mapping");
  const unmappedReminder = router.routeReminder({ ...mockReminderPayload, course_id: "UNKNOWN" });
  assert(unmappedReminder.group_id === null, "Unmapped course harus return group_id null");

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runWhatsAppIntegrationTests();
