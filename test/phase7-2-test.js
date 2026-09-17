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

async function runPhase7_2Tests() {
  console.log("=== PHASE 7.2: MESSAGING BUSINESS RULES TEST ===\n");
  const router = new WhatsAppMessageRouter();

  // MOCK DATA
  const mockStudents = [
    { nim: "241011401783", nama_mahasiswa: "AHMAD ZACKY", reason: ["BELUM_POSTTEST"] },
    { nim: "241011400000", nama_mahasiswa: "UNKNOWN", reason: ["FORUM_BELUM_MEMENUHI"] }
  ];

  const reminderPayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 4,
    meeting: 5,
    candidates: mockStudents
  };

  const courseUpdatePayload = {
    course_id: "20252-04TPLE003-22TIF0162",
    course_name: "DATA MINING",
    week: 4,
    meeting: 5,
    deadline: "Aktual dari MENTARI 2026-08-15 23:59 WIB",
    activities: [
      { type: "FORUM_DISKUSI", title: "Forum Diskusi", status: "Tersedia" },
      { type: "PENUGASAN_TERSTRUKTUR", title: "Penugasan Terstruktur", status: "Tersedia" }
    ]
  };

  const aggregatedPayloads = [
    courseUpdatePayload,
    {
      course_id: "20252-04TPLE003-22TIF0213",
      course_name: "METODE NUMERIK",
      meeting: 6,
      deadline: "Aktual dari MENTARI 2026-08-16 23:59 WIB",
      activities: [
        { type: "FORUM_DISKUSI", title: "Forum Diskusi", status: "Tersedia" }
      ]
    }
  ];

  // Test 1: Reminder Posttest hanya ke grup matkul (tidak pernah ke grup utama)
  console.log("Test 1: Reminder Posttest HANYA ke grup matkul");
  const routedReminder = router.routeReminder(reminderPayload);
  assert(routedReminder.destination === "COURSE_GROUP", "Routing harus ke COURSE_GROUP");
  assert(typeof router.routeMultiCourseReminder === "undefined", "API routing reminder multi-course tidak boleh ada");

  // Test 2: Update tugas ke grup utama (aggregated)
  console.log("\nTest 2: Update tugas aggregated ke grup utama");
  const aggregatedUpdate = router.routeMainGroupActivityUpdate(4, aggregatedPayloads);
  assert(aggregatedUpdate.destination === "MAIN_GROUP", "Routing update gabungan harus ke MAIN_GROUP");
  assert(!aggregatedUpdate.message.includes("BELUM_POSTTEST"), "Tidak boleh berisi reminder mahasiswa belum posttest");
  assert(aggregatedUpdate.message.includes("DATA MINING") && aggregatedUpdate.message.includes("METODE NUMERIK"), "Berisi agregasi semua course");

  // Test 3: Update tugas ke grup matkul
  console.log("\nTest 3: Update tugas ke grup matkul");
  const courseUpdate = router.routeCourseActivityUpdate(courseUpdatePayload);
  assert(courseUpdate.destination === "COURSE_GROUP", "Routing task update per matkul ke COURSE_GROUP");
  assert(courseUpdate.message.includes("UPDATE TUGAS — DATA MINING"), "Header format per matkul");
  
  // Test 4: Deadline menggunakan data aktual MENTARI
  console.log("\nTest 4: Deadline aktual MENTARI");
  assert(courseUpdate.message.includes("Aktual dari MENTARI 2026-08-15 23:59 WIB"), "Menggunakan deadline fallback MENTARI");

  // Test 5: Aktivitas yang tidak tersedia tidak ditampilkan
  console.log("\nTest 5: Aktivitas tidak tersedia disembunyikan");
  const noTaskPayload = {
    ...courseUpdatePayload,
    activities: [{ type: "FORUM_DISKUSI", title: "Forum Diskusi", status: "Tersedia" }]
  };
  const emptyTaskUpdate = router.routeCourseActivityUpdate(noTaskPayload);
  assert(!emptyTaskUpdate.message.includes("Penugasan Terstruktur"), "Penugasan yang tidak ada di array tidak di-render");

  // Test 6: Forum Diskusi & Penugasan Terstruktur tampil jika tersedia
  console.log("\nTest 6: Forum dan Penugasan tampil jika tersedia");
  assert(courseUpdate.message.includes("Forum Diskusi"), "Forum Diskusi dirender");
  assert(courseUpdate.message.includes("Penugasan Terstruktur"), "Penugasan Terstruktur dirender");

  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${'='.repeat(40)}`);

  if (testsFailed > 0) process.exit(1);
}

runPhase7_2Tests();
