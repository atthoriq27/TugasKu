import { WhatsAppMessageRouter } from '../src/lib/whatsapp-message-router.js';

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

async function runRoutingFixTests() {
  console.log("=== PHASE 7.1 MESSAGE ROUTING & DESTINATION FIX TESTS ===\n");

  const router = new WhatsAppMessageRouter();

  const mockReminderPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 2,
    meeting: 2,
    candidates: [
      { nim: "001", nama_mahasiswa: "Ahmad", phone: "62811111111", reason: ["BELUM_POSTTEST"] },
      { nim: "002", nama_mahasiswa: "Budi", phone: "62822222222", reason: ["FORUM_BELUM_MEMENUHI", "BELUM_POSTTEST"] },
      { nim: "003", nama_mahasiswa: "Cici", phone: null, reason: ["BELUM_POSTTEST"] }
    ]
  };

  const mockActivityPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 2,
    meeting: 2,
    deadline: "10 Agustus",
    activities: [
      { type: "FORUM_DISKUSI", title: "Forum Diskusi", status: "Tersedia" },
      { type: "PENUGASAN_TERSTRUKTUR", title: "Penugasan Terstruktur", status: "Tersedia" }
    ]
  };

  const mockAggregatedPayloads = [
    {
      course_id: "20252-04TPLE003-22TIF0162",
      course_name: "DATA MINING",
      meeting: 2,
      deadline: "10 Agustus",
      activities: [{ type: "FORUM_DISKUSI", title: "Forum Diskusi" }]
    },
    {
      course_id: "20252-04TPLE003-22TIF0213",
      course_name: "METODE NUMERIK",
      meeting: 2,
      deadline: "11 Agustus",
      activities: [{ type: "PENUGASAN_TERSTRUKTUR", title: "Tugas 1" }]
    }
  ];

  // Test 1: Reminder routing ke Course Group
  console.log("Test 1: Reminder routing ke Course Group");
  const routedReminder = router.routeReminder(mockReminderPayload);
  assert(routedReminder.destination === "COURSE_GROUP", "Reminder harus menuju COURSE_GROUP");
  assert(routedReminder.message.includes("GRUP DATA MINING"), "Header pesan harus menyebut GRUP DATA MINING");
  assert(routedReminder.message.includes("Week 2") && routedReminder.message.includes("Pertemuan 2"), "Format Week & Meeting tampil");
  assert(typeof router.routeMultiCourseReminder === "undefined", "routeMultiCourseReminder API sudah dihapus (tidak ke grup utama)");

  // Test 3: Task update khusus matkul ke Course Group
  console.log("\nTest 3: Task update khusus matkul ke Course Group");
  const routedCourseActivity = router.routeCourseActivityUpdate(mockActivityPayload);
  assert(routedCourseActivity.destination === "COURSE_GROUP", "Course update harus menuju COURSE_GROUP");
  assert(routedCourseActivity.message.includes("UPDATE TUGAS") && routedCourseActivity.message.includes("DATA MINING"), "Header harus UPDATE TUGAS — MATKUL");
  assert(routedCourseActivity.message.includes("Forum Diskusi"), "Terdapat Forum Diskusi");
  assert(routedCourseActivity.message.includes("Penugasan Terstruktur"), "Terdapat Penugasan Terstruktur");
  assert(routedCourseActivity.message.includes("10 Agustus"), "Mencantumkan Deadline");

  // Test 4: Aggregated task update ke Main Group
  console.log("\nTest 4: Aggregated task update ke Main Group");
  const routedMainActivity = router.routeMainGroupActivityUpdate(2, mockAggregatedPayloads);
  assert(routedMainActivity.destination === "MAIN_GROUP", "Aggregated update harus menuju MAIN_GROUP");
  assert(routedMainActivity.message.includes("UPDATE TUGAS KELAS"), "Header harus UPDATE TUGAS KELAS");
  assert(routedMainActivity.message.includes("DATA MINING"), "Berisi matkul 1");
  assert(routedMainActivity.message.includes("METODE NUMERIK"), "Berisi matkul 2");

  // Test 5: Mention extraction phone numbers
  console.log("\nTest 5: Mention extraction phone numbers");
  // Override mock config for this test
  router.studentsConfig = [
    { nim: "001", phone: "62811111111" },
    { nim: "002", phone: "62822222222" }
  ];
  const testReminderMentions = router.routeReminder(mockReminderPayload);
  assert(testReminderMentions.mentions.length === 2, "Hanya student yang memiliki nomor yang dimasukkan array mentions");
  assert(testReminderMentions.mentions.some(m => m.phone === "62811111111"), "Nomor phone harus benar sesuai config");
  assert(testReminderMentions.message.includes("@62811111111"), "Message template berisi format tag nomor");

  // Test 6: Missing Phone Warning
  console.log("\nTest 6: Missing Phone Warning");
  assert(testReminderMentions.message.includes("Cici"), "Student tanpa nomor tetap di-render dengan namanya");
  assert(!testReminderMentions.message.includes("@null"), "Tidak ada format @null");

  // Test 7: Empty activity rendering
  console.log("\nTest 7: Empty activity rendering");
  const emptyActivityPayload = { ...mockActivityPayload, activities: [] };
  const emptyActivity = router.routeCourseActivityUpdate(emptyActivityPayload);
  assert(emptyActivity === null, "Aktivitas tidak tersedia jangan dimunculkan");

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runRoutingFixTests();
