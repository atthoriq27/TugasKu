#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MentariBrowserSession } from "./src/lib/mentari-browser-session.js";
import { BrowserMentariClient } from "./src/lib/browser-mentari-client.js";
import { TugasKuCoreEngine } from "./src/lib/core-engine.js";
import { ReminderEngine } from "./src/lib/reminder-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load .env
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...vals] = trimmed.split("=");
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}

loadEnv();

function printHelp() {
  console.log(`
======================================================================
                  🎓 TUGASKU - MENTARI TASK SCANNER
======================================================================

Alat pemantau otomatis tugas & absensi MENTARI LMS UNPAM.

Perintah Utama:
  npm run login        : Buka browser, login sekali, sesi tersimpan otomatis!
  npm run scan         : Pindai tugas pertemuan aktif mata kuliah target
  npm run scan:all     : Pindai seluruh 8 mata kuliah aktif sekaligus
  npm run scan:courses : Tampilkan daftar 8 mata kuliah kelas Anda

Opsi Fleksibel:
  node scan.js --login           : Login interaktif via Google Chrome
  node scan.js --all             : Pindai semua mata kuliah
  node scan.js -c <kode_course>  : Pindai mata kuliah tertentu
  node scan.js -s PERTEMUAN_2    : Pindai pertemuan tertentu
  node scan.js --detail          : Tampilkan tabel detail seluruh mahasiswa
  node scan.js --export          : Simpan draf rekap ke file di folder ./output/
`);
}

async function runLogin() {
  const session = new MentariBrowserSession();
  const isForce = true;

  console.log(`\n======================================================================`);
  console.log(`   🌐 MEMBUKA JENDELA LOGIN MENTARI UNPAM...`);
  console.log(`======================================================================`);
  console.log(`Silakan selesaikan login dan verifikasi Cloudflare di jendela browser yang terbuka.\n`);

  try {
    const token = await session.loginInteractively({ force: isForce });
    if (token) {
      console.log("🔄 Menyinkronkan daftar mata kuliah aktif...");
      const browserClient = new BrowserMentariClient({ browserSession: session, headless: true });
      try {
        const res = await browserClient.getUserCourses();
        if (res && res.data && res.data.length > 0) {
          const coursesPath = path.join(__dirname, "config", "courses.json");
          fs.writeFileSync(coursesPath, JSON.stringify(res.data, null, 2), "utf-8");
          console.log(`✅ Berhasil menyinkronkan ${res.data.length} mata kuliah ke config/courses.json!`);
        }
      } catch (e) {
        console.log("Catatan: Daftar mata kuliah akan disinkronkan saat scan pertama.");
      }
      console.log("\n🚀 Sekarang Anda bisa langsung jalankan: npm run scan\n");
    }
  } catch (err) {
    console.error("❌ Gagal login:", err.message);
  }
}

async function listCourses() {
  const localCoursesPath = path.join(__dirname, "config", "courses.json");
  let courses = [];

  if (fs.existsSync(localCoursesPath)) {
    try {
      courses = JSON.parse(fs.readFileSync(localCoursesPath, "utf-8"));
    } catch (e) {}
  }

  if (courses.length === 0) {
    console.log("⚠️ Belum ada data mata kuliah lokal. Jalankan 'npm run login' terlebih dahulu.");
    return;
  }

  console.log(`\n📚 Daftar 8 Mata Kuliah Aktif Kelas Anda:\n`);
  console.log("-".repeat(95));
  console.log("No | Kode Course                 | SKS | Hari   | Mata Kuliah / Dosen");
  console.log("-".repeat(95));
  courses.forEach((c, i) => {
    const num = String(i + 1).padStart(2, " ");
    const kode = (c.kode_course || "").padEnd(27, " ");
    const sks = String(c.sks || "-").padStart(3, " ");
    const hari = (c.nama_hari || "-").padEnd(6, " ");
    const nama = c.nama_mata_kuliah || c.coursename;
    const dosen = c.nama_dosen ? ` (${c.nama_dosen})` : "";
    console.log(`${num} | ${kode} | ${sks} | ${hari} | ${nama}${dosen}`);
  });
  console.log("-".repeat(95) + "\n");
}

