import assert from "assert";
import { ContactManager } from "../src/lib/contact-manager.js";

const contactManager = new ContactManager();

console.log("=== DRAFT NAMES TOGGLE (DENGAN NAMA vs RINGKAS AWAL PEKAN) TESTS ===\n");

let passed = 0;

function check(desc, cond) {
  assert(cond, desc);
  console.log(`  ✓ [PASS] ${desc}`);
  passed++;
}

// 1. Simulasikan data scan course
const mockScanData = {
  kodeCourse: "20261_TRO",
  kodeSection: "PERTEMUAN_3",
  mataKuliah: "[3] TEKNIK RISET OPERASIONAL # 05TPLE003",
  hasActivity: true,
  forum: {
    available: true,
    needForumStudents: [
      { nim: "241011401354", nama_mahasiswa: "ATTHORIQ", is_revisi: false },
      { nim: "241011401355", nama_mahasiswa: "BUDI SANTOSO", is_revisi: false }
    ],
    belumMemenuhiCount: 2,
    topics: [
      { id: "1", judul: "Topik Linear Programming", reply_count: 5 },
      { id: "2", judul: "Topik Simplex Method", reply_count: 0 }
    ]
  },
  posttest: {
    available: true,
    pendingCount: 2,
    pendingStudents: [
      { nim: "241011401354", nama_mahasiswa: "ATTHORIQ", is_revisi: false },
      { nim: "241011401355", nama_mahasiswa: "BUDI SANTOSO", is_revisi: false }
    ]
  },
  assignment: {
    available: true,
    title: "Latihan Soal Simplex",
    is_private: false,
    pendingCount: 1,
    pendingStudents: [
      { nim: "241011401354", nama_mahasiswa: "ATTHORIQ", is_revisi: false }
    ]
  }
};

// 2. Logic format "Dengan Nama" (Full List)
function generateWithNames(data) {
  let txt = `> ${data.mataKuliah}\n*Pert. 3* • *Deadline: Jumat, 23:59 WIB*\n\n`;
  if (data.assignment?.available) {
    txt += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n• *Tugas:* ${data.assignment.title}\n\n`;
  }
  if (data.forum.needForumStudents.length > 0) {
    txt += `💬 *Forum Kurang (<2x reply) (${data.forum.needForumStudents.length}):*\n`;
    data.forum.needForumStudents.forEach((m, i) => {
      txt += `${i + 1}. ${contactManager.formatMention(m.nim, m.nama_mahasiswa)}\n`;
    });
    txt += `\n`;
  }
  if (data.posttest.pendingStudents.length > 0) {
    txt += `❌ *Belum Posttest (${data.posttest.pendingStudents.length}):*\n`;
    data.posttest.pendingStudents.forEach((m, i) => {
      txt += `${i + 1}. ${contactManager.formatMention(m.nim, m.nama_mahasiswa)}\n`;
    });
  }
  return txt;
}

// 3. Logic format "Ringkas (Awal Pekan)"
function generateSummary(data) {
  let txt = `> ${data.mataKuliah}\n*Pert. 3* • *Deadline: Jumat, 23:59 WIB*\n\n`;
  if (data.assignment?.available) {
    txt += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n• *Tugas:* ${data.assignment.title}\n\n`;
  }
  txt += `💬 *Forum Diskusi:* ${data.forum.needForumStudents.length} Mahasiswa belum memenuhi (<2x reply)\n\n`;
  txt += `📁 *Penugasan Terstruktur:* ${data.assignment.pendingCount} Mahasiswa belum mengumpulkan.\n\n`;
  txt += `❌ *Posttest:* ${data.posttest.pendingCount} Mahasiswa belum mengerjakan.\n\n`;
  txt += `⚠️ *Catatan Wajib:*\nFordis (2x) ➔ Penugasan Terstruktur ➔ Posttest ➔ Kuesioner (absensi valid)`;
  return txt;
}

const fullText = generateWithNames(mockScanData);
const summaryText = generateSummary(mockScanData);

// Validations
check("Mode Dengan Nama menyertakan nomor dan nama mahasiswa", fullText.includes("1. ") && fullText.includes("ATTHORIQ"));
check("Mode Dengan Nama menyertakan mahasiswa kedua", fullText.includes("2. ") && fullText.includes("BUDI SANTOSO"));

check("Mode Ringkas TIDAK menyertakan daftar nomor baris nama", !summaryText.includes("1. ") && !summaryText.includes("2. "));
check("Mode Ringkas TIDAK memuat nama spesifik mahasiswa", !summaryText.includes("BUDI SANTOSO"));
check("Mode Ringkas menampilkan jumlah ringkasan belum fordis", summaryText.includes("2 Mahasiswa belum memenuhi"));
check("Mode Ringkas menampilkan jumlah ringkasan belum posttest", summaryText.includes("2 Mahasiswa belum mengerjakan"));
check("Mode Ringkas menyertakan informasi penugasan terstruktur", summaryText.includes("Penugasan Terstruktur: ADA (Aktif)"));
check("Mode Ringkas menyertakan alur absensi valid", summaryText.includes("Fordis (2x) ➔ Penugasan Terstruktur"));

console.log(`\nAll ${passed} assertions passed successfully!`);
process.exit(0);
