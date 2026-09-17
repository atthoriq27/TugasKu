import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { TugasKuPipelineOrchestrator } from "../src/lib/pipeline-orchestrator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runPipelineTests() {
  console.log("=== TUGASKU PIPELINE ORCHESTRATOR TESTS ===\n");

  // Create temporary test groups config
  const tempGroupsPath = path.join(__dirname, "temp-test-groups.json");
  fs.writeFileSync(tempGroupsPath, JSON.stringify({
    main: { name: "KELAS", groupId: "main@g.us" },
    courses: {
      "20252-04TPLE003-22TIF0213": {
        name: "METODE NUMERIK",
        groupId: "120363000000000000@g.us"
      }
    }
  }));

  try {
    const orchestrator = new TugasKuPipelineOrchestrator({
      forceOffline: true,
      groupsConfigPath: tempGroupsPath
    });

    // Test 1: Instantiation & Offline Detection
    console.log("Test 1: Orchestrator Instantiation");
    assert(orchestrator.isOfflineMode === true, "Orchestrator harus mendeteksi offline mode");
    assert(orchestrator.coreEngine !== null, "Core engine harus terinisialisasi");
    assert(orchestrator.reminderEngine !== null, "Reminder engine harus terinisialisasi");
    assert(orchestrator.router !== null, "Router harus terinisialisasi");

    // Test 2: Preview Mode
    console.log("\nTest 2: Pipeline Preview Mode");
    const previewRes = await orchestrator.processCourseMeeting({
      kodeCourse: "20252-04TPLE003-22TIF0213",
      kodeSection: "PERTEMUAN_1",
      week: 1,
      mode: "preview"
    });

    assert(previewRes.report !== null, "Report harus terbentuk");
    assert(previewRes.report.total_mahasiswa === 6, "Total mahasiswa harus 6");
    assert(previewRes.candidates.length === 4, "Kandidat reminder harus 4 mahasiswa");
    assert(previewRes.routedMessage !== null, "Pesan harus ter-route");
    assert(previewRes.routedMessage.destination === "COURSE_GROUP", "Tujuan harus COURSE_GROUP");
    assert(previewRes.routedMessage.group_id === "120363000000000000@g.us", "Group ID harus sesuai config");
    assert(previewRes.routedMessage.mentions.length === 2, "Harus memuat 2 kontak mahasiswa dengan phone valid");
    assert(previewRes.deliveryStatus.method === "PREVIEW_ONLY", "Delivery method harus PREVIEW_ONLY");
    assert(previewRes.deliveryStatus.sent === false, "Preview tidak boleh mengirim pesan");

    // Test 3: Dry-Run Mode with Configured Group
    console.log("\nTest 3: Pipeline Dry-Run Mode (Mock Adapter Delivery)");
    const dryRunRes = await orchestrator.processCourseMeeting({
      kodeCourse: "20252-04TPLE003-22TIF0213",
      kodeSection: "PERTEMUAN_1",
      week: 1,
      mode: "dry-run"
    });

    assert(dryRunRes.deliveryStatus.method === "DRY-RUN", "Delivery method harus DRY-RUN");
    assert(dryRunRes.deliveryStatus.sent === true, "Dry-run dengan mapped group harus sent: true");
    assert(dryRunRes.deliveryStatus.sendResult.success === true, "Send result success harus true");

    // Test 4: Dry-Run Mode without Mapped Group (Safety Mode)
    console.log("\nTest 4: Pipeline Safety Mode (Unmapped Course)");
    const unmappedRes = await orchestrator.processCourseMeeting({
      kodeCourse: "UNMAPPED_COURSE_123",
      kodeSection: "PERTEMUAN_1",
      week: 1,
      mode: "dry-run"
    });

    assert(unmappedRes.deliveryStatus.sent === false, "Unmapped course tidak boleh terkirim");
    assert(unmappedRes.deliveryStatus.warning.includes("Safety Mode"), "Harus memuat peringatan Safety Mode");

  } finally {
    if (fs.existsSync(tempGroupsPath)) {
      fs.unlinkSync(tempGroupsPath);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOTAL: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`${"=".repeat(60)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPipelineTests();
