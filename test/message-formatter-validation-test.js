import { WhatsAppMessageFormatter } from '../src/lib/whatsapp-message-formatter.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`? FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`? PASS: ${message}`);
    testsPassed++;
  }
}

async function runMessageFormatterValidationTests() {
  console.log("=== MESSAGE FORMATTER VALIDATION TESTS (FIX #4) ===\n");

  // Test 1: Valid course activity format
  console.log("Test 1: Valid course activity format");
  const validPayload = {
    courseName: "DATA MINING",
    week: 1,
    meeting: 1,
    activities: [{ title: "Forum Diskusi", type: "FORUM" }],
    deadline: "10 Agustus"
  };
  const errors = WhatsAppMessageFormatter.validateCourseActivityPayload(
    validPayload.courseName,
    validPayload.week,
    validPayload.meeting,
    validPayload.activities,
    validPayload.deadline
  );
  assert(errors.length === 0, "Valid payload harus tidak ada error");

  // Test 2: Missing course name
  console.log("\nTest 2: Missing course name validation");
  const noCourseName = WhatsAppMessageFormatter.validateCourseActivityPayload(
    "",
    1,
    1,
    [{ title: "Forum" }],
    "10 Agustus"
  );
  assert(noCourseName.length > 0, "Empty courseName harus error");
  assert(noCourseName.some(e => e.includes("courseName")), "Error message harus mention courseName");

  // Test 3: Invalid week range
  console.log("\nTest 3: Invalid week range validation");
  const invalidWeek = WhatsAppMessageFormatter.validateCourseActivityPayload(
    "DATA MINING",
    17,  // Out of range
    1,
    [{ title: "Forum" }],
    "10 Agustus"
  );
  assert(invalidWeek.length > 0, "Week 17 harus error");
  assert(invalidWeek.some(e => e.includes("week")), "Error message harus mention week");

  // Test 4: Missing activities
  console.log("\nTest 4: Missing activities validation");
  const noActivities = WhatsAppMessageFormatter.validateCourseActivityPayload(
    "DATA MINING",
    1,
    1,
    [],  // Empty array
    "10 Agustus"
  );
  assert(noActivities.length > 0, "Empty activities harus error");
  assert(noActivities.some(e => e.includes("activities")), "Error message harus mention activities");

  // Test 5: Activity without title or type
  console.log("\nTest 5: Activity without title or type validation");
  const badActivity = WhatsAppMessageFormatter.validateCourseActivityPayload(
    "DATA MINING",
    1,
    1,
    [{ status: "Tersedia" }],  // No title or type
    "10 Agustus"
  );
  assert(badActivity.length > 0, "Activity tanpa title/type harus error");

  // Test 6: Format with valid data
  console.log("\nTest 6: Format course activity with valid data");
  const formatted = WhatsAppMessageFormatter.formatCourseActivityUpdate(
    "DATA MINING",
    1,
    1,
    [
      { title: "Forum Diskusi", status: "Tersedia" },
      { type: "PENUGASAN_TERSTRUKTUR" }
    ],
    "10 Agustus"
  );
  assert(formatted !== null, "Valid data harus format success");
  assert(formatted.includes("DATA MINING"), "Format harus include course name");
  assert(formatted.includes("Forum Diskusi"), "Format harus include activity title");
  assert(formatted.includes("PENUGASAN_TERSTRUKTUR"), "Format harus include activity type");
  assert(formatted.includes("10 Agustus"), "Format harus include deadline");

  // Test 7: Format with invalid course name (should return null)
  console.log("\nTest 7: Format with invalid course name");
  const invalidFormat = WhatsAppMessageFormatter.formatCourseActivityUpdate(
    "",
    1,
    1,
    [{ title: "Forum" }],
    "10 Agustus"
  );
  assert(invalidFormat === null, "Invalid courseName harus return null");

  // Test 8: Format with invalid week (should return null)
  console.log("\nTest 8: Format with invalid week");
  const invalidWeekFormat = WhatsAppMessageFormatter.formatCourseActivityUpdate(
    "DATA MINING",
    0,  // Invalid
    1,
    [{ title: "Forum" }],
    "10 Agustus"
  );
  assert(invalidWeekFormat === null, "Invalid week harus return null");

  // Test 9: validateActivityField helper
  console.log("\nTest 9: validateActivityField helper");
  assert(
    WhatsAppMessageFormatter.validateActivityField({ title: "Forum" }),
    "Activity dengan title harus valid"
  );
  assert(
    WhatsAppMessageFormatter.validateActivityField({ type: "FORUM" }),
    "Activity dengan type harus valid"
  );
  assert(
    !WhatsAppMessageFormatter.validateActivityField({ status: "OK" }),
    "Activity tanpa title/type harus invalid"
  );

  // Test 10: Format main group with invalid week
  console.log("\nTest 10: Format main group with invalid week");
  const mainGroupInvalid = WhatsAppMessageFormatter.formatMainGroupUpdate(
    20,  // Invalid week
    [{ course_name: "DATA MINING", activities: [] }]
  );
  assert(mainGroupInvalid === null, "Invalid week harus return null");

  // Test 11: Format main group with valid data
  console.log("\nTest 11: Format main group with valid data");
  const mainGroupValid = WhatsAppMessageFormatter.formatMainGroupUpdate(
    1,
    [
      {
        course_name: "DATA MINING",
        meeting: 1,
        activities: [{ title: "Forum" }],
        deadline: "10 Agustus"
      }
    ]
  );
  assert(mainGroupValid !== null, "Valid main group data harus format success");
  assert(mainGroupValid.includes("DATA MINING"), "Format harus include course name");

  // Test 12: Student reminder with missing course name
  console.log("\nTest 12: Student reminder with missing course name");
  const reminderBadCourse = WhatsAppMessageFormatter.formatStudentReminderDetail(
    { course_name: "" },  // Missing course_name
    [{ nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] }]
  );
  assert(reminderBadCourse === null, "Missing course_name harus return null");

  // Test 13: Student reminder with null metadata
  console.log("\nTest 13: Student reminder with null metadata");
  const reminderNullMeta = WhatsAppMessageFormatter.formatStudentReminderDetail(
    null,
    [{ nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] }]
  );
  assert(reminderNullMeta === null, "Null metadata harus return null");

  // Test 14: Student reminder with valid data
  console.log("\nTest 14: Student reminder with valid data");
  const reminderValid = WhatsAppMessageFormatter.formatStudentReminderDetail(
    { course_name: "DATA MINING", week: 1, meeting: 1 },
    [{ nama_mahasiswa: "Ahmad", reason: ["BELUM_POSTTEST"] }]
  );
  assert(reminderValid !== null, "Valid reminder data harus format success");
  assert(reminderValid.includes("DATA MINING"), "Format harus include course name");

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(60)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runMessageFormatterValidationTests();
