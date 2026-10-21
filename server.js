import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MentariBrowserSession } from "./src/lib/mentari-browser-session.js";
import { BrowserMentariClient } from "./src/lib/browser-mentari-client.js";
import { TugasKuCoreEngine } from "./src/lib/core-engine.js";
import { ReminderEngine } from "./src/lib/reminder-engine.js";
import { ContactManager } from "./src/lib/contact-manager.js";
import { TelegramNotifier } from "./src/lib/telegram-notifier.js";
import { TelegramBot } from "./src/lib/telegram-bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const CONFIG_DIR = process.env.TUGASKU_CONFIG_DIR || path.join(__dirname, "config");
const DATA_DIR = process.env.TUGASKU_DATA_DIR || path.join(__dirname, "data");
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB limit

if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJsonBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;

    req.on("data", chunk => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        tooLarge = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Ukuran data terlalu besar (maksimum 2MB)." }));
        req.destroy();
        reject(new Error("PAYLOAD_TOO_LARGE"));
      }
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        const json = JSON.parse(body || "{}");
        resolve(json);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Format payload JSON tidak valid." }));
        reject(err);
      }
    });

    req.on("error", (err) => {
      if (!tooLarge) reject(err);
    });
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const sessionManager = new MentariBrowserSession({
  configDir: CONFIG_DIR,
  sessionDir: path.join(DATA_DIR, "mentari-session")
});
const reminderEngine = new ReminderEngine();
const contactManager = new ContactManager(path.join(CONFIG_DIR, "contacts.json"));
const telegramNotifier = new TelegramNotifier({
  configPath: path.join(CONFIG_DIR, "telegram.json")
});

// ── Auto-Reconnect Mutex & Helper ──────────────────────────────────────────
let isReconnecting = false;
let reconnectPromise = null;
let lastLoginTime = 0;
let serverSessionValid = true;

async function ensureActiveSession(force = false) {
  const current = sessionManager.getSession();
  const now = Date.now();

  // If not forced, reuse existing session
  if (!force && current && current.token) {
    return current;
  }

  if (reconnectPromise) {
    return reconnectPromise;
  }

  console.log("\n⚠️ Sesi MENTARI habis / belum aktif. Menjalankan pembaruan sesi otomatis...");
  isReconnecting = true;
  reconnectPromise = (async () => {
    try {
      const token = await sessionManager.loginInteractively({ force: true });
      lastLoginTime = Date.now();
      serverSessionValid = true;
      const updated = sessionManager.getSession();
      console.log("✅ Pembaruan sesi MENTARI berhasil!\n");
      return updated;
    } catch (err) {
      console.error("❌ Gagal memperbarui sesi otomatis:", err.message);
      throw err;
    } finally {
      isReconnecting = false;
      reconnectPromise = null;
    }
  })();

  return reconnectPromise;
}

// Shared scan-all helper (reused by API + bot)
async function runScanAll(weekVal) {
  await ensureActiveSession();
  const courses = getCourses();
  const scheduleData = getSchedule();
  const results = [];

  for (const course of courses) {
    const kel = course.kelompok || (course.coursename?.includes("[E-1]") || course.periode === "1" ? "1" : "2");
    const groupKey = kel === "2" ? "2" : "1";
    const sks = String(course.sks || (course.coursename?.startsWith("[3]") ? 3 : 2));
    const groupSchedule = scheduleData.groups?.[groupKey]?.schedule?.[weekVal] || {};
    const sksSchedule = groupSchedule[sks] || { luring: [], daring: [] };
    let daringMeetings = [...(sksSchedule.daring || [])];
    let luringMeetings = [...(sksSchedule.luring || [])];

    if (kel === "FULL_DARING") {
      daringMeetings = [...new Set([...daringMeetings, ...luringMeetings])];
      luringMeetings = [];
    } else if (kel === "FULL_LURING") {
      luringMeetings = [...new Set([...daringMeetings, ...luringMeetings])];
      daringMeetings = [];
    }

    const allMeetings = [...new Set([...daringMeetings, ...luringMeetings])];

    if (allMeetings.length === 0) {
      results.push({
        kodeCourse: course.kode_course,
        mataKuliah: course.nama_mata_kuliah || course.coursename,
        courseInfo: course,
        sks: parseInt(sks, 10),
        isLuring: true,
        isDaring: false,
        isOfflineWithTasks: false,
        luringMeetings,
        daringMeetings: [],
        hasAnyActivity: false,
        scannedMeetings: []
      });
      continue;
    }

    const scannedMeetings = [];
    let hasAnyActivity = false;
    for (const mNum of allMeetings) {
      if (mNum === "UTS" || mNum === "UAS") continue;
      const sec = `PERTEMUAN_${mNum}`;
      const isLuringMeeting = luringMeetings.includes(mNum) && !daringMeetings.includes(mNum);
      try {
        const resScan = await scanCourse(course.kode_course, sec);
        if (resScan.hasActivity) hasAnyActivity = true;
        scannedMeetings.push({ ...resScan, meetingNum: mNum, isLuringMeeting });
      } catch (err) {
        scannedMeetings.push({ kodeSection: sec, meetingNum: mNum, isLuringMeeting, error: err.message, hasActivity: false });
      }
    }

    const hasActiveTasks = scannedMeetings.some(m => m.hasActivity);
    const isKombinasi = luringMeetings.length > 0 && daringMeetings.length > 0;
    const isOfflineWithTasks = daringMeetings.length === 0 && hasActiveTasks;

    results.push({
      kodeCourse: course.kode_course,
      mataKuliah: course.nama_mata_kuliah || course.coursename,
      courseInfo: course,
      sks: parseInt(sks, 10),
      isLuring: daringMeetings.length === 0 && !hasActiveTasks,
      isDaring: daringMeetings.length > 0 || hasActiveTasks,
      isKombinasi,
      isOfflineWithTasks,
      luringMeetings,
      daringMeetings,
      hasAnyActivity: hasActiveTasks,
      scannedMeetings
    });
  }
  return results;
}

const telegramBot = new TelegramBot({
  scanAllFn: runScanAll,
  sessionManager,
  contactManager,
});

