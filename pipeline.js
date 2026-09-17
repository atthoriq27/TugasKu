#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TugasKuPipelineOrchestrator } from "./src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to read .env file if present
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
                     TUGASKU PIPELINE RUNNER
======================================================================

Penggunaan:
  node pipeline.js [mode] [opsi]

Mode Eksekusi (pilih salah satu):
  --preview     : Tampilkan draf pesan & analisis tanpa mengirim
  --dry-run     : Simulasi transmisi menggunakan Mock WhatsApp Adapter
  --live        : Eksekusi pengiriman nyata ke WhatsApp Web (Playwright)

Opsi Tambahan:
  --course <id> : Kode Course MENTARI (default: env KODE_COURSE)
  --section <s> : Kode Pertemuan, misal: PERTEMUAN_1 (default: env KODE_SECTION)
  --week <num>  : Nomor minggu perkuliahan (default: 1)
  --offline     : Paksa penggunaan mock data lokal (tanpa akses API MENTARI)
  --help        : Tampilkan petunjuk bantuan ini

Contoh:
  node pipeline.js --preview
  node pipeline.js --dry-run --section PERTEMUAN_4
  node pipeline.js --live --course 20252-04TPLE003-22TIF0213
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    printHelp();
    return;
  }

  const isPreview = args.includes("--preview");
  const isDryRun = args.includes("--dry-run");
  const isLive = args.includes("--live");
  const forceOffline = args.includes("--offline");

  if (!isPreview && !isDryRun && !isLive) {
    console.error("\n[ERROR] Anda harus memilih mode: --preview, --dry-run, atau --live.\n");
    printHelp();
    process.exit(1);
  }

  const mode = isLive ? "live" : isDryRun ? "dry-run" : "preview";

  // Parse custom parameters
  const courseIdx = args.indexOf("--course");
  const kodeCourse = (courseIdx !== -1 && args[courseIdx + 1]) 
    ? args[courseIdx + 1] 
    : (process.env.KODE_COURSE || "20252-04TPLE003-22TIF0213");

  const sectionIdx = args.indexOf("--section");
  const kodeSection = (sectionIdx !== -1 && args[sectionIdx + 1])
    ? args[sectionIdx + 1]
    : (process.env.KODE_SECTION || "PERTEMUAN_1");

  const weekIdx = args.indexOf("--week");
  const week = (weekIdx !== -1 && parseInt(args[weekIdx + 1], 10))
    ? parseInt(args[weekIdx + 1], 10)
    : 1;

  console.log("\n" + "=".repeat(70));
  console.log("             TUGASKU END-TO-END PIPELINE");
  console.log("=".repeat(70));
  console.log(` Mode Eksekusi : ${mode.toUpperCase()}`);
  console.log(` Kode Course   : ${kodeCourse}`);
  console.log(` Pertemuan     : ${kodeSection}`);
  console.log(` Week          : ${week}`);
  console.log("=".repeat(70) + "\n");

  try {
    const orchestrator = new TugasKuPipelineOrchestrator({
      mentariToken: process.env.MENTARI_TOKEN,
      mentariCookie: process.env.MENTARI_COOKIE,
      mentariBaseUrl: process.env.MENTARI_BASE_URL,
      forceOffline
    });

    console.log(`[1/4] Sumber Data: ${orchestrator.isOfflineMode ? "LOKAL / OFFLINE FIXTURE" : "LIVE MENTARI API"}`);
    console.log(`[2/4] Menganalisis pertemuan & status mahasiswa...`);

    const result = await orchestrator.processCourseMeeting({
      kodeCourse,
      kodeSection,
      week,
      mode
    });

    const report = result.report;
    const detail = report.mahasiswa_detail || [];
    const donePosttest = detail.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN").length;
    const pendingPosttest = detail.filter(m => m.posttest_status === "BELUM_MENGERJAKAN").length;
    const forumMemenuhi = detail.filter(m => m.forum_status === "MEMENUHI").length;
    const forumBelum = detail.filter(m => m.forum_status !== "MEMENUHI").length;

    console.log(`\n--- HASIL ANALISIS ---`);
    console.log(`  Mata Kuliah     : ${report.mata_kuliah}`);
    console.log(`  Total Mahasiswa : ${report.total_mahasiswa}`);
    console.log(`  Sudah Posttest  : ${donePosttest} mahasiswa`);
    console.log(`  Belum Posttest  : ${pendingPosttest} mahasiswa`);
    console.log(`  Forum Memenuhi  : ${forumMemenuhi} mahasiswa (≥ 2 reply)`);
    console.log(`  Forum Belum     : ${forumBelum} mahasiswa`);

    console.log(`\n[3/4] Deteksi Kandidat Reminder: ${result.candidates.length} mahasiswa`);
    result.candidates.forEach((c, idx) => {
      console.log(`   ${idx + 1}. [${c.nim}] ${c.nama_mahasiswa} -> Alasan: ${c.reason.join(", ")}`);
    });

    if (result.routedMessage) {
      console.log(`\n[4/4] WhatsApp Message Payload:`);
      console.log(`  Tujuan       : ${result.routedMessage.destination}`);
      console.log(`  Target Group : ${result.routedMessage.group_id || "BELUM TERDAFTAR DI CONFIG (Safety Mode)"}`);
      console.log(`  Total Mention: ${result.routedMessage.mentions.length} kontak mahasiswa`);
      console.log(`\n--- FORMAT PESAN WHATSAPP ---`);
      console.log(result.routedMessage.message);
      console.log("-".repeat(70));
    }

    if (result.deliveryStatus) {
      console.log(`\nStatus Pengiriman:`);
      console.log(`  Metode  : ${result.deliveryStatus.method}`);
      console.log(`  Terkirim: ${result.deliveryStatus.sent ? "YA" : "TIDAK"}`);
      if (result.deliveryStatus.warning) {
        console.log(`  Catatan : ${result.deliveryStatus.warning}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("             PIPELINE COMPLETED SUCCESSFULLY");
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n[PIPELINE ERROR]:", error.message);
    process.exit(1);
  }
}

main();
