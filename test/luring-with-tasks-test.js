import assert from "assert";

console.log("=== TEST: OFFLINE COURSE WITH ACTIVE TASKS IN GRUP UTAMA ===\n");

let passed = 0;
function check(desc, cond) {
  assert(cond, desc);
  console.log(`  ✓ [PASS] ${desc}`);
  passed++;
}

// Simulasi data dari server scanAllResults untuk Pekan 3
// Dimana Pengolahan Citra Digital dijadwalkan luring (daringMeetings: []), tapi dosen mengirim fordis & posttest
const mockScanAllResults = [
  {
    kodeCourse: "20261-05TPLE003-22TIF0262",
    mataKuliah: "PENGOLAHAN CITRA DIGITAL",
    sks: 2,
    isLuring: false, // Updated: bukan pure luring karena ada tugas
    isDaring: true,
    isOfflineWithTasks: true,
    luringMeetings: [3],
    daringMeetings: [],
    hasAnyActivity: true,
    scannedMeetings: [
      {
        meetingNum: 3,
        kodeSection: "PERTEMUAN_3",
        hasActivity: true,
        forum: { available: true, needForumStudents: Array(38).fill({}) },
        posttest: { available: true, pendingCount: 38 },
        assignment: { available: false }
      }
    ]
  },
  {
    kodeCourse: "20261-05TPLE003-22TIF0272",
    mataKuliah: "TEKNIK RISET OPERASIONAL",
    sks: 2,
    isLuring: false,
    isDaring: true,
    luringMeetings: [],
    daringMeetings: [3],
    hasAnyActivity: true,
    scannedMeetings: [
      {
        meetingNum: 3,
        kodeSection: "PERTEMUAN_3",
        hasActivity: true,
        forum: { available: true, needForumStudents: Array(36).fill({}) },
        posttest: { available: true, pendingCount: 36 },
        assignment: { available: false }
      }
    ]
  },
  {
    // Contoh matkul offline murni yang dosennya benar-benar TIDAK membuat tugas di MENTARI
    kodeCourse: "20261-05TPLE003-22TIF0252",
    mataKuliah: "SISTEM INFORMASI MANAJEMEN",
    sks: 2,
    isLuring: true,
    isDaring: false,
    isOfflineWithTasks: false,
    luringMeetings: [3],
    daringMeetings: [],
    hasAnyActivity: false,
    scannedMeetings: [
      {
        meetingNum: 3,
        kodeSection: "PERTEMUAN_3",
        hasActivity: false,
        forum: { available: false },
        posttest: { available: false },
        assignment: { available: false }
      }
    ]
  },
  {
    // Contoh matkul daring yang fordisnya belum dibuka dosen tapi slot posttest sudah ada di MENTARI
    kodeCourse: "20261-05TPLE003-22TIF0283",
    mataKuliah: "PEMROGRAMAN WEB I",
    sks: 3,
    isLuring: false,
    isDaring: true,
    luringMeetings: [],
    daringMeetings: [4],
    hasAnyActivity: false,
    scannedMeetings: [
      {
        meetingNum: 4,
        kodeSection: "PERTEMUAN_4",
        hasActivity: false,
        forum: { available: false },
        posttest: { available: true, pendingCount: 37 },
        assignment: { available: false }
      }
    ]
  }
];

// Simulasi filtering logika renderGrupUtamaMessage
const activeDaringWithTasks = [];
const luringCourses = [];
const fordisBlumDibuka = [];

mockScanAllResults.forEach(res => {
  // Hanya matkul yang fordis-nya sudah dibuka dosen (atau ada penugasan terstruktur) yang ditongolin
  const activeMeetings = (res.scannedMeetings || []).filter(m => 
    m.forum?.available || m.assignment?.available
  );

  if (activeMeetings.length > 0) {
    activeDaringWithTasks.push({ ...res, activeMeetings });
    return;
  }

  const isScheduledDaring = (res.daringMeetings && res.daringMeetings.length > 0) || (res.isDaring && !res.isOfflineWithTasks && !res.isLuring);
  if (isScheduledDaring) {
    fordisBlumDibuka.push(res);
  } else {
    luringCourses.push(res);
  }
});

check("Pengolahan Citra Digital masuk ke activeDaringWithTasks", 
  activeDaringWithTasks.some(c => c.mataKuliah === "PENGOLAHAN CITRA DIGITAL")
);

check("Teknik Riset Operasional masuk ke activeDaringWithTasks", 
  activeDaringWithTasks.some(c => c.mataKuliah === "TEKNIK RISET OPERASIONAL")
);

check("Pemrograman Web I (hanya ada slot posttest, fordis belum buka) TIDAK ditongolin di activeDaringWithTasks",
  !activeDaringWithTasks.some(c => c.mataKuliah === "PEMROGRAMAN WEB I")
);

check("Pemrograman Web I masuk ke fordisBlumDibuka (Fordis Belum Dibuka Dosen)",
  fordisBlumDibuka.some(c => c.mataKuliah === "PEMROGRAMAN WEB I")
);

check("Sistem Informasi Manajemen (luring tanpa tugas) TIDAK masuk activeDaringWithTasks", 
  !activeDaringWithTasks.some(c => c.mataKuliah === "SISTEM INFORMASI MANAJEMEN")
);

check("Sistem Informasi Manajemen masuk ke luringCourses (kelas offline)", 
  luringCourses.some(c => c.mataKuliah === "SISTEM INFORMASI MANAJEMEN")
);

check("Sistem Informasi Manajemen TIDAK masuk fordisBlumDibuka", 
  !fordisBlumDibuka.some(c => c.mataKuliah === "SISTEM INFORMASI MANAJEMEN")
);

// Format draft grup utama
let listMatkulDaringStr = "";
activeDaringWithTasks.forEach(res => {
  listMatkulDaringStr += `> ${res.mataKuliah} (${res.sks} SKS)\n`;
  res.activeMeetings.forEach(m => {
    listMatkulDaringStr += `  • *Pertemuan ${m.meetingNum}:*\n`;
    if (m.forum?.available) {
      listMatkulDaringStr += `  - Fordis: ${m.forum.needForumStudents.length} Mahasiswa belum\n`;
    }
    if (m.posttest?.available) {
      listMatkulDaringStr += `  - Posttest: ${m.posttest.pendingCount} Mahasiswa belum\n`;
    }
  });
});

let listFordisBelumStr = "";
if (fordisBlumDibuka.length > 0) {
  listFordisBelumStr += "*Fordis Belum Dibuka Dosen:*\n";
  fordisBlumDibuka.forEach(res => {
    listFordisBelumStr += `> ${res.mataKuliah}\n`;
  });
}

check("Draft memuat PENGOLAHAN CITRA DIGITAL", listMatkulDaringStr.includes("PENGOLAHAN CITRA DIGITAL"));
check("Draft memuat rincian Fordis 38 Mahasiswa belum", listMatkulDaringStr.includes("Fordis: 38 Mahasiswa belum"));
check("Draft memuat rincian Posttest 38 Mahasiswa belum", listMatkulDaringStr.includes("Posttest: 38 Mahasiswa belum"));
check("Draft memuat daftar Fordis Belum Dibuka Dosen", listFordisBelumStr.includes("PEMROGRAMAN WEB I"));

console.log(`\nAll ${passed} assertions passed successfully!`);
process.exit(0);