function getCourses() {
  const coursesPath = path.join(CONFIG_DIR, "courses.json");
  let courses = [];
  if (fs.existsSync(coursesPath)) {
    try {
      courses = JSON.parse(fs.readFileSync(coursesPath, "utf-8"));
    } catch (e) {}
  }
  const settings = getClassSettings();
  const deadlines = settings.course_deadlines || {};
  return courses.map(c => {
    const custom = deadlines[c.kode_course] || {};
    const customSks = custom.sks;
    const customKelompok = custom.kelompok;
    return {
      ...c,
      sks: customSks !== undefined ? parseInt(customSks, 10) : (c.sks || (c.coursename?.startsWith("[3]") ? 3 : 2)),
      kelompok: customKelompok !== undefined && customKelompok !== ""
        ? String(customKelompok)
        : (c.kelompok || String(c.id_periode || c.periode || "") || (c.coursename?.includes("[E-2]") ? "2" : "1"))
    };
  });
}

function getSchedule() {
  const schedulePath = path.join(CONFIG_DIR, "schedule.json");
  if (fs.existsSync(schedulePath)) {
    try {
      return JSON.parse(fs.readFileSync(schedulePath, "utf-8"));
    } catch (e) {}
  }
  return {};
}

const DEFAULT_CLASS_SETTINGS = {
  class_name: "05TPLE003",
  user_custom_name: "",
  excluded_nims: [],
  academic_year: "2026/2027",
  semester: "20261",
  deadline_day: "Jumat",
  deadline_time: "23:59 WIB",
  course_deadlines: {},
  mention_format: "phone_name", // "phone_name" | "name_only" | "clean_name"
  semester_start_date: "2026-08-31",
  templates: {
    grup_utama: "*📢 REKAP TUGAS MENTARI*\n*Kelas {NAMA_KELAS}* • _{PEKAN}_\n\n{LIST_MATKUL_DARING}\n{LIST_FORDIS_BELUM_BUKA}\n⚠️ *Alur Absensi Valid:*\nFordis (min 2x) ➔ Posttest ➔ Kuesioner",
    grup_matkul: "> {NAMA_MATKUL}\n*{PERTEMUAN}* • *Deadline: {DEADLINE}*\n\n{DETAIL_TUGAS}\n\n⚠️ *Catatan Wajib:*\nFordis (2x) ➔ Posttest ➔ Kuesioner (absensi valid)"
  },
  weeks: {
    "1": "Pekan 1 (31 Agt - 5 Sep 2026)",
    "2": "Pekan 2 (7 Sep - 12 Sep 2026)",
    "3": "Pekan 3 (14 Sep - 19 Sep 2026)",
    "4": "Pekan 4 (21 Sep - 26 Sep 2026)",
    "5": "Pekan 5 (28 Sep - 3 Okt 2026)",
    "6": "Pekan 6 (5 Okt - 10 Okt 2026)",
    "7": "Pekan 7 (12 Okt - 17 Okt 2026)",
    "UTS": "Pekan UTS (19 Okt - 24 Okt 2026)",
    "8": "Pekan 8 (26 Okt - 31 Okt 2026)",
    "9": "Pekan 9 (2 Nov - 7 Nov 2026)",
    "10": "Pekan 10 (9 Nov - 14 Nov 2026)",
    "11": "Pekan 11 (16 Nov - 21 Nov 2026)",
    "12": "Pekan 12 (23 Nov - 28 Nov 2026)",
    "13": "Pekan 13 (30 Nov - 5 Des 2026)",
    "14": "Pekan 14 (7 Des - 12 Des 2026)",
    "UAS": "Pekan UAS (14 Des - 19 Des 2026)"
  }
};

// Urutan kanonik pekan agar tidak acak di JSON
const CANONICAL_WEEK_ORDER = ["1", "2", "3", "4", "5", "6", "7", "UTS", "8", "9", "10", "11", "12", "13", "14", "UAS"];
function orderWeeks(weeksObj) {
  const result = {};
  CANONICAL_WEEK_ORDER.forEach(k => { if (k in weeksObj) result[k] = weeksObj[k]; });
  Object.keys(weeksObj).forEach(k => { if (!(k in result)) result[k] = weeksObj[k]; });
  return result;
}

function getClassSettings() {
  const p = path.join(CONFIG_DIR, "class-settings.json");
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      return {
        ...DEFAULT_CLASS_SETTINGS,
        ...data,
        templates: { ...DEFAULT_CLASS_SETTINGS.templates, ...(data.templates || {}) },
        weeks: { ...DEFAULT_CLASS_SETTINGS.weeks, ...(data.weeks || {}) }
      };
    } catch (e) {}
  }
  return DEFAULT_CLASS_SETTINGS;
}