async function scanMeetingWithEngine({ client, kodeCourse, kodeSection, showDetail, exportReport }) {
  console.log(`\n🔍 Memindai ${kodeSection} [${kodeCourse}]...`);

  const coreEngine = new TugasKuCoreEngine({ mentariClient: client });
  const report = await coreEngine.generatePertemuanReport({ kodeCourse, kodeSection });
  const detail = report.mahasiswa_detail || [];

  const posttestAvailable = report.aktivitas.posttest.available;
  const forumAvailable = report.aktivitas.forum.available;

  const donePosttest = detail.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN");
  const pendingPosttest = detail.filter(m => m.posttest_status === "BELUM_MENGERJAKAN");
  
  const forumMemenuhi = detail.filter(m => m.forum_status === "MEMENUHI");
  const forumBelumMemenuhi = detail.filter(m => m.forum_status === "BELUM_MEMENUHI");
  const forumBelumMengerjakan = detail.filter(m => m.forum_status === "BELUM_MENGERJAKAN");

  const totalMhs = detail.length;
  const posttestPercent = totalMhs > 0 ? Math.round((donePosttest.length / totalMhs) * 100) : 0;
  const forumPercent = totalMhs > 0 ? Math.round((forumMemenuhi.length / totalMhs) * 100) : 0;

  console.log("\n" + "=".repeat(75));
  console.log(`  📖 MATA KULIAH : ${report.mata_kuliah}`);
  console.log(`  📍 PERTEMUAN   : ${kodeSection}`);
  console.log(`  👥 TOTAL MHS   : ${totalMhs} Mahasiswa`);
  console.log("=".repeat(75));

  console.log("\n📊 STATUS AKTIVITAS:");
  console.log(`  • Posttest     : ${posttestAvailable ? "TERSEDIA" : "TIDAK ADA"}`);
  if (posttestAvailable) {
    console.log(`    └ Selesai    : ${donePosttest.length}/${totalMhs} (${posttestPercent}%)`);
    console.log(`    └ Belum      : ${pendingPosttest.length} mahasiswa`);
  }

  console.log(`  • Forum Diskusi: ${forumAvailable ? "TERSEDIA" : "TIDAK ADA"}`);
  if (forumAvailable) {
    console.log(`    └ Memenuhi   : ${forumMemenuhi.length}/${totalMhs} (${forumPercent}%) [≥ 2 reply]`);
    console.log(`    └ 1x Reply   : ${forumBelumMemenuhi.length} mahasiswa (belum cukup)`);
    console.log(`    └ 0x Reply   : ${forumBelumMengerjakan.length} mahasiswa (belum buka/reply)`);
  }

  // Tampilkan tabel detail mahasiswa jika diminta
  if (showDetail) {
    console.log("\n📋 DAFTAR DETAIL MAHASISWA:");
    console.log("-".repeat(95));
    console.log("No | NIM          | Nama Mahasiswa                 | Posttest          | Reply | Forum Status");
    console.log("-".repeat(95));
    detail.forEach((m, idx) => {
      const no = String(idx + 1).padStart(2, " ");
      const nim = (m.nim || "").padEnd(12, " ");
      const nama = (m.nama_mahasiswa || "").substring(0, 30).padEnd(30, " ");
      const post = (m.posttest_status || "-").padEnd(17, " ");
      const reply = String(m.forum_reply_count ?? "-").padStart(5, " ");
      const fStatus = m.forum_status || "-";
      console.log(`${no} | ${nim} | ${nama} | ${post} | ${reply} | ${fStatus}`);
    });
    console.log("-".repeat(95));
  }

  // SUSUN FORMAT PESAN COPY-PASTE UNTUK WHATSAPP
  let waText = `*⚠️ PERINGATAN TUGAS MENTARI ⚠️*\n`;
  waText += `*${report.mata_kuliah}*\n`;
  waText += `_${kodeSection.replace(/_/g, " ")}_\n\n`;

  if (posttestAvailable && pendingPosttest.length > 0) {
    waText += `❌ *BELUM POSTTEST (${pendingPosttest.length} Mahasiswa):*\n`;
    pendingPosttest.forEach((m, i) => {
      waText += `${i + 1}. ${m.nama_mahasiswa}\n`;
    });
    waText += `\n`;
  }

  const needForum = detail.filter(m => m.forum_status !== "MEMENUHI" && m.forum_status !== "NOT_AVAILABLE");
  if (forumAvailable && needForum.length > 0) {
    waText += `❌ *FORUM BELUM MEMENUHI MINIMAL 2 REPLY (${needForum.length} Mahasiswa):*\n`;
    needForum.forEach((m, i) => {
      const infoReply = m.forum_reply_count === 1 ? "(baru 1x reply)" : "(belum reply)";
      waText += `${i + 1}. ${m.nama_mahasiswa} ${infoReply}\n`;
    });
    waText += `\n`;
  }

  if ((!posttestAvailable || pendingPosttest.length === 0) && (!forumAvailable || needForum.length === 0)) {
    waText += `🎉 *Luar biasa! Seluruh mahasiswa sudah menyelesaikan tugas & forum pertemuan ini!* 👏\n`;
  } else {
    waText += `_Mohon segera diselesaikan agar absensi pertemuan ini valid! Semangat!_ 💪`;
  }

  console.log("\n" + "=".repeat(75));
  console.log("📋 TEKS SIAP COPY-PASTE LANGSUNG KE WHATSAPP KELAS:");
  console.log("=".repeat(75));
  console.log(waText);
  console.log("=".repeat(75) + "\n");

  if (exportReport) {
    const outDir = path.join(__dirname, "output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const fileName = `rekap-${kodeSection}.txt`;
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, waText, "utf-8");
    console.log(`💾 Laporan berhasil disimpan ke: output/${fileName}\n`);
  }

  return { report, pendingPosttest, needForum };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  if (args.includes("--login")) {
    await runLogin();
    return;
  }

  if (args.includes("--list-courses") || args.includes("-l")) {
    await listCourses();
    return;
  }

  const sessionManager = new MentariBrowserSession();
  const session = sessionManager.getSession();

  const isScanAll = args.includes("--all") || args.includes("-a");
  const showDetail = args.includes("--detail") || args.includes("-d");
  const exportReport = args.includes("--export");

  // Determine client
  let client;
  if (!session || !session.token) {
    console.log("\n⚠️ Sesi login belum ditemukan.");
    console.log("👉 Silakan jalankan perintah ini sekali untuk login:");
    console.log("   npm run login\n");
    return;
  }

  client = new BrowserMentariClient({ browserSession: sessionManager, headless: true });

  const coursesPath = path.join(__dirname, "config", "courses.json");
  const availableCourses = fs.existsSync(coursesPath) 
    ? JSON.parse(fs.readFileSync(coursesPath, "utf-8")) 
    : [];

  const courseIdx = args.indexOf("--course") !== -1 ? args.indexOf("--course") : args.indexOf("-c");
  const defaultCourse = availableCourses[0]?.kode_course || "20261-05TPLE003-22TIF0243";
  const kodeCourse = (courseIdx !== -1 && args[courseIdx + 1])
    ? args[courseIdx + 1]
    : (process.env.KODE_COURSE || defaultCourse);

  const sectionIdx = args.indexOf("--section") !== -1 ? args.indexOf("--section") : args.indexOf("-s");
  const kodeSection = (sectionIdx !== -1 && args[sectionIdx + 1])
    ? args[sectionIdx + 1]
    : (process.env.KODE_SECTION || "PERTEMUAN_1");

  console.log("\n======================================================================");
  console.log("                   🎓 TUGASKU MENTARI SCANNER");
  console.log("======================================================================");

  if (isScanAll && availableCourses.length > 0) {
    console.log(`\n🚀 Memindai seluruh ${availableCourses.length} mata kuliah kelas Anda...\n`);
    for (const course of availableCourses) {
      try {
        await scanMeetingWithEngine({
          client,
          kodeCourse: course.kode_course,
          kodeSection,
          showDetail: false,
          exportReport
        });
      } catch (err) {
        console.warn(`[SKIP] ${course.nama_mata_kuliah}: ${err.message}`);
      }
    }
    console.log("\n✅ Selesai memindai seluruh mata kuliah!\n");
    return;
  }

  try {
    await scanMeetingWithEngine({
      client,
      kodeCourse,
      kodeSection,
      showDetail,
      exportReport
    });
  } catch (err) {
    console.error(`\n❌ Error saat pemindaian: ${err.message}`);
    console.log("💡 Jika sesi habis, silakan perbarui login dengan: npm run login\n");
  }
}

main();