function saveClassSettings(data) {
  const p = path.join(CONFIG_DIR, "class-settings.json");
  const current = getClassSettings();
  const mergedWeeks = orderWeeks({ ...current.weeks, ...(data.weeks || {}) });
  const merged = {
    ...current,
    ...data,
    mention_format: data.mention_format || current.mention_format || "phone_name",
    templates: { ...current.templates, ...(data.templates || {}) },
    weeks: mergedWeeks,
    course_deadlines: data.course_deadlines !== undefined ? data.course_deadlines : (current.course_deadlines || {})
  };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

async function scanCourse(kodeCourse, kodeSection = "PERTEMUAN_1") {
  // Demo Mode support (uses REAL class roster with sample task states - ZERO spam dummy names)
  if (kodeCourse.includes("20252")) {
    const contacts = contactManager.getContacts();
    const studentNims = Object.keys(contacts);

    const demoStudents = studentNims.map((nim, idx) => {
      const c = contacts[nim];
      const isRevisi = c.type === "REVISI";
      // Simulate first 4 pending
      const isPendingPost = idx < 4;
      const isPendingForum = idx < 3;
      const isPendingAsg = idx < 2;

      return {
        nim,
        nama_mahasiswa: c.nama,
        is_revisi: isRevisi,
        posttest_status: isPendingPost ? "BELUM_MENGERJAKAN" : "SUDAH_MENGERJAKAN",
        forum_reply_count: isPendingForum ? (idx === 0 ? 1 : 0) : 2,
        forum_status: isPendingForum ? (idx === 0 ? "BELUM_MEMENUHI" : "BELUM_MENGERJAKAN") : "MEMENUHI",
        assignment_status: isPendingAsg ? "BELUM_MENGUMPULKAN" : "SUDAH_MENGUMPULKAN",
        questionnaire_status: idx === 1 ? "BELUM_MENGISI" : "SUDAH_MENGISI"
      };
    });

    const pendingPostUtama = demoStudents.filter(m => m.posttest_status === "BELUM_MENGERJAKAN" && !m.is_revisi);
    const pendingPostRevisi = demoStudents.filter(m => m.posttest_status === "BELUM_MENGERJAKAN" && m.is_revisi);

    const needForumUtama = demoStudents.filter(m => m.forum_status !== "MEMENUHI" && !m.is_revisi);
    const needForumRevisi = demoStudents.filter(m => m.forum_status !== "MEMENUHI" && m.is_revisi);

    const pendingAsgUtama = demoStudents.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN" && !m.is_revisi);
    const pendingAsgRevisi = demoStudents.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN" && m.is_revisi);

    let demoWa = `*📢 UPDATE TUGAS MENTARI*\n`;
    const allNeedForum = [...needForumUtama, ...needForumRevisi];
    if (allNeedForum.length > 0) {
      demoWa += `💬 *Forum Diskusi Kurang (<2x) (${allNeedForum.length}):*\n`;
      allNeedForum.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        demoWa += `${i + 1}. ${contactManager.formatMention(m.nim, m.nama_mahasiswa)}${revTag}\n`;
      });
      demoWa += `\n`;
    }

    const allPendingPost = [...pendingPostUtama, ...pendingPostRevisi];
    if (allPendingPost.length > 0) {
      demoWa += `❌ *Belum Posttest (${allPendingPost.length}):*\n`;
      allPendingPost.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        demoWa += `${i + 1}. ${contactManager.formatMention(m.nim, m.nama_mahasiswa)}${revTag}\n`;
      });
      demoWa += `\n`;
    }

    const allPendingAsg = [...pendingAsgUtama, ...pendingAsgRevisi];
    if (allPendingAsg.length > 0) {
      demoWa += `📁 *Belum Penugasan Terstruktur (${allPendingAsg.length}):*\n`;
      allPendingAsg.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        demoWa += `${i + 1}. ${contactManager.formatMention(m.nim, m.nama_mahasiswa)}${revTag}\n`;
      });
      demoWa += `\n`;
    }

    demoWa += `⚠️ *Note:* Fordis (min 2x) ➔ Posttest ➔ Wajib isi Kuesioner penutup agar absensi valid!`;

    let demoWaSummary = `*📢 UPDATE TUGAS MENTARI*\n\n`;
    if (allNeedForum.length > 0) {
      demoWaSummary += `💬 *Forum Diskusi:* ${allNeedForum.length} Mahasiswa belum memenuhi (<2x reply)\n\n`;
    } else {
      demoWaSummary += `✅ *Forum Diskusi:* Seluruh mahasiswa sudah memenuhi minimal 2x reply.\n\n`;
    }
    if (allPendingAsg.length > 0) {
      demoWaSummary += `📁 *Penugasan Terstruktur:* ${allPendingAsg.length} Mahasiswa belum mengumpulkan\n\n`;
    }
    if (allPendingPost.length > 0) {
      demoWaSummary += `❌ *Posttest:* ${allPendingPost.length} Mahasiswa belum mengerjakan\n\n`;
    } else {
      demoWaSummary += `✅ *Posttest:* Seluruh mahasiswa sudah mengerjakan.\n\n`;
    }
    demoWaSummary += `⚠️ *Note:* Fordis (min 2x) ➔ Posttest ➔ Wajib isi Kuesioner penutup agar absensi valid!`;

    const totalMhs = demoStudents.length;
    const totalUtama = demoStudents.filter(m => !m.is_revisi).length;

    return {
      kodeCourse,
      kodeSection,
      mataKuliah: "[3] METODE NUMERIK # 04TPLE003 (Sabtu) [E-2]",
      totalMahasiswa: totalMhs,
      totalMahasiswaUtama: totalUtama,
      hasActivity: true,
      posttest: {
        available: true,
        doneCount: totalMhs - allPendingPost.length,
        pendingCount: allPendingPost.length,
        totalPendingCount: allPendingPost.length,
        percent: Math.round(((totalMhs - allPendingPost.length) / totalMhs) * 100),
        pendingStudents: allPendingPost,
        pendingRevisiStudents: pendingPostRevisi
      },
      forum: {
        available: true,
        memenuhiCount: totalMhs - allNeedForum.length,
        belumMemenuhiCount: allNeedForum.length,
        belumMengerjakanCount: 0,
        percent: Math.round(((totalMhs - allNeedForum.length) / totalMhs) * 100),
        needForumStudents: allNeedForum,
        needForumRevisiStudents: needForumRevisi
      },
      assignment: {
        available: true,
        title: "Penugasan Terstruktur Pertemuan 1",
        doneCount: totalMhs - allPendingAsg.length,
        pendingCount: allPendingAsg.length,
        totalPendingCount: allPendingAsg.length,
        percent: Math.round(((totalMhs - allPendingAsg.length) / totalMhs) * 100),
        pendingStudents: allPendingAsg,
        pendingRevisiStudents: pendingAsgRevisi
      },
      questionnaire: {
        available: true,
        is_done: true,
        title: "Kuesioner Pembelajaran"
      },
      students: demoStudents,
      waTemplate: demoWa,
      waTemplateSummary: demoWaSummary
    };
  }

  let session = sessionManager.getSession();
  if (!session || !session.token) {
    const err = new Error("Sesi MENTARI belum aktif atau telah habis.");
    err.code = "SESSION_EXPIRED";
    throw err;
  }

  let client = new BrowserMentariClient({ browserSession: sessionManager, headless: true });
  let coreEngine = new TugasKuCoreEngine({ mentariClient: client });
  
  let report = await coreEngine.generatePertemuanReport({ kodeCourse, kodeSection });

  let detail = report.mahasiswa_detail || [];
  // Filter mahasiswa yang sudah tidak lanjut / di-exclude oleh Komti
  detail = detail.filter(m => !contactManager.isExcluded(m.nim));
  detail.forEach(m => {
    contactManager.ensureContact(m.nim, m.nama_mahasiswa);
    m.is_revisi = !contactManager.isMainStudent(m.nim);
  });

  const posttestAvailable = report.aktivitas.posttest.available;
  const forumAvailable = report.aktivitas.forum.available;
  const assignmentAvailable = report.aktivitas.assignment?.available || false;
  const isAssignmentPrivate = report.aktivitas.assignment?.is_private || false;
  const hasActivity = posttestAvailable || forumAvailable || assignmentAvailable;

  const forumTopics = report.aktivitas.forum?.topics || [];
  const hasMultipleTopics = forumTopics.length > 1;

  const donePosttest = detail.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN");
  const pendingPosttestUtama = detail.filter(m => m.posttest_status === "BELUM_MENGERJAKAN" && !m.is_revisi);
  const pendingPosttestRevisi = detail.filter(m => m.posttest_status === "BELUM_MENGERJAKAN" && m.is_revisi);

  const forumMemenuhi = detail.filter(m => m.forum_status === "MEMENUHI");
  const forumBelumMemenuhi = detail.filter(m => m.forum_status === "BELUM_MEMENUHI");
  const forumBelumMengerjakan = detail.filter(m => m.forum_status === "BELUM_MENGERJAKAN");
  const needForumUtama = detail.filter(m => m.forum_status !== "MEMENUHI" && m.forum_status !== "NOT_AVAILABLE" && !m.is_revisi);
  const needForumRevisi = detail.filter(m => m.forum_status !== "MEMENUHI" && m.forum_status !== "NOT_AVAILABLE" && m.is_revisi);

  // Mahasiswa yang sudah reply tapi ada topik yang belum diisi (multi-topic attention)
  const needTopicUtama = detail.filter(m => m.forum_status === "MEMENUHI" && m.has_unanswered_topic && !m.is_revisi);
  const needTopicRevisi = detail.filter(m => m.forum_status === "MEMENUHI" && m.has_unanswered_topic && m.is_revisi);
  const allNeedTopic = [...needTopicUtama, ...needTopicRevisi];

  const doneAssignment = detail.filter(m => m.assignment_status === "SUDAH_MENGUMPULKAN");
  const pendingAssignmentUtama = isAssignmentPrivate ? [] : detail.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN" && !m.is_revisi);
  const pendingAssignmentRevisi = isAssignmentPrivate ? [] : detail.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN" && m.is_revisi);

  // Urutkan A-Z di masing-masing kelompok (UTAMA A-Z, disusul REVISI A-Z)
  const sortByName = (a, b) => (a.nama_mahasiswa || "").trim().localeCompare((b.nama_mahasiswa || "").trim(), "id");
  pendingPosttestUtama.sort(sortByName);
  pendingPosttestRevisi.sort(sortByName);
  needForumUtama.sort(sortByName);
  needForumRevisi.sort(sortByName);
  needTopicUtama.sort(sortByName);
  needTopicRevisi.sort(sortByName);
  allNeedTopic.sort(sortByName);
  pendingAssignmentUtama.sort(sortByName);
  pendingAssignmentRevisi.sort(sortByName);
  detail.sort((a, b) => {
    const revA = a.is_revisi ? 1 : 0;
    const revB = b.is_revisi ? 1 : 0;
    if (revA !== revB) return revA - revB;
    return sortByName(a, b);
  });

  const totalMhs = detail.length;
  const totalUtama = detail.filter(m => !m.is_revisi).length;
  const posttestPercent = totalMhs > 0 ? Math.round((donePosttest.length / totalMhs) * 100) : 0;
  const forumPercent = totalMhs > 0 ? Math.round((forumMemenuhi.length / totalMhs) * 100) : 0;
  const assignmentPercent = totalMhs > 0 ? Math.round((doneAssignment.length / totalMhs) * 100) : 0;

  // Build WhatsApp template text (Grup Matkul) - Clean Title with > without *
  const courseInfo = getCourses().find(c => c.kode_course === kodeCourse);
  const cleanMataKuliah = courseInfo?.nama_mata_kuliah || report.mata_kuliah?.replace(/^\[\d+\]\s*/, '').split('#')[0].trim();
  const cleanSection = kodeSection.replace(/^PERTEMUAN_/, "Pert. ");
  const classSettings = getClassSettings();
  const courseDeadlines = classSettings.course_deadlines || {};
  const cDeadline = courseDeadlines[kodeCourse];
  const deadlineDay = cDeadline?.day || classSettings.deadline_day || "Jumat";
  const deadlineTime = cDeadline?.time || classSettings.deadline_time || "23:59 WIB";
  const deadlineStr = `${deadlineDay}, ${deadlineTime}`;
  const isCustomDeadline = !!cDeadline;

  const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = DAYS_ID[new Date().getDay()];
  const isDeadlineToday = deadlineDay.trim().toLowerCase() === todayName.toLowerCase();
  const todayBadge = isDeadlineToday ? " 🚨 *[DEADLINE HARI INI]*" : "";

  const allPendingPost = [...pendingPosttestUtama, ...pendingPosttestRevisi];
  const allNeedForum = [...needForumUtama, ...needForumRevisi];
  const allPendingAsg = [...pendingAssignmentUtama, ...pendingAssignmentRevisi];
  const asgTitle = report.aktivitas.assignment?.title || "Penugasan Terstruktur";
  const formatMhs = (m) => contactManager.formatMention(m.nim, m.nama_mahasiswa, { mentionFormat: classSettings.mention_format });

  let waText = `> ${cleanMataKuliah}\n`;
  waText += `*${cleanSection}* • *Deadline: ${deadlineStr}*${todayBadge}\n\n`;

  if (!hasActivity || !forumAvailable) {
    // Fordis belum dibuka → jangan tampilkan list posttest, cukup satu catatan
    waText += `ℹ️ *Forum Diskusi belum dibuka dosen.*\nCatatan tugas akan muncul setelah fordis aktif.\n\n`;
    if (assignmentAvailable) {
      waText += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        waText += `• *Tugas:* ${asgTitle}\n`;
      }
      waText += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
    }
  } else {
    if (hasMultipleTopics) {
      waText += `📌 *Topik Diskusi Dosen (${forumTopics.length} Topik):*\n`;
      forumTopics.forEach((t, i) => {
        const replyTag = t.reply_count === 0 ? "*(⚠️ Baru/0 balasan)*" : `(${t.reply_count} balasan)`;
        waText += `${i + 1}. ${t.judul} ${replyTag}\n`;
      });
      waText += `\n`;
    }

    if (assignmentAvailable) {
      waText += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        waText += `• *Tugas:* ${asgTitle}\n`;
      }
      if (isAssignmentPrivate) {
        waText += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
      } else if (allPendingAsg.length === 0) {
        waText += `✅ _Seluruh mahasiswa sudah mengumpulkan tugas._\n\n`;
      } else {
        waText += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini (${allPendingAsg.length} mahasiswa belum mengumpulkan)._\n\n`;
      }
    }

    // Forum sudah dibuka → urutan: Fordis > Penugasan Terstruktur > Posttest
    if (allNeedForum.length > 0) {
      waText += `💬 *Forum Kurang (<2x reply) (${allNeedForum.length}):*\n`;
      allNeedForum.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        waText += `${i + 1}. ${formatMhs(m)}${revTag}\n`;
      });
      waText += `\n`;
    } else {
      waText += `✅ *Forum Diskusi:* Seluruh mahasiswa sudah memenuhi minimal 2x reply.\n\n`;
    }

    if (allNeedTopic.length > 0) {
      // Dapatkan nomor topik untuk setiap missing topic agar ringkas (Topik 1, Topik 2, dst)
      const getTopicLabel = (topicId) => {
        const idx = forumTopics.findIndex(t => t.id === topicId);
        return idx !== -1 ? `Topik ${idx + 1}` : "Topik Dosen";
      };

      // Cek apakah seluruh mahasiswa di list ini belum mengisi kumpulan topik yang persis sama
      const firstStudentMissingIds = (allNeedTopic[0].missing_topics || []).map(t => t.id).sort().join(",");
      const isAllSameMissing = allNeedTopic.every(m => (m.missing_topics || []).map(t => t.id).sort().join(",") === firstStudentMissingIds);

      if (isAllSameMissing && allNeedTopic[0].missing_topics?.length > 0) {
        const sameTopicLabels = allNeedTopic[0].missing_topics.map(t => getTopicLabel(t.id)).join(" & ");
        waText += `⚠️ *Sudah Reply tapi Belum Mengisi ${sameTopicLabels} (${allNeedTopic.length}):*\n`;
        allNeedTopic.forEach((m, i) => {
          const revTag = m.is_revisi ? " _(Revisi)_" : "";
          waText += `${i + 1}. ${formatMhs(m)}${revTag}\n`;
        });
      } else {
        waText += `⚠️ *Sudah Reply tapi Belum Semua Topik (${allNeedTopic.length}):*\n`;
        allNeedTopic.forEach((m, i) => {
          const revTag = m.is_revisi ? " _(Revisi)_" : "";
          const missingLabels = (m.missing_topics || []).map(t => getTopicLabel(t.id)).join(", ");
          waText += `${i + 1}. ${formatMhs(m)}${revTag} _(Belum ${missingLabels})_\n`;
        });
      }
      waText += `👉 _Mengingatkan teman-teman di atas untuk merespons topik diskusi yang belum diisi agar nilai tugas lengkap._\n\n`;
    }

    if (assignmentAvailable && !isAssignmentPrivate && allPendingAsg.length > 0) {
      waText += `📁 *Belum ${asgTitle} (${allPendingAsg.length}):*\n`;
      allPendingAsg.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        waText += `${i + 1}. ${formatMhs(m)}${revTag}\n`;
      });
      waText += `\n`;
    }

    if (posttestAvailable && allPendingPost.length > 0) {
      waText += `❌ *Belum Posttest (${allPendingPost.length}):*\n`;
      allPendingPost.forEach((m, i) => {
        const revTag = m.is_revisi ? " _(Revisi)_" : "";
        waText += `${i + 1}. ${formatMhs(m)}${revTag}\n`;
      });
      waText += `\n`;
    } else if (!posttestAvailable) {
      waText += `⚠️ *Posttest:* Belum dibuka dosen.\n\n`;
    } else {
      waText += `✅ *Posttest:* Seluruh mahasiswa sudah mengerjakan.\n\n`;
    }

    if (allPendingPost.length === 0 && allNeedForum.length === 0 && allNeedTopic.length === 0 && (!assignmentAvailable || (!isAssignmentPrivate && allPendingAsg.length === 0))) {
      waText += `🎉 *Semua tugas mahasiswa sudah lengkap!*\n\n`;
    }
  }

  const flowSteps = ["Fordis (2x)"];
  if (assignmentAvailable) flowSteps.push("Penugasan Terstruktur");
  flowSteps.push("Posttest", "Kuesioner (absensi valid)");
  waText += `⚠️ *Catatan Wajib:*\n${flowSteps.join(" ➔ ")}`;

  // Summary WhatsApp text (without student names - for early week updates)
  let waTextSummary = `> ${cleanMataKuliah}\n`;
  waTextSummary += `*${cleanSection}* • *Deadline: ${deadlineStr}*${todayBadge}\n\n`;

  if (!hasActivity || !forumAvailable) {
    waTextSummary += `ℹ️ *Forum Diskusi belum dibuka dosen.*\nCatatan tugas akan muncul setelah fordis aktif.\n\n`;
    if (assignmentAvailable) {
      waTextSummary += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        waTextSummary += `• *Tugas:* ${asgTitle}\n`;
      }
      waTextSummary += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
    }
  } else {
    if (hasMultipleTopics) {
      waTextSummary += `📌 *Topik Diskusi Dosen (${forumTopics.length} Topik):*\n`;
      forumTopics.forEach((t, i) => {
        const replyTag = t.reply_count === 0 ? "*(⚠️ Baru/0 balasan)*" : `(${t.reply_count} balasan)`;
        waTextSummary += `${i + 1}. ${t.judul} ${replyTag}\n`;
      });
      waTextSummary += `\n`;
    }

    if (assignmentAvailable) {
      waTextSummary += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        waTextSummary += `• *Tugas:* ${asgTitle}\n`;
      }
      if (isAssignmentPrivate) {
        waTextSummary += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
      } else if (allPendingAsg.length === 0) {
        waTextSummary += `✅ _Seluruh mahasiswa sudah mengumpulkan tugas._\n\n`;
      } else {
        waTextSummary += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini (${allPendingAsg.length} mahasiswa belum mengumpulkan)._\n\n`;
      }
    }

    if (allNeedForum.length > 0) {
      waTextSummary += `💬 *Forum Diskusi:* ${allNeedForum.length} Mahasiswa belum memenuhi (<2x reply)\n\n`;
    } else {
      waTextSummary += `✅ *Forum Diskusi:* Seluruh mahasiswa sudah memenuhi minimal 2x reply.\n\n`;
    }

    if (allNeedTopic.length > 0) {
      waTextSummary += `⚠️ *Topik Diskusi Belum Lengkap:* ${allNeedTopic.length} Mahasiswa belum mengisi seluruh topik dosen.\n\n`;
    }

    if (assignmentAvailable && !isAssignmentPrivate && allPendingAsg.length > 0) {
      waTextSummary += `📁 *Penugasan Terstruktur:* ${allPendingAsg.length} Mahasiswa belum mengumpulkan.\n\n`;
    }

    if (posttestAvailable && allPendingPost.length > 0) {
      waTextSummary += `❌ *Posttest:* ${allPendingPost.length} Mahasiswa belum mengerjakan.\n\n`;
    } else if (!posttestAvailable) {
      waTextSummary += `⚠️ *Posttest:* Belum dibuka dosen.\n\n`;
    } else {
      waTextSummary += `✅ *Posttest:* Seluruh mahasiswa sudah mengerjakan.\n\n`;
    }

    if (allPendingPost.length === 0 && allNeedForum.length === 0 && allNeedTopic.length === 0 && (!assignmentAvailable || (!isAssignmentPrivate && allPendingAsg.length === 0))) {
      waTextSummary += `🎉 *Semua tugas mahasiswa sudah lengkap!*\n\n`;
    }
  }

  waTextSummary += `⚠️ *Catatan Wajib:*\n${flowSteps.join(" ➔ ")}`;

  return {
    kodeCourse,
    kodeSection,
    mataKuliah: report.mata_kuliah,
    totalMahasiswa: totalMhs,
    totalMahasiswaUtama: totalUtama,
    hasActivity,
    posttest: {
      available: posttestAvailable,
      doneCount: donePosttest.length,
      pendingCount: allPendingPost.length,
      totalPendingCount: allPendingPost.length,
      percent: posttestPercent,
      pendingStudents: allPendingPost,
      pendingUtamaStudents: pendingPosttestUtama,
      pendingRevisiStudents: pendingPosttestRevisi
    },
    forum: {
      available: forumAvailable,
      hasMultipleTopics,
      topics: forumTopics,
      memenuhiCount: forumMemenuhi.length,
      belumMemenuhiCount: allNeedForum.length,
      belumMengerjakanCount: forumBelumMengerjakan.length,
      needTopicCount: allNeedTopic.length,
      needTopicStudents: allNeedTopic,
      percent: forumPercent,
      needForumStudents: allNeedForum,
      needForumUtamaStudents: needForumUtama,
      needForumRevisiStudents: needForumRevisi
    },
    assignment: {
      available: assignmentAvailable,
      is_private: isAssignmentPrivate,
      title: report.aktivitas.assignment?.title || "Penugasan Terstruktur",
      doneCount: doneAssignment.length,
      pendingCount: isAssignmentPrivate ? 0 : allPendingAsg.length,
      totalPendingCount: isAssignmentPrivate ? 0 : allPendingAsg.length,
      percent: assignmentPercent,
      pendingStudents: isAssignmentPrivate ? [] : allPendingAsg,
      pendingUtamaStudents: isAssignmentPrivate ? [] : pendingAssignmentUtama,
      pendingRevisiStudents: isAssignmentPrivate ? [] : pendingAssignmentRevisi
    },
    questionnaire: {
      available: !!report.aktivitas?.questionnaire?.available,
      is_done: !!report.aktivitas?.questionnaire?.is_done,
      title: report.aktivitas?.questionnaire?.title || "Kuesioner"
    },
    students: detail,
    deadline: {
      day: deadlineDay,
      time: deadlineTime,
      text: deadlineStr,
      isCustom: isCustomDeadline,
      isToday: isDeadlineToday
    },
    waTemplate: waText,
    waTemplateSummary: waTextSummary
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Security Headers & CORS
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Check Session Status
  if (pathname === "/api/session-status") {
    const session = sessionManager.getSession();
    const hasToken = !!(session && session.token);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      active: hasToken && serverSessionValid,
      updatedAt: session?.updatedAt || null,
      user: session?.user || null
    }));
    return;
  }

  // API: Test MENTARI Connection
  if (pathname === "/api/mentari/test-connection" || pathname === "/api/test-connection") {
    try {
      const result = await sessionManager.testConnection();
      res.writeHead(result.success ? 200 : (result.status || 500), { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, connected: false, error: err.message }));
    }
    return;
  }

  // API: Save Token Directly
  if (pathname === "/api/save-token" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const token = (json.token || "").trim();
        if (!token) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Token tidak boleh kosong." }));
          return;
        }

        const saved = sessionManager.saveSession({ token });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          message: "Token berhasil disimpan!",
          user: saved.user || null
        }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Get App Version & Changelog Info
  if (pathname === "/api/version") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      version: "1.2.1",
      name: "TugasKu",
      releaseDate: "2026-09-25",
      features: [
        "Auto-scan otomatis seketika saat membuka menu Rangkuman Pribadi",
        "Sakelar toggle opsi untuk menyembunyikan nomor HP (@628...) di draf WhatsApp",
        "Sakelar toggle opsi untuk mengubah format nomor urut (1, 2, 3) menjadi tanda bullet",
        "Auto-scan seketika saat berpindah mata kuliah di draf WhatsApp",
        "Ekspor CSV dengan nama file dan sheet Excel dinamis sesuai kelas"
      ]
    }));
    return;
  }

  // API: Logout & Clear Session
  if (pathname === "/api/logout" && req.method === "POST") {
    try {
      sessionManager.clearSession();
      serverSessionValid = false;
      console.log("🔒 Sesi MENTARI telah di-logout dan dibersihkan.");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Sesi berhasil dihapus. Silakan login kembali." }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Reconnect Interactive
  if (pathname === "/api/reconnect" && req.method === "POST") {
    try {
      console.log("🌐 Memicu pembaruan sesi MENTARI...");
      const updatedSession = await ensureActiveSession(true);

      // Otomatis sinkronkan mata kuliah dari akun MENTARI yang baru login
      let syncedCourses = [];
      let detectedClass = null;
      try {
        const browserClient = new BrowserMentariClient({ browserSession: sessionManager, headless: true });
        const resCourses = await browserClient.getUserCourses();
        if (resCourses && resCourses.data && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
          syncedCourses = resCourses.data;
          const coursesPath = path.join(CONFIG_DIR, "courses.json");
          fs.writeFileSync(coursesPath, JSON.stringify(syncedCourses, null, 2), "utf-8");
          console.log(`✅ Berhasil menyinkronkan ${syncedCourses.length} mata kuliah akun baru ke config/courses.json!`);

          detectedClass = syncedCourses[0]?.id_kelas;
          if (detectedClass) {
            const classSettings = getClassSettings();
            classSettings.class_name = detectedClass;
            saveClassSettings(classSettings);
            console.log(`✅ Kelas berhasil diperbarui otomatis ke: ${detectedClass}`);
          }
        }
      } catch (courseErr) {
        console.warn("Catatan: Gagal menyinkronkan mata kuliah otomatis:", courseErr.message);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        token: !!(updatedSession && updatedSession.token),
        user: updatedSession?.user || null,
        courses: syncedCourses,
        detectedClass
      }));
    } catch (err) {
      console.error("Gagal menyambungkan:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }


  if (pathname === "/api/courses") {
    const courses = getCourses();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ courses }));
    return;
  }

  if (pathname === "/api/schedule") {
    const schedule = getSchedule();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(schedule));
    return;
  }

  // API: Get Class Settings
  if (pathname === "/api/class-settings" && req.method === "GET") {
    const settings = getClassSettings();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, settings }));
    return;
  }

  // API: Save Class Settings
  if (pathname === "/api/class-settings" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const saved = saveClassSettings(json);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, settings: saved }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Update Single Course Deadline
  if (pathname === "/api/settings/course-deadline" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const { kode_course, day, time, sks, kelompok, reset } = json;
        if (!kode_course) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "kode_course wajib diisi." }));
          return;
        }

        const current = getClassSettings();
        const deadlines = { ...(current.course_deadlines || {}) };

        if (reset) {
          if (deadlines[kode_course]) {
            delete deadlines[kode_course].day;
            delete deadlines[kode_course].time;
            if (deadlines[kode_course].sks === undefined && deadlines[kode_course].kelompok === undefined) {
              delete deadlines[kode_course];
            }
          }
        } else {
          const prev = deadlines[kode_course] || {};
          deadlines[kode_course] = {
            day: day ? day.trim() : (prev.day || current.deadline_day || "Jumat"),
            time: time ? time.trim() : (prev.time || current.deadline_time || "23:59 WIB"),
            sks: sks !== undefined ? parseInt(sks, 10) : (prev.sks || 2),
            kelompok: kelompok !== undefined && kelompok !== "" ? String(kelompok).trim() : (prev.kelompok || "1")
          };
        }

        const saved = saveClassSettings({ course_deadlines: deadlines });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          course_deadlines: saved.course_deadlines,
          updated_course: kode_course,
          is_custom: !!saved.course_deadlines[kode_course]
        }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Update Course Deadlines in Bulk
  if (pathname === "/api/settings/course-deadlines/bulk" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const incoming = json.course_deadlines || {};
        const current = getClassSettings();
        const deadlines = { ...(current.course_deadlines || {}) };

        for (const [code, data] of Object.entries(incoming)) {
          const prev = deadlines[code] || {};
          deadlines[code] = {
            day: data.day ? data.day.trim() : (prev.day || current.deadline_day || "Jumat"),
            time: data.time ? data.time.trim() : (prev.time || current.deadline_time || "23:59 WIB"),
            sks: data.sks !== undefined ? parseInt(data.sks, 10) : (prev.sks || 2),
            kelompok: data.kelompok !== undefined ? String(data.kelompok) : (prev.kelompok || "1")
          };
        }

        const saved = saveClassSettings({ course_deadlines: deadlines });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, course_deadlines: saved.course_deadlines }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Auto Detect Class & Semester from MENTARI courses
  if (pathname === "/api/class-settings/auto-detect" && req.method === "POST") {
    try {
      const courses = getCourses();
      let detectedClass = "";
      let detectedSemester = "";

      // Look through courses for class name and semester
      for (const c of courses) {
        if (c.id_kelas && !detectedClass) detectedClass = c.id_kelas.trim();
        if (c.id_semester && !detectedSemester) detectedSemester = String(c.id_semester).trim();
        
        if (!detectedClass && c.coursename) {
          const m = c.coursename.match(/#\s*([0-9A-Za-z]+)/);
          if (m) detectedClass = m[1].trim();
        }
        if (!detectedSemester && c.kode_course) {
          const sem = c.kode_course.split("-")[0];
          if (sem && sem.length >= 5) detectedSemester = sem;
        }
      }

      if (!detectedClass) detectedClass = "05TPLE003";
      if (!detectedSemester) detectedSemester = "20261";

      const updated = saveClassSettings({
        class_name: detectedClass,
        semester: detectedSemester
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        detected: {
          class_name: detectedClass,
          semester: detectedSemester,
          courses_count: courses.length
        },
        settings: updated
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Get Contacts
  if (pathname === "/api/contacts" && req.method === "GET") {
    const contacts = contactManager.getContacts();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ contacts }));
    return;
  }

  // API: Save Contacts
  if (pathname === "/api/contacts" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        if (json.contacts) {
          const saved = contactManager.saveContacts(json.contacts);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, count: Object.keys(saved).length }));
        } else if (json.nim) {
          const updated = contactManager.updateContact(json.nim, json);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, contact: updated }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Data kontak tidak valid." }));
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Toggle Student Type (UTAMA <-> REVISI)
  if (pathname === "/api/contacts/toggle-type" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const nim = json.nim;
        if (!nim) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "NIM wajib diisi." }));
          return;
        }
        const updated = contactManager.toggleType(nim);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, contact: updated }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Delete / Exclude Contact (Tidak Lanjut Kuliah)
  if (pathname === "/api/contacts/delete" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const nim = json.nim;
        if (!nim) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "NIM wajib diisi." }));
          return;
        }
        const ok = contactManager.excludeStudent(nim);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: ok, excluded_nims: contactManager.getExcludedNims() }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Restore Contact
  if (pathname === "/api/contacts/restore" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const nim = json.nim;
        const nama = json.nama || "";
        if (!nim) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "NIM wajib diisi." }));
          return;
        }
        const ok = contactManager.restoreStudent(nim, nama);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: ok, contacts: contactManager.getContacts() }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Get Excluded Contacts
  if (pathname === "/api/contacts/excluded" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ excluded: contactManager.getExcludedNims() }));
    return;
  }

  // API: Telegram Config
  if (pathname === "/api/telegram/config" && req.method === "GET") {
    const cfg = telegramNotifier.getConfig();
    const maskedToken = cfg.bot_token ? `${cfg.bot_token.slice(0, 6)}...${cfg.bot_token.slice(-4)}` : "";
    const { bot_token, ...safeCfg } = cfg;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ...safeCfg,
      bot_token_masked: maskedToken,
      has_token: !!bot_token
    }));
    return;
  }

  if (pathname === "/api/telegram/config" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const json = JSON.parse(body || "{}");
        const prev = telegramNotifier.getConfig();
        const incomingToken = (json.bot_token || "").trim();
        // If incoming token is masked (contains "...") or omitted, preserve existing token
        const newBotToken = (incomingToken.includes("...") || !incomingToken)
          ? (incomingToken === "" ? "" : prev.bot_token)
          : incomingToken;
        const saved = telegramNotifier.saveConfig({ ...json, bot_token: newBotToken });
        const maskedToken = saved.bot_token ? `${saved.bot_token.slice(0, 6)}...${saved.bot_token.slice(-4)}` : "";
        const { bot_token, ...safeSaved } = saved;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, config: { ...safeSaved, bot_token_masked: maskedToken } }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Test Telegram
  if (pathname === "/api/telegram/test" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const json = JSON.parse(body || "{}");
        const token = json.bot_token;
        const chatId = json.chat_id;
        const result = await telegramNotifier.sendTestMessage(token, chatId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, result }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Send Rekap to Telegram
  if (pathname === "/api/telegram/send-rekap" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const json = JSON.parse(body || "{}");
        const text = json.text;
        if (!text) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Pesan tidak boleh kosong." }));
          return;
        }
        const cleanHtml = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\*(.*?)\*/g, "<b>$1</b>")
          .replace(/_(.*?)_/g, "<i>$1</i>");

        const result = await telegramNotifier.sendMessage(cleanHtml, { parse_mode: "HTML" });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, result }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Single Scan
  if (pathname === "/api/scan") {
    const courseId = parsedUrl.searchParams.get("course");
    const section = parsedUrl.searchParams.get("section") || "PERTEMUAN_1";

    if (!courseId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Parameter 'course' wajib diisi." }));
      return;
    }

    try {
      const result = await scanCourse(courseId, section);
      serverSessionValid = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      if (err.code === "SESSION_EXPIRED") {
        serverSessionValid = false;
      }
      const statusCode = err.code === "SESSION_EXPIRED" ? 401 : 500;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: err.message,
        code: err.code || "SCAN_ERROR"
      }));
    }
    return;
  }

  // API: Bot Status
  if (pathname === "/api/telegram/bot-status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ running: telegramBot.isRunning(), activeWeek: telegramBot._activeWeek }));
    return;
  }

  // API: Bot Start
  if (pathname === "/api/telegram/bot-start" && req.method === "POST") {
    telegramBot.start();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, running: telegramBot.isRunning() }));
    return;
  }

  // API: Bot Stop
  if (pathname === "/api/telegram/bot-stop" && req.method === "POST") {
    telegramBot.stop();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, running: false }));
    return;
  }

  // API: Bot Manual Trigger
  if (pathname === "/api/telegram/bot-trigger" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      const json = JSON.parse(body || "{}");
      const week = json.week || telegramBot._activeWeek;
      telegramBot.triggerScanAll(week).catch(err => console.error("Bot trigger error:", err.message));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: `Scan pekan ${week} dipicu ke Telegram.` }));
    });
    return;
  }

  // API: Scan All Courses (Smart Schedule Aware using UNPAM Reguler CS matrix)
  if (pathname === "/api/scan-all") {
    const weekVal = parsedUrl.searchParams.get("week") || "1";

    try {
      const results = await runScanAll(weekVal);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results, week: weekVal, scannedAt: new Date().toISOString() }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, "public", pathname === "/" ? "index.html" : pathname);
  
  const publicDir = path.join(__dirname, "public");
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Error: Port ${PORT} sedang digunakan oleh proses lain.`);
    console.error(`   Jalankan perintah ini di PowerShell untuk mematikan proses lama:`);
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
  } else {
    console.error("\n❌ Terjadi kesalahan server:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log("\n" + "=".repeat(70));
  console.log("             🌐 TUGASKU WEB DASHBOARD BERJALAN!");
  console.log("=".repeat(70));
  console.log(` Buka di browser Anda: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(" Tekan Ctrl + C untuk menghentikan server.");
  console.log("=".repeat(70) + "\n");

  // Auto-start Telegram Bot jika sudah dikonfigurasi
  const tgCfg = telegramNotifier.getConfig();
  if (tgCfg.bot_token && tgCfg.chat_id) {
    console.log("[TelegramBot] Konfigurasi ditemukan, memulai bot...");
    telegramBot.start();
  } else {
    console.log("[TelegramBot] Token/Chat ID belum diatur. Atur di dashboard > Bot Telegram.");
  }
});
