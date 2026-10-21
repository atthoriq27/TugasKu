/**
 * TugasKu Web Dashboard — Client Application
 * Real-time MENTARI monitoring, smart schedule, WhatsApp broadcasting & Telegram bot.
 */

// ── State Management ────────────────────────────────────────────────────────
let coursesList = [];
let scheduleData = null;
let classContacts = {};
let currentScanData = null;
let scanAllResults = null;
let currentStudentsList = [];
let countdownTimer = null;

let activeWaTab = "matkul"; // "matkul" | "utama"
let activeMiddleTab = "posttest"; // "posttest" | "forum" | "assignment" | "revisi"
let activeFilter = "ALL";
let currentSearchQuery = "";
let currentPage = 1;
const pageSize = Infinity; // Tampilkan semua mahasiswa tanpa pagination
let currentClassSettings = {
  class_name: "05TPLE003",
  user_custom_name: "",
  academic_year: "2026/2027",
  semester: "20261",
  deadline_day: "Jumat",
  deadline_time: "23:59 WIB",
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

let WEEK_NAMES = { ...currentClassSettings.weeks };

const WEEK_MEETINGS_BY_SKS = {
  "2": {
    "1": [1], "2": [2], "3": [3], "4": [4], "5": [5], "6": [6], "7": [7],
    "UTS": [8], "8": [8], "9": [9], "10": [10], "11": [11], "12": [12], "13": [13], "14": [14], "UAS": [14]
  },
  "3": {
    "1": [1], "2": [2, 3], "3": [4], "4": [5, 6], "5": [7], "6": [8, 9], "7": [10],
    "UTS": [10], "8": [11, 12], "9": [13], "10": [14, 15], "11": [16], "12": [17, 18], "13": [19], "14": [20, 21], "UAS": [21]
  },
  "4": {
    "1": [1, 2], "2": [3, 4], "3": [5, 6], "4": [7, 8], "5": [9, 10], "6": [11, 12], "7": [13, 14],
    "UTS": [14], "8": [15, 16], "9": [17, 18], "10": [19, 20], "11": [21, 22], "12": [23, 24], "13": [25, 26], "14": [27, 28], "UAS": [28]
  }
};

function getCurrentSemesterWeek(startDateStr = null) {
  const startStr = startDateStr || currentClassSettings?.semester_start_date || "2026-08-31";
  const start = new Date(startStr + "T00:00:00");
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  if (diffTime < 0) return "1";

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  const offsetToWeek = {
    0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7",
    7: "UTS", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", 14: "14",
    15: "UAS"
  };

  return offsetToWeek[diffWeeks] || (diffWeeks > 15 ? "UAS" : "1");
}

// ── DOM References ─────────────────────────────────────────────────────────
const btnMenuToggle = document.getElementById("btnMenuToggle");
const deadlineTitle = document.getElementById("deadlineTitle");
const deadlineCountdown = document.getElementById("deadlineCountdown");
const deadlinePill = document.getElementById("deadlinePill");
const statusDot = document.getElementById("statusDot");
const statusValText = document.getElementById("statusValText");
const userName = document.getElementById("userName");
const reconnectBanner = document.getElementById("reconnectBanner");

// Controls
const selectWeek = document.getElementById("selectWeek");

// Auto-select current active week immediately on script load
if (selectWeek) {
  selectWeek.value = getCurrentSemesterWeek();
}
const selectCourse = document.getElementById("selectCourse");
const selectSection = document.getElementById("selectSection");
const selectSectionMon = document.getElementById("selectSectionMon");
const badgeMode = document.getElementById("badgeMode");
const meetingBtnGroup = document.getElementById("meetingBtnGroup");
const infoRuangPill = document.getElementById("infoRuangPill");
const infoKelompokPill = document.getElementById("infoKelompokPill");

const btnScan = document.getElementById("btnScan");
const scanBtnText = document.getElementById("scanBtnText");
const btnScanAll = document.getElementById("btnScanAll");
const scanAllBtnText = document.getElementById("scanAllBtnText");
const btnRefreshScan = document.getElementById("btnRefreshScan");
const lastScanTime = document.getElementById("lastScanTime");

// Sidebar Info
const infoDosen = document.getElementById("infoDosen");
const infoHari = document.getElementById("infoHari");
const infoRuang = document.getElementById("infoRuang");
const infoKelompok = document.getElementById("infoKelompok");
const infoTotalUtama = document.getElementById("infoTotalUtama");
const numDonePost = document.getElementById("numDonePost");
const numPendingPost = document.getElementById("numPendingPost");

// Metrics
const metricPostRatio = document.getElementById("metricPostRatio");
const metricPostPct = document.getElementById("metricPostPct");
const progressPost = document.getElementById("progressPost");
const metricForumRatio = document.getElementById("metricForumRatio");
const metricForumPct = document.getElementById("metricForumPct");
const progressForum = document.getElementById("progressForum");
const metricAsgRatio = document.getElementById("metricAsgRatio");
const metricAsgPct = document.getElementById("metricAsgPct");
const progressAsg = document.getElementById("progressAsg");
const metricProblemCount = document.getElementById("metricProblemCount");
const metricProblemSub = document.getElementById("metricProblemSub");
const metricTotalUtama = document.getElementById("metricTotalUtama");

// Middle Tabbed Table
const tabAllMon = document.getElementById("tabAllMon");
const tabPendingPost = document.getElementById("tabPendingPost");
const tabDonePost = document.getElementById("tabDonePost");
const tabPendingForum = document.getElementById("tabPendingForum");
const tabDoneForum = document.getElementById("tabDoneForum");
const tabPendingAsg = document.getElementById("tabPendingAsg");
const tabCompleteMon = document.getElementById("tabCompleteMon");
const tabPendingRevisi = document.getElementById("tabPendingRevisi");
const tabCountAll = document.getElementById("tabCountAll");
const tabCountPost = document.getElementById("tabCountPost");
const tabCountDonePost = document.getElementById("tabCountDonePost");
const tabCountForum = document.getElementById("tabCountForum");
const tabCountDoneForum = document.getElementById("tabCountDoneForum");
const tabCountAsg = document.getElementById("tabCountAsg");
const tabCountComplete = document.getElementById("tabCountComplete");
const tabCountRevisi = document.getElementById("tabCountRevisi");
const middlePanelTitle = document.getElementById("middlePanelTitle");
const viewAllCount = document.getElementById("viewAllCount");
const middleTableBody = document.getElementById("middleTableBody");

// Draft Area
const tabMatkulBtn = document.getElementById("tabMatkulBtn");
const tabUtamaBtn = document.getElementById("tabUtamaBtn");
const waMessageContent = document.getElementById("waMessageContent");
const btnCopyWa = document.getElementById("btnCopyWa");
const btnSendWaToTelegram = document.getElementById("btnSendWaToTelegram");
const btnOpenWhatsAppDirect = document.getElementById("btnOpenWhatsAppDirect");
const btnNamesOn = document.getElementById("btnNamesOn");
const btnNamesOff = document.getElementById("btnNamesOff");
const draftNamesToggleGroup = document.getElementById("draftNamesToggleGroup");
let waIncludeStudentNames = localStorage.getItem("tugasku_draft_include_names") !== "false";
let waIncludePhoneNumbers = localStorage.getItem("tugasku_draft_include_phones") !== "false";
let waIncludeNumbering = localStorage.getItem("tugasku_draft_include_numbering") !== "false";

// Students Table & Filters
const searchStudent = document.getElementById("searchStudent");
const searchMasterStudent = document.getElementById("searchMasterStudent");
const btnOpenAddStudent = document.getElementById("btnOpenAddStudent");
const modalAddStudent = document.getElementById("modalAddStudent");
const btnCloseAddStudent = document.getElementById("btnCloseAddStudent");
const btnCancelAddStudent = document.getElementById("btnCancelAddStudent");
const btnSaveNewStudent = document.getElementById("btnSaveNewStudent");
const addStudentNim = document.getElementById("addStudentNim");
const addStudentName = document.getElementById("addStudentName");
const addStudentPhone = document.getElementById("addStudentPhone");
const addStudentType = document.getElementById("addStudentType");
let masterStudentSearchQuery = "";

const btnClearSearch = document.getElementById("btnClearSearch");
const filterChips = document.querySelectorAll(".chip");
const filterAllCount = document.getElementById("filterAllCount");
const filterPostCount = document.getElementById("filterPostCount");
const filterDonePostCount = document.getElementById("filterDonePostCount");
const filterForumCount = document.getElementById("filterForumCount");
const filterDoneForumCount = document.getElementById("filterDoneForumCount");
const filterAsgCount = document.getElementById("filterAsgCount");
const filterCompleteCount = document.getElementById("filterCompleteCount");
const tableStudentsBody = document.getElementById("tableStudentsBody");
const paginationInfo = document.getElementById("paginationInfo");
const paginationControls = document.getElementById("paginationControls");
const btnExportCsv = document.getElementById("btnExportCsv");
const btnCopySheet = document.getElementById("btnCopySheet");

// Unified Settings Modal
const btnOpenSettings = document.getElementById("btnOpenSettings");
const modalSettings = document.getElementById("modalSettings");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const btnCloseSettingsFooter = document.getElementById("btnCloseSettingsFooter");

// Topbar dynamic badges
const headerClassBadge = document.getElementById("headerClassBadge");
const headerUserClass = document.getElementById("headerUserClass");
const deadlineSub = document.getElementById("deadlineSub");

// Settings Modal Tabs
const tabBtnClassSettings = document.getElementById("tabBtnClassSettings");
const tabBtnDeadlineSettings = document.getElementById("tabBtnDeadlineSettings");
const tabBtnWeeksSettings = document.getElementById("tabBtnWeeksSettings");
const tabBtnTemplates = document.getElementById("tabBtnTemplates");
const tabBtnBot = document.getElementById("tabBtnBot");
const tabBtnContacts = document.getElementById("tabBtnContacts");
const tabBtnSchedule = document.getElementById("tabBtnSchedule");

// Settings Modal Panels
const panelTabClassSettings = document.getElementById("panelTabClassSettings");
const panelTabDeadlineSettings = document.getElementById("panelTabDeadlineSettings");
const panelTabWeeksSettings = document.getElementById("panelTabWeeksSettings");
const panelTabTemplates = document.getElementById("panelTabTemplates");
const panelTabBot = document.getElementById("panelTabBot");
const panelTabContacts = document.getElementById("panelTabContacts");
const panelTabSchedule = document.getElementById("panelTabSchedule");

// Class Profile Controls
const btnAutoDetectClass = document.getElementById("btnAutoDetectClass");
const txtAutoDetect = document.getElementById("txtAutoDetect");
const inputClassName = document.getElementById("inputClassName");
const inputSemesterCode = document.getElementById("inputSemesterCode");
const inputAcademicYear = document.getElementById("inputAcademicYear");
const inputStartDate = document.getElementById("inputStartDate");
const inputUserCustomName = document.getElementById("inputUserCustomName");
const btnUseMentariName = document.getElementById("btnUseMentariName");
const btnSaveClassProfile = document.getElementById("btnSaveClassProfile");

// Weeks & Deadline Controls
const selectDeadlineDay = document.getElementById("selectDeadlineDay");
const inputDeadlineTime = document.getElementById("inputDeadlineTime");
const btnRecalculateWeeks = document.getElementById("btnRecalculateWeeks");
const tableWeeksSettingsBody = document.getElementById("tableWeeksSettingsBody");
const btnSaveWeeksSettings = document.getElementById("btnSaveWeeksSettings");

// Template Editor Controls
const selectTemplateType = document.getElementById("selectTemplateType");
const btnResetTemplate = document.getElementById("btnResetTemplate");
const chipTagsList = document.getElementById("chipTagsList");
const txtTemplateEditor = document.getElementById("txtTemplateEditor");
const templateLivePreviewContent = document.getElementById("templateLivePreviewContent");
const btnSaveTemplates = document.getElementById("btnSaveTemplates");

// Course Deadline Controls
const pillCourseDeadline = document.getElementById("pillCourseDeadline");
const textCourseDeadline = document.getElementById("textCourseDeadline");
const modalQuickDeadline = document.getElementById("modalQuickDeadline");
const btnCloseQuickDeadline = document.getElementById("btnCloseQuickDeadline");
const btnCancelQuickDeadline = document.getElementById("btnCancelQuickDeadline");
const btnSaveQuickDeadline = document.getElementById("btnSaveQuickDeadline");
const btnResetQuickDeadline = document.getElementById("btnResetQuickDeadline");
const quickDeadlineCourseName = document.getElementById("quickDeadlineCourseName");
const quickDefaultDeadlineLabel = document.getElementById("quickDefaultDeadlineLabel");
const radioDeadlineDefault = document.getElementById("radioDeadlineDefault");
const radioDeadlineCustom = document.getElementById("radioDeadlineCustom");
const quickCustomDeadlineFields = document.getElementById("quickCustomDeadlineFields");
const quickDeadlineDay = document.getElementById("quickDeadlineDay");
const quickDeadlineTime = document.getElementById("quickDeadlineTime");
const tableCourseDeadlinesBody = document.getElementById("tableCourseDeadlinesBody");
const btnResetAllDeadlines = document.getElementById("btnResetAllDeadlines");

// Contacts Controls
const searchContactInput = document.getElementById("searchContactInput");
const btnAutoFormatAll = document.getElementById("btnAutoFormatAll");
const contactsListContainer = document.getElementById("contactsListContainer");
const btnSaveContacts = document.getElementById("btnSaveContacts");
const newStudentNim = document.getElementById("newStudentNim");
const newStudentName = document.getElementById("newStudentName");
const newStudentPhone = document.getElementById("newStudentPhone");
const btnAddNewStudent = document.getElementById("btnAddNewStudent");

// Telegram Bot Controls
const teleBotToken = document.getElementById("teleBotToken");
const teleChatId = document.getElementById("teleChatId");
const btnSaveTelegram = document.getElementById("btnSaveTelegram");
const btnTestTelegram = document.getElementById("btnTestTelegram");
const btnBotStart = document.getElementById("btnBotStart");
const btnBotStop = document.getElementById("btnBotStop");
const btnBotTrigger = document.getElementById("btnBotTrigger");
const botStatusDot = document.getElementById("botStatusDot");
const botStatusLabel = document.getElementById("botStatusLabel");
const botActiveWeekLabel = document.getElementById("botActiveWeekLabel");

// Sesi Controls
const btnModalReconnect = document.getElementById("btnModalReconnect");
const sessionStatusDetail = document.getElementById("sessionStatusDetail");
const btnBannerReconnect = document.getElementById("btnBannerReconnect");

// Toast
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// ── 1. Initialization ──────────────────────────────────────────────────────
async function init() {
  bindEvents();
  updateDraftNamesToggleUI();
  updateDraftNamesToggleVisibility();
  checkSessionStatus();

  try {
    const [cRes, sRes, cntRes, setRes] = await Promise.all([
      fetch("/api/courses"),
      fetch("/api/schedule"),
      fetch("/api/contacts"),
      fetch("/api/class-settings")
    ]);
    const cData = await cRes.json();
    coursesList = Array.isArray(cData) ? cData : (cData.courses || []);
    scheduleData = await sRes.json();
    const cntData = await cntRes.json();
    classContacts = cntData.contacts || cntData || {};

    // Inisialisasi daftar mahasiswa default dari database kontak kelas (37 mahasiswa)
    // Memastikan data mahasiswa selalu tampil instan tanpa menunggu scan online
    if ((!currentStudentsList || currentStudentsList.length === 0) && classContacts && Object.keys(classContacts).length > 0) {
      currentStudentsList = Object.keys(classContacts).map(nim => {
        const item = classContacts[nim] || {};
        return {
          nim,
          nama_mahasiswa: typeof item === "string" ? item : (item.nama || item.name || nim),
          is_revisi: item.type === "REVISI",
          posttest_status: "BELUM_MENGERJAKAN",
          forum_status: "BELUM_MENGERJAKAN",
          forum_reply_count: 0,
          assignment_status: "BELUM_MENGUMPULKAN"
        };
      });
      updateFilterCounts();
      filterAndRenderStudentsTable();
    }

    const setData = await setRes.json().catch(() => null);
    if (setData && setData.settings) {
      applyClassSettings(setData.settings);
    }

    // Auto-select pekan aktif sekarang saat pertama kali dibuka
    const activeWeekKey = getCurrentSemesterWeek();
    if (selectWeek && activeWeekKey) {
      selectWeek.value = activeWeekKey;
    }

    populateWeeksDropdown();
    populateCoursesDropdown();
    syncWithSchedule();
    renderScheduleView();
    startCountdown();
    loadTelegramConfig();

    // Auto perform scan on load
    performScan();
  } catch (err) {
    console.error("Gagal inisialisasi TugasKu:", err);
  }
}

// ── 2. Event Bindings ──────────────────────────────────────────────────────
function bindEvents() {
  // Hamburger Toggle
  if (btnMenuToggle) {
    btnMenuToggle.onclick = () => {
      document.body.classList.toggle("sidebar-collapsed");
    };
  }

  // Course & Schedule Selects
  selectCourse.onchange = () => {
    currentScanData = null; // Reset agar pill deadline hilang sampai scan baru selesai
    syncWithSchedule();
    startCountdown();
    updateWaPreview(); // Langsung perbarui preview WA ke mode pemindaian matkul baru
    performScan();
  };

  selectWeek.onchange = () => {
    currentScanData = null; // Reset agar pill deadline hilang sampai scan baru selesai
    scanAllResults = null;
    populateCoursesDropdown();
    syncWithSchedule();
    startCountdown();
    updateWaPreview();
    performScan();
  };

  if (selectSection) {
    selectSection.onchange = () => {
      if (selectSectionMon) selectSectionMon.value = selectSection.value;
      highlightActiveMeetingBtn(selectSection.value);
      updateWaPreview();
      performScan();
    };
  }

  if (selectSectionMon) {
    selectSectionMon.onchange = () => {
      if (selectSection) selectSection.value = selectSectionMon.value;
      highlightActiveMeetingBtn(selectSectionMon.value);
      updateWaPreview();
      performScan();
    };
  }

  // Inisialisasi styling dropdown modern (Pekan, Matkul, Pertemuan, dan seluruh Select)
  setupCustomDropdown(selectWeek);
  setupCustomDropdown(selectCourse);
  setupCustomDropdown(selectSection);
  setupCustomDropdown(selectSectionMon);
  initAllCustomDropdowns();

  if (btnScan) btnScan.onclick = performScan;
  if (btnScanAll) btnScanAll.onclick = performScanAll;
  if (btnRefreshScan) btnRefreshScan.onclick = performScan;

  // Middle Table Tabs
  if (tabAllMon) tabAllMon.onclick = () => switchMiddleTab("all");
  if (tabPendingPost) tabPendingPost.onclick = () => switchMiddleTab("posttest");
  if (tabDonePost) tabDonePost.onclick = () => switchMiddleTab("done_posttest");
  if (tabPendingForum) tabPendingForum.onclick = () => switchMiddleTab("forum");
  if (tabDoneForum) tabDoneForum.onclick = () => switchMiddleTab("done_forum");
  if (tabPendingAsg) tabPendingAsg.onclick = () => switchMiddleTab("assignment");
  if (tabCompleteMon) tabCompleteMon.onclick = () => switchMiddleTab("complete");
  if (tabPendingRevisi) tabPendingRevisi.onclick = () => switchMiddleTab("posttest");
  const tabStatusFordisDosen = document.getElementById("tabStatusFordisDosen");
  if (tabStatusFordisDosen) tabStatusFordisDosen.onclick = () => switchMiddleTab("status_fordis");

  // Master Data Mahasiswa controls
  if (btnOpenAddStudent) btnOpenAddStudent.onclick = openAddStudentModal;
  if (btnCloseAddStudent) btnCloseAddStudent.onclick = closeAddStudentModal;
  if (btnCancelAddStudent) btnCancelAddStudent.onclick = closeAddStudentModal;
  if (btnSaveNewStudent) btnSaveNewStudent.onclick = saveNewStudent;
  if (modalAddStudent) {
    modalAddStudent.onclick = (e) => {
      if (e.target === modalAddStudent) closeAddStudentModal();
    };
  }

  // Edit Student Modal handlers
  document.getElementById("btnCloseEditStudent")?.addEventListener("click", closeEditStudentModal);
  document.getElementById("btnCancelEditStudent")?.addEventListener("click", closeEditStudentModal);
  document.getElementById("btnSaveEditStudent")?.addEventListener("click", saveEditedStudent);
  const modalEditStudent = document.getElementById("modalEditStudent");
  if (modalEditStudent) {
    modalEditStudent.onclick = (e) => {
      if (e.target === modalEditStudent) closeEditStudentModal();
    };
  }
  if (searchMasterStudent) {
    searchMasterStudent.oninput = (e) => {
      masterStudentSearchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      filterAndRenderStudentsTable();
    };
  }

  document.getElementById("navStatusFordis")?.addEventListener("click", (e) => {
    e.preventDefault();
    setSidebarActive("navStatusFordis");
    openStatusFordisModal();
  });
  document.getElementById("btnCloseStatusFordis")?.addEventListener("click", closeStatusFordisModal);
  document.getElementById("btnCloseStatusFordisFooter")?.addEventListener("click", closeStatusFordisModal);
  document.getElementById("btnRefreshFordisStatus")?.addEventListener("click", refreshFordisStatusList);

  // ── Rangkuman Pribadi (Status Saya) ──────────────────────────────────────
  document.getElementById("navRangkumanPribadi")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("rangkuman");
  });
  document.getElementById("btnViewPersonalSummary")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("rangkuman");
  });
  document.getElementById("userPill")?.addEventListener("click", () => {
    switchMainView("rangkuman");
  });
  document.getElementById("btnClosePersonalSummary")?.addEventListener("click", closePersonalSummaryModal);
  document.getElementById("btnClosePersonalSummaryFooter")?.addEventListener("click", closePersonalSummaryModal);
  document.getElementById("btnRefreshPersonal")?.addEventListener("click", refreshPersonalSummary);
  document.getElementById("btnCopyPersonalSummary")?.addEventListener("click", copyPersonalSummaryChecklist);
  document.getElementById("selectPersonalStudent")?.addEventListener("change", (e) => {
    currentPersonalNim = e.target.value;
    renderPersonalSummaryTable();
  });
  document.getElementById("selectPersonalWeek")?.addEventListener("change", (e) => {
    if (selectWeek) selectWeek.value = e.target.value;
    scanAllResults = [];
    renderPersonalSummaryTable();
    refreshPersonalSummary();
  });

  // ── Multi-View Architecture Switcher ─────────────────────────────────────
  document.getElementById("btnViewDashboard")?.addEventListener("click", () => switchMainView("dashboard"));
  document.getElementById("btnViewSchedule")?.addEventListener("click", () => switchMainView("schedule"));
  document.getElementById("btnViewMonitoring")?.addEventListener("click", () => switchMainView("monitoring"));
  document.getElementById("btnViewStudents")?.addEventListener("click", () => switchMainView("students"));
  document.getElementById("btnQuickGoMonitoring")?.addEventListener("click", () => switchMainView("monitoring"));
  document.getElementById("btnViewAllPending")?.addEventListener("click", () => switchMainView("students"));
  document.getElementById("btnSchedOpenSettings")?.addEventListener("click", () => openSettings("schedule"));

  // Clickable Metric Cards on Dashboard to switch to Monitoring / Students
  document.getElementById("metricCardPost")?.addEventListener("click", () => {
    switchMainView("monitoring", activeMiddleTab === "posttest" ? "done_posttest" : "posttest");
  });
  document.getElementById("metricCardForum")?.addEventListener("click", () => {
    switchMainView("monitoring", activeMiddleTab === "forum" ? "done_forum" : "forum");
  });
  document.getElementById("metricCardAsg")?.addEventListener("click", () => {
    switchMainView("monitoring", "assignment");
  });
  document.getElementById("metricCardProblem")?.addEventListener("click", () => {
    switchMainView("monitoring", "posttest");
  });
  document.getElementById("metricCardTotal")?.addEventListener("click", () => {
    switchMainView("students");
  });

  // ── ACTIVE SIDEBAR HANDLERS (DYNAMIC MULTI-VIEW ROUTING) ──────────────────
  document.getElementById("navDashboard")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("dashboard");
    showToast("Menampilkan ringkasan Dashboard utama.");
  });

  document.getElementById("navJadwal")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("schedule");
    showToast("Menampilkan Jadwal & Direktori Mata Kuliah.");
  });

  document.getElementById("navBelumPosttest")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("monitoring", "posttest");
    showToast("Menampilkan daftar mahasiswa Belum Posttest.");
  });

  document.getElementById("navForumKurang")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("monitoring", "forum");
    showToast("Menampilkan daftar mahasiswa Forum Diskusi Kurang (<2x reply).");
  });

  document.getElementById("navBelumPenugasan")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("monitoring", "assignment");
    showToast("Menampilkan daftar mahasiswa Belum Penugasan Terstruktur.");
  });

  document.getElementById("navKirimTele")?.addEventListener("click", (e) => {
    e.preventDefault();
    sendCurrentWaToTelegram();
  });

  document.getElementById("navSalinDraft")?.addEventListener("click", (e) => {
    e.preventDefault();
    copyWaDraft();
    const box = document.getElementById("waMessageContent")?.parentElement;
    if (box) pulseElement(box);
  });

  document.getElementById("navDaftarMhs")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("students");
    showToast("Menampilkan daftar lengkap seluruh mahasiswa.");
  });

  document.getElementById("navExportData")?.addEventListener("click", (e) => {
    e.preventDefault();
    exportToCsv();
  });

  document.getElementById("navPengaturanWA")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchMainView("students");
    showToast("Menampilkan direktori Data Mahasiswa.");
  });

  document.getElementById("navPengaturanBot")?.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings("bot");
  });

  document.getElementById("navPengaturanJadwal")?.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings("schedule");
  });

  // Draft Tabs
  tabMatkulBtn.onclick = () => {
    activeWaTab = "matkul";
    tabMatkulBtn.classList.add("active");
    tabUtamaBtn.classList.remove("active");
    document.getElementById("tabTodayBtn")?.classList.remove("active");
    updateDraftNamesToggleVisibility();
    updateWaPreview();
  };

  tabUtamaBtn.onclick = () => {
    activeWaTab = "utama";
    tabUtamaBtn.classList.add("active");
    tabMatkulBtn.classList.remove("active");
    document.getElementById("tabTodayBtn")?.classList.remove("active");
    updateDraftNamesToggleVisibility();
    updateWaPreview();
  };

  const tabTodayBtn = document.getElementById("tabTodayBtn");
  if (tabTodayBtn) {
    tabTodayBtn.onclick = () => {
      activeWaTab = "today";
      tabTodayBtn.classList.add("active");
      tabMatkulBtn.classList.remove("active");
      tabUtamaBtn.classList.remove("active");
      updateDraftNamesToggleVisibility();
      updateWaPreview();
    };
  }

  // Draft Toggles (Tampilkan Nama, Nomor HP, Nomor Urut)
  const btnToggleNamesSwitch = document.getElementById("btnToggleNamesSwitch");
  if (btnToggleNamesSwitch) {
    btnToggleNamesSwitch.onclick = (e) => {
      e.stopPropagation();
      waIncludeStudentNames = !waIncludeStudentNames;
      localStorage.setItem("tugasku_draft_include_names", waIncludeStudentNames ? "true" : "false");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }
  document.getElementById("draftNamesToggleGroup")?.addEventListener("click", (e) => {
    if (e.target !== btnToggleNamesSwitch && !btnToggleNamesSwitch?.contains(e.target)) {
      btnToggleNamesSwitch?.click();
    }
  });

  const btnTogglePhoneSwitch = document.getElementById("btnTogglePhoneSwitch");
  if (btnTogglePhoneSwitch) {
    btnTogglePhoneSwitch.onclick = (e) => {
      e.stopPropagation();
      waIncludePhoneNumbers = !waIncludePhoneNumbers;
      localStorage.setItem("tugasku_draft_include_phones", waIncludePhoneNumbers ? "true" : "false");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }
  document.getElementById("draftPhoneToggleGroup")?.addEventListener("click", (e) => {
    if (e.target !== btnTogglePhoneSwitch && !btnTogglePhoneSwitch?.contains(e.target)) {
      btnTogglePhoneSwitch?.click();
    }
  });

  const btnToggleNumberingSwitch = document.getElementById("btnToggleNumberingSwitch");
  if (btnToggleNumberingSwitch) {
    btnToggleNumberingSwitch.onclick = (e) => {
      e.stopPropagation();
      waIncludeNumbering = !waIncludeNumbering;
      localStorage.setItem("tugasku_draft_include_numbering", waIncludeNumbering ? "true" : "false");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }
  document.getElementById("draftNumberingToggleGroup")?.addEventListener("click", (e) => {
    if (e.target !== btnToggleNumberingSwitch && !btnToggleNumberingSwitch?.contains(e.target)) {
      btnToggleNumberingSwitch?.click();
    }
  });

  if (btnNamesOn) {
    btnNamesOn.onclick = () => {
      waIncludeStudentNames = true;
      localStorage.setItem("tugasku_draft_include_names", "true");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }

  if (btnNamesOff) {
    btnNamesOff.onclick = () => {
      waIncludeStudentNames = false;
      localStorage.setItem("tugasku_draft_include_names", "false");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }

  const selectDraft = document.getElementById("selectDraftIncludeNames");
  if (selectDraft) {
    selectDraft.onchange = (e) => {
      waIncludeStudentNames = e.target.value === "true";
      localStorage.setItem("tugasku_draft_include_names", waIncludeStudentNames ? "true" : "false");
      updateDraftNamesToggleUI();
      updateWaPreview();
    };
  }

  btnCopyWa.onclick = copyWaDraft;
  btnSendWaToTelegram.onclick = sendCurrentWaToTelegram;
  btnOpenWhatsAppDirect.onclick = openWhatsAppDirect;

  // Search & Filters
  if (searchStudent) {
    searchStudent.oninput = (e) => {
      renderMiddleTable(activeMiddleTab);
    };
  }

  const searchStudentFull = document.getElementById("searchStudentFull");
  if (searchStudentFull) {
    searchStudentFull.oninput = (e) => {
      masterStudentSearchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      filterAndRenderStudentsTable();
    };
  }

  document.querySelectorAll(".student-tab-btn").forEach(btn => {
    btn.onclick = () => {
      setActiveFilter(btn.dataset.filter);
    };
  });

  if (btnClearSearch) {
    btnClearSearch.onclick = () => {
      if (searchStudent) searchStudent.value = "";
      if (searchMasterStudent) searchMasterStudent.value = "";
      masterStudentSearchQuery = "";
      btnClearSearch.classList.add("hidden");
      currentPage = 1;
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
    };
  }

  filterChips.forEach(chip => {
    chip.onclick = () => {
      setActiveFilter(chip.dataset.filter);
    };
  });

  btnExportCsv.onclick = exportToCsv;
  btnCopySheet.onclick = copyForGoogleSheets;

  // Tes Koneksi MENTARI Langsung
  const btnTestMentariConn = document.getElementById("btnTestMentariConn");
  if (btnTestMentariConn) {
    btnTestMentariConn.onclick = async () => {
      btnTestMentariConn.disabled = true;
      btnTestMentariConn.textContent = "⚡ Menguji...";
      try {
        const res = await fetch("/api/mentari/test-connection");
        const data = await res.json();
        if (data.success && data.connected) {
          showToast(`⚡ Koneksi MENTARI Aktif! ${data.user?.fullname ? 'User: ' + data.user.fullname : ''}`);
          if (sessionStatusDetail) {
            sessionStatusDetail.textContent = "Online (Aktif)";
            sessionStatusDetail.className = "pill-badge pill-green";
            sessionStatusDetail.style.color = "";
          }
        } else {
          showToast(`⚠️ Status MENTARI: ${data.error || 'Belum terhubung. Silakan login atau paste token.'}`);
          if (sessionStatusDetail) {
            sessionStatusDetail.textContent = "Offline (Perlu Login / Token)";
            sessionStatusDetail.className = "pill-badge pill-red";
            sessionStatusDetail.style.color = "";
          }
        }
      } catch (err) {
        showToast(`Error: ${err.message}`);
      } finally {
        btnTestMentariConn.disabled = false;
        btnTestMentariConn.textContent = "⚡ Tes Koneksi";
      }
    };
  }

  // Simpan Token MENTARI Manual Bebas Cloudflare
  const btnSaveManualToken = document.getElementById("btnSaveManualToken");
  const inputManualMentariToken = document.getElementById("inputManualMentariToken");
  if (btnSaveManualToken && inputManualMentariToken) {
    btnSaveManualToken.onclick = async () => {
      const token = inputManualMentariToken.value.trim();
      if (!token) {
        showToast("Tempelkan token MENTARI Anda terlebih dahulu.");
        return;
      }
      btnSaveManualToken.disabled = true;
      btnSaveManualToken.textContent = "Menyimpan...";
      try {
        const res = await fetch("/api/save-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (data.success) {
          showToast("🎉 Token MENTARI berhasil disimpan! Sesi kini aktif.");
          checkSessionStatus();
          performScan();
        } else {
          showToast(`Gagal: ${data.error}`);
        }
      } catch (err) {
        showToast(`Error: ${err.message}`);
      } finally {
        btnSaveManualToken.disabled = false;
        btnSaveManualToken.textContent = "Simpan Token";
      }
    };
  }

  if (btnModalReconnect) btnModalReconnect.onclick = () => triggerAutoReconnect("Pembaruan sesi MENTARI", true);
  if (btnBannerReconnect) btnBannerReconnect.onclick = () => triggerAutoReconnect("Pembaruan sesi MENTARI", true);

  // ── UNIFIED SETTINGS MODAL ───────────────────────────────────────────────
  if (btnOpenSettings) btnOpenSettings.onclick = () => openSettings("class");
  if (btnCloseSettings) btnCloseSettings.onclick = closeSettings;
  if (btnCloseSettingsFooter) btnCloseSettingsFooter.onclick = closeSettings;
  if (modalSettings) {
    modalSettings.onclick = (e) => {
      if (e.target === modalSettings) closeSettings();
    };
  }

  if (tabBtnClassSettings) tabBtnClassSettings.onclick = () => switchSettingsTab("class");
  if (tabBtnDeadlineSettings) tabBtnDeadlineSettings.onclick = () => switchSettingsTab("deadlines");
  if (tabBtnWeeksSettings) tabBtnWeeksSettings.onclick = () => switchSettingsTab("weeks");
  if (tabBtnTemplates) tabBtnTemplates.onclick = () => switchSettingsTab("templates");
  if (tabBtnBot) tabBtnBot.onclick = () => switchSettingsTab("bot");
  if (tabBtnSchedule) tabBtnSchedule.onclick = () => switchSettingsTab("schedule");

  // Class Profile Handlers
  if (btnAutoDetectClass) btnAutoDetectClass.onclick = autoDetectClass;
  if (btnSaveClassProfile) btnSaveClassProfile.onclick = saveClassProfile;
  if (btnUseMentariName) {
    btnUseMentariName.onclick = () => {
      if (inputUserCustomName) inputUserCustomName.value = "";
      showToast("Nama disetel otomatis mengikuti profil akun MENTARI.");
    };
  }

  // Deadlines & Weeks Handlers
  const btnSaveDeadlinesSettings = document.getElementById("btnSaveDeadlinesSettings");
  if (btnSaveDeadlinesSettings) btnSaveDeadlinesSettings.onclick = saveDeadlinesSettings;
  if (btnRecalculateWeeks) btnRecalculateWeeks.onclick = recalculateWeeksFromStartDate;
  if (btnSaveWeeksSettings) btnSaveWeeksSettings.onclick = saveWeeksSettings;

  // Template Editor Handlers
  if (selectTemplateType) selectTemplateType.onchange = updateTemplateEditorView;
  if (btnResetTemplate) btnResetTemplate.onclick = resetTemplateToDefault;
  if (txtTemplateEditor) txtTemplateEditor.oninput = renderTemplateLivePreview;
  if (btnSaveTemplates) btnSaveTemplates.onclick = saveTemplatesFromModal;

  // Contacts Handlers inside modal
  searchContactInput.oninput = () => renderContactsList();
  btnAutoFormatAll.onclick = autoFormatAllContactPhones;
  btnSaveContacts.onclick = saveContactsFromModal;
  if (btnAddNewStudent) btnAddNewStudent.onclick = addNewStudentFromModal;

  // Telegram Handlers inside modal
  btnSaveTelegram.onclick = saveTelegramConfig;
  btnTestTelegram.onclick = testTelegramBot;
  btnBotStart.onclick = startBot;
  btnBotStop.onclick = stopBot;
  btnBotTrigger.onclick = triggerBot;

  // Changelog & Versi Handlers
  document.getElementById("btnVersionBadge")?.addEventListener("click", openChangelogModal);
  document.getElementById("btnOpenChangelog")?.addEventListener("click", openChangelogModal);
  document.getElementById("btnCloseChangelog")?.addEventListener("click", closeChangelogModal);
  document.getElementById("btnCloseChangelogFooter")?.addEventListener("click", closeChangelogModal);
}

function openChangelogModal() {
  document.getElementById("modalChangelog")?.classList.remove("hidden");
}

function closeChangelogModal() {
  document.getElementById("modalChangelog")?.classList.add("hidden");
}

// ── Multi-View Architecture Switcher ───────────────────────────────────────
let activeMainView = "dashboard";

function switchMainView(viewName, subTab = null) {
  activeMainView = viewName;

  const titleEl = document.getElementById("pageTitleText");
  if (titleEl) {
    if (viewName === "dashboard") titleEl.textContent = "Dashboard";
    else if (viewName === "monitoring") titleEl.textContent = "Monitoring Tugas";
    else if (viewName === "schedule") titleEl.textContent = "Jadwal & Matkul";
    else if (viewName === "students") titleEl.textContent = "Data Mahasiswa";
    else if (viewName === "rangkuman") titleEl.textContent = "Rangkuman Pribadi";
  }

  const viewDashboard = document.getElementById("viewDashboard");
  const viewSchedule = document.getElementById("viewSchedule");
  const viewMonitoring = document.getElementById("viewMonitoring");
  const viewStudents = document.getElementById("viewStudents");
  const viewRangkuman = document.getElementById("viewRangkuman");

  if (viewDashboard) viewDashboard.classList.toggle("hidden", viewName !== "dashboard");
  if (viewSchedule) viewSchedule.classList.toggle("hidden", viewName !== "schedule");
  if (viewMonitoring) viewMonitoring.classList.toggle("hidden", viewName !== "monitoring");
  if (viewStudents) viewStudents.classList.toggle("hidden", viewName !== "students");
  if (viewRangkuman) viewRangkuman.classList.toggle("hidden", viewName !== "rangkuman");

  document.querySelectorAll(".view-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  if (viewName === "dashboard") {
    setSidebarActive("navDashboard");
  } else if (viewName === "schedule") {
    setSidebarActive("navJadwal");
    renderScheduleView();
  } else if (viewName === "students") {
    setSidebarActive("navDaftarMhs");
  } else if (viewName === "monitoring") {
    setSidebarActive("navMonitoring");
    if (subTab === "forum") setSidebarActive("navForumKurang");
    else if (subTab === "assignment") setSidebarActive("navBelumPenugasan");
    else if (subTab === "status_fordis") setSidebarActive("navStatusFordis");
  } else if (viewName === "rangkuman") {
    setSidebarActive("navRangkumanPribadi");
    const selectPersonalWeek = document.getElementById("selectPersonalWeek");
    if (selectPersonalWeek && selectWeek) {
      selectPersonalWeek.value = selectWeek.value;
    }
    if (typeof renderPersonalSummaryTable === "function") {
      renderPersonalSummaryTable();
    }
    if (typeof refreshPersonalSummary === "function") {
      refreshPersonalSummary();
    }
  }

  if (viewName === "monitoring" && subTab) {
    switchMiddleTab(subTab);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.switchMainView = switchMainView;

function selectAndMonitorCourse(courseKey, weekVal) {
  if (selectWeek && weekVal) {
    selectWeek.value = weekVal;
  }
  if (selectCourse && courseKey) {
    selectCourse.value = courseKey;
  }
  syncWithSchedule();
  switchMainView("monitoring");
  performScan();
  const c = (coursesList || []).find(item => item.kode_course === courseKey);
  showToast(`Membuka pemantauan tugas untuk ${c?.nama_mata_kuliah || "mata kuliah"}.`);
}
window.selectAndMonitorCourse = selectAndMonitorCourse;

function renderScheduleView(targetWeek = null) {
  const currentWeek = targetWeek || (selectWeek ? selectWeek.value : "1");
  const pContainer = document.getElementById("schedWeekPillsContainer");
  const modeSummary = document.getElementById("schedActiveModeSummary");
  const g1Badge = document.getElementById("schedGroup1PeriodBadge");
  const g2Badge = document.getElementById("schedGroup2PeriodBadge");
  const g1Courses = document.getElementById("schedGroup1Courses");
  const g2Courses = document.getElementById("schedGroup2Courses");

  if (!pContainer || !g1Courses || !g2Courses) return;

  // 1. Render Week Pills
  const allWeeks = [
    "1", "2", "3", "4", "5", "6", "7", "UTS",
    "8", "9", "10", "11", "12", "13", "14", "UAS", "15", "16"
  ];

  pContainer.innerHTML = allWeeks.map(w => {
    const isActive = String(w) === String(currentWeek);
    const isUTSorUAS = w === "UTS" || w === "UAS";
    const currentWeekNum = parseInt(currentWeek, 10);
    const wNum = parseInt(w, 10);
    const isPast = !isNaN(currentWeekNum) && !isNaN(wNum) && wNum < currentWeekNum;

    let pillCls = "sched-week-pill";
    if (isActive) pillCls += " active";
    else if (isUTSorUAS) pillCls += " uts";
    else if (isPast) pillCls += " past";

    let label = w;
    return `<button type="button" class="${pillCls}" onclick="renderScheduleView('${w}')">${label}</button>`;
  }).join("");

  // 2. Mode Calculations
  const modeG1 = getGroupMode("1", currentWeek);
  const modeG2 = getGroupMode("2", currentWeek);

  if (modeSummary) {
    let text = `Pekan ${currentWeek}: Kel I ${modeG1} • Kel II ${modeG2}`;
    if (currentWeek === "UTS") text = "Pekan 8: Ujian Tengah Semester (UTS)";
    else if (currentWeek === "UAS") text = "Pekan 16: Ujian Akhir Semester (UAS)";
    modeSummary.textContent = text;
  }

  if (g1Badge) {
    g1Badge.textContent = `${modeG1} ${modeG1 === "LURING" ? "(Ruang V.619)" : "(MENTARI)"}`;
    g1Badge.className = `badge-mode-pill ${modeG1 === "LURING" ? "mode-luring" : ""}`;
  }

  if (g2Badge) {
    g2Badge.textContent = `${modeG2} ${modeG2 === "LURING" ? "(Ruang V.619)" : "(MENTARI)"}`;
    g2Badge.className = `badge-mode-pill ${modeG2 === "LURING" ? "mode-luring" : ""}`;
  }

  // 3. Courses Filter
  const isDemo = (c) => (c.kode_course || "").includes("20252");
  const group1List = (coursesList || []).filter(c => getCourseGroupKey(c) === "1" && !isDemo(c));
  const group2List = (coursesList || []).filter(c => getCourseGroupKey(c) === "2" && !isDemo(c));

  // Helper to render card for a course matching Figma
  function createCourseCard(c, groupKey, mode) {
    const sks = c.sks || (c.coursename?.startsWith("[3]") ? 3 : 2);
    const courseName = c.nama_mata_kuliah || c.coursename?.split('#')[0].replace(/^\[\d+\]\s*/, '').trim() || c.kode_course;
    const dosen = c.nama_dosen || "Dosen Pengampu";
    const kel = getCourseKelompok(c);
    const courseMode = getCourseModeForWeek(c, currentWeek);
    const isPureLuring = courseMode === "LURING";
    const badgeCls = isPureLuring ? "mode-luring" : "mode-daring";
    let badgeTxt = isPureLuring ? "LURING+TUGAS" : "DARING";
    if (kel === "FULL_DARING") badgeTxt = "FULL DARING";
    else if (kel === "FULL_LURING") badgeTxt = "FULL LURING";

    return `
      <div class="sched-course-item">
        <div class="sched-course-title-row">
          <h4 class="sched-course-name">${courseName}</h4>
          <span class="sched-course-sks">${sks} SKS</span>
        </div>
        <div class="sched-course-meta-row">
          <span class="badge-mode-pill ${badgeCls}">${badgeTxt}</span>
          <span class="sched-course-dosen">${dosen}</span>
        </div>
        <div class="sched-course-footer-row">
          <span class="sched-course-code">${c.kode_course}</span>
          <div class="sched-course-indicators">
            <span class="sched-indicator"><span class="sched-dot green"></span> Fordis</span>
            <span class="sched-indicator"><span class="sched-dot green"></span> Posttest</span>
          </div>
        </div>
      </div>
    `;
  }

  g1Courses.innerHTML = group1List.map(c => createCourseCard(c, "1", modeG1)).join("");
  g2Courses.innerHTML = group2List.map(c => createCourseCard(c, "2", modeG2)).join("");
}
window.renderScheduleView = renderScheduleView;

// ── UI Helper: Active Sidebar & Pulse ──────────────────────────────────────
function setSidebarActive(navId) {
  document.querySelectorAll(".sidebar-nav .nav-item, .sidebar-nav .nav-btn").forEach(item => {
    item.classList.toggle("active", item.id === navId);
  });
}

function setActiveFilter(filterName) {
  activeFilter = filterName;
  filterChips.forEach(c => {
    c.classList.toggle("active", c.dataset.filter === filterName);
  });
  document.querySelectorAll(".student-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filterName);
  });
  currentPage = 1;
  filterAndRenderStudentsTable();
}

function pulseElement(el) {
  if (!el) return;
  el.classList.remove("pulse-highlight");
  void el.offsetWidth; // reflow trigger
  el.classList.add("pulse-highlight");
  setTimeout(() => el.classList.remove("pulse-highlight"), 1400);
}

// ── 3. Schedule & Course Matrix ────────────────────────────────────────────
function getGroupMode(groupKey, weekVal) {
  if (groupKey === "FULL_DARING") return "DARING";
  if (groupKey === "FULL_LURING") return "LURING";
  if (weekVal === "UTS") return "UTS";
  if (weekVal === "UAS") return "UAS";

  const weekNum = parseInt(weekVal, 10);
  if (!isNaN(weekNum)) {
    if (weekNum <= 7) {
      return groupKey === "1" ? "LURING" : "DARING";
    } else {
      return groupKey === "1" ? "DARING" : "LURING";
    }
  }

  return "";
}

function getCourseKelompok(c) {
  if (!c) return "1";
  const custom = currentClassSettings?.course_deadlines?.[c.kode_course]?.kelompok;
  if (custom !== undefined && custom !== "") return String(custom);
  if (c.kelompok !== undefined && c.kelompok !== "") return String(c.kelompok);
  if ((c.coursename || "").includes("[E-2]") || String(c.id_periode || c.periode || "") === "2") return "2";
  return "1";
}

function getCourseGroupKey(c) {
  const kel = getCourseKelompok(c);
  if (kel === "2") return "2";
  if (kel === "1") return "1";
  if ((c.coursename || "").includes("[E-2]") || String(c.id_periode || c.periode || "") === "2") return "2";
  return "1";
}

function getCourseModeForWeek(c, weekVal) {
  const kel = getCourseKelompok(c);
  if (kel === "FULL_DARING") return "DARING";
  if (kel === "FULL_LURING") return "LURING";
  const groupKey = kel === "2" ? "2" : "1";
  return getGroupMode(groupKey, weekVal);
}

function getKelompokShortLabel(kel) {
  if (kel === "2") return "K2";
  if (kel === "FULL_DARING") return "Daring";
  if (kel === "FULL_LURING") return "Luring";
  return "K1";
}

function getKelompokFullLabel(kel) {
  if (kel === "2") return "Kelompok 2 [E-2]";
  if (kel === "FULL_DARING") return "Full Daring";
  if (kel === "FULL_LURING") return "Full Luring";
  return "Kelompok 1 [E-1]";
}

// Urutan kanonik pekan: 1-7, UTS, 8-15, UAS, 16
const CANONICAL_WEEK_ORDER = ["1", "2", "3", "4", "5", "6", "7", "UTS", "8", "9", "10", "11", "12", "13", "14", "15", "UAS", "16"];

function getOrderedWeekKeys(weeksObj) {
  // Kembalikan kunci dalam urutan kanonik, lalu tambahkan kunci yang tidak ada di urutan
  const known = CANONICAL_WEEK_ORDER.filter(k => k in weeksObj);
  const extra = Object.keys(weeksObj).filter(k => !CANONICAL_WEEK_ORDER.includes(k));
  return [...known, ...extra];
}

function formatCourseTitle(name) {
  if (!name) return "";
  const isAllUpper = name === name.toUpperCase();
  if (!isAllUpper) return name;

  return name.toLowerCase()
    .split(" ")
    .map(word => {
      const u = word.toUpperCase();
      if (["SKS", "I", "II", "III", "IV", "V", "VI", "AI", "ML", "SIM", "PCD", "TRO", "KBM"].includes(u)) {
        return u;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function populateWeeksDropdown() {
  if (!selectWeek) return;
  const activeWeekKey = getCurrentSemesterWeek();
  const currentVal = selectWeek.value || activeWeekKey || "3";
  selectWeek.innerHTML = "";
  const weeks = currentClassSettings?.weeks || WEEK_NAMES;
  getOrderedWeekKeys(weeks).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    const isCurrent = key === activeWeekKey;
    opt.dataset.isCurrent = isCurrent ? "true" : "false";
    opt.textContent = weeks[key];
    if (key === currentVal) opt.selected = true;
    selectWeek.appendChild(opt);
  });
  if (selectWeek.value !== currentVal) {
    selectWeek.value = currentVal;
  }

  // Sync selectPersonalWeek juga
  const selectPersonalWeek = document.getElementById("selectPersonalWeek");
  if (selectPersonalWeek) {
    const prevVal = selectPersonalWeek.value || activeWeekKey || "3";
    selectPersonalWeek.innerHTML = "";
    getOrderedWeekKeys(weeks).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      const label = weeks[key] || (key === "UTS" ? "Pekan UTS" : key === "UAS" ? "Pekan UAS" : `Pekan ${key}`);
      // Short label for personal week (just "Pekan N")
      const shortLabel = key === "UTS" ? "Pekan UTS" : key === "UAS" ? "Pekan UAS" : `Pekan ${key}`;
      opt.textContent = shortLabel;
      if (key === prevVal) opt.selected = true;
      selectPersonalWeek.appendChild(opt);
    });
    if (selectPersonalWeek.value !== prevVal) {
      selectPersonalWeek.value = prevVal;
    }
  }
}
window.populateWeeksDropdown = populateWeeksDropdown;

function populateCoursesDropdown() {
  const previousSelected = selectCourse.value;
  selectCourse.innerHTML = "";
  if (!coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
    console.warn("Daftar mata kuliah belum dimuat.");
    return;
  }

  const isDemo = (c) => (c.kode_course || "").includes("20252");

  const group1 = coursesList.filter(c => getCourseGroupKey(c) === "1" && !isDemo(c));
  const group2 = coursesList.filter(c => getCourseGroupKey(c) === "2" && !isDemo(c));
  const demoCourses = coursesList.filter(isDemo);

  const selectedWeek = selectWeek ? selectWeek.value : "1";
  const modeG1 = getGroupMode("1", selectedWeek);
  const modeG2 = getGroupMode("2", selectedWeek);

  if (group1.length > 0) {
    const optGroup1 = document.createElement("optgroup");
    optGroup1.label = `KELOMPOK 1 (${modeG1})`;
    group1.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.kode_course;
      // Dot deadline dimulai 'false' — akan diupdate oleh refreshCourseDeadlineDots() setelah scan
      opt.dataset.isDeadlineToday = "false";
      const rawName = c.nama_mata_kuliah || c.coursename;
      const kel = getCourseKelompok(c);
      const kelTag = kel === "FULL_DARING" ? " · Full Daring" : (kel === "FULL_LURING" ? " · Full Luring" : "");
      opt.textContent = `${formatCourseTitle(rawName)} (${c.sks || 2} SKS${kelTag})`;
      optGroup1.appendChild(opt);
    });
    selectCourse.appendChild(optGroup1);
  }

  if (group2.length > 0) {
    const optGroup2 = document.createElement("optgroup");
    optGroup2.label = `KELOMPOK 2 (${modeG2})`;
    group2.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.kode_course;
      // Dot deadline dimulai 'false' — akan diupdate oleh refreshCourseDeadlineDots() setelah scan
      opt.dataset.isDeadlineToday = "false";
      const rawName = c.nama_mata_kuliah || c.coursename;
      const kel = getCourseKelompok(c);
      const kelTag = kel === "FULL_DARING" ? " · Full Daring" : (kel === "FULL_LURING" ? " · Full Luring" : "");
      opt.textContent = `${formatCourseTitle(rawName)} (${c.sks || 2} SKS${kelTag})`;
      optGroup2.appendChild(opt);
    });
    selectCourse.appendChild(optGroup2);
  }

  // Fallback if groups could not be parsed
  if (group1.length === 0 && group2.length === 0) {
    const optAll = document.createElement("optgroup");
    optAll.label = "SEMUA MATA KULIAH";
    coursesList.filter(c => !isDemo(c)).forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.kode_course;
      opt.dataset.isDeadlineToday = "false";
      const rawName = c.nama_mata_kuliah || c.coursename;
      opt.textContent = `${formatCourseTitle(rawName)} (${c.sks || 2} SKS)`;
      optAll.appendChild(opt);
    });
    selectCourse.appendChild(optAll);
  }

  if (demoCourses.length > 0) {
    const optGroupDemo = document.createElement("optgroup");
    optGroupDemo.label = "ARSIP SIMULASI (Pengujian)";
    demoCourses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.kode_course;
      const rawName = c.nama_mata_kuliah || c.coursename;
      opt.textContent = `${formatCourseTitle(rawName)} (Demo Data)`;
      optGroupDemo.appendChild(opt);
    });
    selectCourse.appendChild(optGroupDemo);
  }

  // Preserve previous selection or default
  if (previousSelected && Array.from(selectCourse.options).some(o => o.value === previousSelected)) {
    selectCourse.value = previousSelected;
  } else {
    const defaultCourse = coursesList.find(c => (c.kode_course || "").includes("22TIF0243")) || coursesList[0];
    if (defaultCourse) selectCourse.value = defaultCourse.kode_course;
  }
}

function populateMeetingSelect(course, selectedWeekVal) {
  if (!selectSection && !selectSectionMon) return;
  const sksNum = parseInt(course?.sks || (course?.coursename?.startsWith("[3]") ? 3 : 2), 10);
  const sksStr = String(sksNum);
  const totalMeetings = sksNum === 3 ? 21 : (sksNum === 4 ? 28 : 14);

  // Scheduled meetings for this week based on 3 SKS / 2 SKS mapping
  const weekMeetings = WEEK_MEETINGS_BY_SKS[sksStr]?.[selectedWeekVal] || [];

  // Decide which meeting to select
  let targetMeeting = weekMeetings.length > 0 ? weekMeetings[0] : 1;
  const currentVal = selectSection?.value || selectSectionMon?.value;
  const currentNum = currentVal ? parseInt(currentVal.replace("PERTEMUAN_", ""), 10) : null;
  if (currentNum && weekMeetings.includes(currentNum)) {
    targetMeeting = currentNum;
  }

  let html = "";
  for (let m = 1; m <= totalMeetings; m++) {
    const val = `PERTEMUAN_${m}`;
    const isWeek = weekMeetings.includes(m);
    const tag = (isWeek && weekMeetings.length > 1) ? " (Pekan Ini)" : "";
    html += `<option value="${val}">Pertemuan ${m}${tag}</option>`;
  }

  const secVal = `PERTEMUAN_${targetMeeting}`;
  if (selectSection) {
    selectSection.innerHTML = html;
    selectSection.value = secVal;
  }
  if (selectSectionMon) {
    selectSectionMon.innerHTML = html;
    selectSectionMon.value = secVal;
  }

  highlightActiveMeetingBtn(secVal);
}

// ── Modern Custom Dropdown Component (Pekan, Matkul, Pertemuan, & All Form Selects) ──
function setupCustomDropdown(selectEl) {
  if (!selectEl) return null;
  if (selectEl._customDropdown) return selectEl._customDropdown;

  selectEl.classList.add("has-custom-dropdown");

  const wrapper = document.createElement("div");
  wrapper.className = "c-dropdown-wrapper";
  if (selectEl.id) wrapper.dataset.for = selectEl.id;

  // Detect and apply styling variants
  if (selectEl.classList.contains("w-full") || selectEl.style.width === "100%") {
    wrapper.classList.add("w-full");
  }
  if (selectEl.classList.contains("figma-input")) {
    wrapper.classList.add("figma-dropdown");
  }
  if (selectEl.classList.contains("select-row-deadline-day") || selectEl.classList.contains("form-control")) {
    wrapper.classList.add("c-dropdown-sm");
    wrapper.classList.add("w-full");
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "c-dropdown-trigger";

  const labelSpan = document.createElement("span");
  labelSpan.className = "c-dropdown-label";

  const textSpan = document.createElement("span");
  textSpan.className = "c-dropdown-label-text";
  labelSpan.appendChild(textSpan);

  const chevronSpan = document.createElement("span");
  chevronSpan.className = "c-dropdown-chevron-wrapper";
  chevronSpan.innerHTML = `<svg class="c-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  trigger.appendChild(labelSpan);
  trigger.appendChild(chevronSpan);

  const menu = document.createElement("div");
  menu.className = "c-dropdown-menu";

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  if (selectEl.parentNode) {
    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
  }

  function renderMenu() {
    menu.innerHTML = "";
    const children = Array.from(selectEl.children);
    const selectedVal = selectEl.value;
    let activeOpt = null;

    function createItem(opt) {
      const item = document.createElement("div");
      item.className = "c-dropdown-item";
      const isSelected = String(opt.value) === String(selectedVal);
      if (isSelected) {
        item.classList.add("selected");
        activeOpt = opt;
      }

      // If selected: show circular bullet dot on left (matching Figma dashboard style)
      if (isSelected) {
        const dot = document.createElement("span");
        dot.className = "c-dropdown-dot";
        item.appendChild(dot);
      }

      const itemText = document.createElement("span");
      itemText.className = "c-dropdown-item-text";
      itemText.textContent = opt.textContent;
      item.appendChild(itemText);

      // Simple red deadline indicator
      if (opt.dataset.isDeadlineToday === "true") {
        const redDot = document.createElement("span");
        redDot.className = "c-deadline-dot";
        redDot.title = "Deadline Hari Ini";
        item.appendChild(redDot);
      }

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        closeAllCustomDropdowns();
        updateTrigger();
        renderMenu();
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      });

      return item;
    }

    children.forEach((child) => {
      if (child.tagName === "OPTGROUP") {
        const groupTitle = document.createElement("div");
        groupTitle.className = "c-dropdown-group-title";
        groupTitle.textContent = child.label;
        menu.appendChild(groupTitle);

        Array.from(child.children).forEach((opt) => {
          menu.appendChild(createItem(opt));
        });
      } else if (child.tagName === "OPTION") {
        menu.appendChild(createItem(child));
      }
    });

    updateTrigger(activeOpt);
  }

  function updateTrigger(opt = null) {
    const selectedOpt = opt || selectEl.options[selectEl.selectedIndex] || Array.from(selectEl.options).find(o => String(o.value) === String(selectEl.value));
    textSpan.textContent = selectedOpt ? selectedOpt.textContent : "...";

    const oldDot = labelSpan.querySelector(".c-deadline-dot");
    if (oldDot) oldDot.remove();

    if (selectedOpt && selectedOpt.dataset.isDeadlineToday === "true") {
      const redDot = document.createElement("span");
      redDot.className = "c-deadline-dot";
      redDot.title = "Deadline Hari Ini";
      labelSpan.appendChild(redDot);
    }
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains("open");
    closeAllCustomDropdowns();
    if (!isOpen) {
      // Smart positioning: calculate available space below vs above
      const rect = trigger.getBoundingClientRect();
      const scrollParent = trigger.closest(".table-responsive") || trigger.closest(".settings-body-scroll") || trigger.closest(".modal-body");
      if (scrollParent) {
        const sRect = scrollParent.getBoundingClientRect();
        const spaceBelow = sRect.bottom - rect.bottom;
        const spaceAbove = rect.top - sRect.top;
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          wrapper.classList.add("dropup");
        } else {
          wrapper.classList.remove("dropup");
        }
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 220 && rect.top > spaceBelow) {
          wrapper.classList.add("dropup");
        } else {
          wrapper.classList.remove("dropup");
        }
      }

      wrapper.classList.add("open");
      const tr = wrapper.closest("tr");
      if (tr) tr.style.zIndex = "1200";

      const selectedItem = menu.querySelector(".c-dropdown-item.selected");
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  });

  selectEl.addEventListener("change", () => {
    updateTrigger();
    renderMenu();
  });

  // Intercept programmatic value changes so wrapper updates reactively
  try {
    const originalSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    const originalGetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.get;
    Object.defineProperty(selectEl, "value", {
      get() {
        return originalGetter ? originalGetter.call(this) : this.getAttribute("value");
      },
      set(newVal) {
        if (originalSetter) {
          originalSetter.call(this, newVal);
        }
        updateTrigger();
        renderMenu();
      },
      configurable: true
    });
  } catch (e) {}

  const observer = new MutationObserver(() => {
    renderMenu();
  });
  observer.observe(selectEl, { childList: true, subtree: true });

  renderMenu();

  const instance = {
    wrapper,
    trigger,
    menu,
    renderMenu,
    updateTrigger
  };

  selectEl._customDropdown = instance;
  return instance;
}

function closeAllCustomDropdowns() {
  document.querySelectorAll(".c-dropdown-wrapper.open").forEach(w => {
    w.classList.remove("open");
    w.classList.remove("dropup");
  });
  document.querySelectorAll("tr").forEach(tr => {
    if (tr.style.zIndex === "1200") tr.style.zIndex = "";
  });
}

function initAllCustomDropdowns(root = document) {
  const selects = root.querySelectorAll("select");
  selects.forEach(sel => {
    if (sel.closest("#legacyCompatStore") || sel.classList.contains("has-custom-dropdown") || sel.style.display === "none") return;
    setupCustomDropdown(sel);
  });
}
window.initAllCustomDropdowns = initAllCustomDropdowns;
window.setupCustomDropdown = setupCustomDropdown;

document.addEventListener("click", () => {
  closeAllCustomDropdowns();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllCustomDropdowns();
});

function syncWithSchedule() {
  const selectedCourseId = selectCourse.value;
  const selectedWeekVal = selectWeek.value;
  const course = coursesList.find(c => c.kode_course === selectedCourseId);

  if (!course) return;

  const sksNum = parseInt(course.sks || (course.coursename?.startsWith("[3]") ? 3 : 2), 10);
  const sks = String(sksNum);

  // Populate Pertemuan dropdown dynamically based on SKS & Week mapping
  populateMeetingSelect(course, selectedWeekVal);

  if (selectedCourseId.includes("20252")) {
    infoDosen.textContent = "Dosen Metode Numerik";
    infoHari.textContent = "Sabtu";
    infoRuang.textContent = "Ruang V.619 (Arsip Demo)";
    infoKelompok.textContent = "Kelompok I";
    infoRuangPill.textContent = "Ruang V.619";
    infoKelompokPill.textContent = "Kelompok I";
    badgeMode.textContent = "ARSIP DEMO";
    badgeMode.className = "badge-mode-pill luring";
    renderMeetingPills([1]);
    if (selectSection) selectSection.value = "PERTEMUAN_1";
    if (selectSectionMon) selectSectionMon.value = "PERTEMUAN_1";
    highlightActiveMeetingBtn("PERTEMUAN_1");
    return;
  }

  const kel = getCourseKelompok(course);
  const groupKey = getCourseGroupKey(course);
  const currentMode = getCourseModeForWeek(course, selectedWeekVal);
  const isDaring = currentMode === "DARING";

  let kelompokName = groupKey === "1" ? "Kelompok 1" : "Kelompok 2";
  if (kel === "FULL_DARING") kelompokName = "Full Daring";
  else if (kel === "FULL_LURING") kelompokName = "Full Luring";

  infoDosen.textContent = course.nama_dosen || "Dosen Pengampu";
  infoHari.textContent = "Sabtu";
  infoKelompok.textContent = `${kelompokName} (${currentMode})`;
  infoKelompokPill.textContent = `${kelompokName} • ${currentMode}`;

  if (isDaring) {
    infoRuang.textContent = "E-Learning MENTARI";
    infoRuangPill.textContent = "MENTARI";
  } else {
    infoRuang.textContent = "Ruang V.619";
    infoRuangPill.textContent = "Ruang V.619";
  }

  if (selectedWeekVal === "UTS" || selectedWeekVal === "UAS") {
    const isUts = selectedWeekVal === "UTS";
    let mode = "";
    if (kel === "FULL_DARING") mode = isUts ? "UTS DARING" : "UAS DARING";
    else if (kel === "FULL_LURING") mode = isUts ? "UTS LURING" : "UAS LURING";
    else mode = isUts
      ? (groupKey === "1" ? "UTS LURING" : "UTS DARING")
      : (groupKey === "1" ? "UAS DARING" : "UAS LURING");
    badgeMode.textContent = mode;
    badgeMode.className = mode.includes("DARING") ? "badge-mode-pill daring" : "badge-mode-pill luring";
    renderMeetingPills([isUts ? 8 : 16]);
    const secVal = isUts ? "PERTEMUAN_8" : "PERTEMUAN_16";
    if (selectSection) selectSection.value = secVal;
    if (selectSectionMon) selectSectionMon.value = secVal;
    highlightActiveMeetingBtn(secVal);
    return;
  }

  const groupSchedule = scheduleData?.groups?.[groupKey]?.schedule?.[selectedWeekVal] || {};
  const sksSchedule = groupSchedule[sks] || { luring: [], daring: [] };
  let luringMeetings = [...(sksSchedule.luring || [])];
  let daringMeetings = [...(sksSchedule.daring || [])];

  if (kel === "FULL_DARING") {
    daringMeetings = [...new Set([...daringMeetings, ...luringMeetings])];
    luringMeetings = [];
  } else if (kel === "FULL_LURING") {
    luringMeetings = [...new Set([...daringMeetings, ...luringMeetings])];
    daringMeetings = [];
  }

  const hasLuring = luringMeetings.length > 0;
  const hasDaring = daringMeetings.length > 0;

  if (hasLuring && !hasDaring) {
    badgeMode.textContent = "LURING";
    badgeMode.className = "badge-mode-pill luring";
  } else if (!hasLuring && hasDaring) {
    badgeMode.textContent = "DARING";
    badgeMode.className = "badge-mode-pill daring";
  } else {
    badgeMode.textContent = "KOMBINASI";
    badgeMode.className = "badge-mode-pill daring";
  }

  const activeMeetings = WEEK_MEETINGS_BY_SKS[sks]?.[selectedWeekVal] || (hasDaring ? daringMeetings : luringMeetings);

  renderMeetingPills(activeMeetings);

  updateCourseDeadlinePill();

  if (selectWeek?._customDropdown) selectWeek._customDropdown.updateTrigger();
  if (selectCourse?._customDropdown) selectCourse._customDropdown.updateTrigger();
  if (selectSection?._customDropdown) selectSection._customDropdown.updateTrigger();
  if (selectSectionMon?._customDropdown) selectSectionMon._customDropdown.updateTrigger();
}

function getCourseDeadline(courseCode) {
  const custom = currentClassSettings?.course_deadlines?.[courseCode];
  const course = coursesList.find(c => c.kode_course === courseCode);
  const courseName = (course?.nama_mata_kuliah || course?.coursename || "").toUpperCase();
  const defDay = courseName.includes("RISET") ? "Sabtu" : (currentClassSettings?.deadline_day || "Jumat");
  const defTime = currentClassSettings?.deadline_time || "23:59 WIB";
  const day = (custom && custom.day) ? custom.day : defDay;
  const time = (custom && custom.time) ? custom.time : defTime;

  const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = DAYS_ID[new Date().getDay()];
  const isToday = day.trim().toLowerCase() === todayName.toLowerCase();

  return {
    day,
    time,
    text: `${day}, ${time}`,
    isCustom: !!custom,
    isToday
  };
}

function updateCourseDeadlinePill() {
  const selectedCourseId = selectCourse?.value;
  if (!selectedCourseId || !textCourseDeadline) return;
  const deadline = getCourseDeadline(selectedCourseId);

  // Cek apakah matkul yang dipilih punya fordis aktif
  const hasFordis = checkCourseFordisFromScan(selectedCourseId);
  const todayBadge = (deadline.isToday && hasFordis)
    ? ` <span class="badge-deadline-today" style="font-size: 10px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 1px 6px; border-radius: 4px; margin-left: 4px; font-weight: 600;">Hari Ini</span>`
    : "";
  textCourseDeadline.innerHTML = `Deadline: <strong style="color: #38bdf8;">${deadline.text}</strong>${todayBadge}`;
}

/**
 * Cek apakah matkul tertentu punya fordis aktif, berdasarkan currentScanData atau scanAllResults.
 */
function checkCourseFordisFromScan(courseId) {
  // Cek dari single scan data
  if (currentScanData?.kodeCourse === courseId) {
    return !!(currentScanData.forum?.available);
  }
  // Cek dari batch scan results
  if (scanAllResults && scanAllResults.length > 0) {
    const match = scanAllResults.find(c => c.kodeCourse === courseId);
    if (match && match.scannedMeetings) {
      return match.scannedMeetings.some(m => m.forum?.available);
    }
  }
  return false; // Belum di-scan = anggap belum ada fordis
}

/**
 * Refresh dot merah deadline di dropdown course.
 * Dot merah hanya muncul jika: hari ini adalah deadline matkul tersebut DAN matkul punya fordis aktif.
 */
function refreshCourseDeadlineDots() {
  if (!selectCourse) return;
  Array.from(selectCourse.options).forEach(opt => {
    const courseId = opt.value;
    if (!courseId) return;
    const cDead = getCourseDeadline(courseId);
    const hasFordis = checkCourseFordisFromScan(courseId);
    opt.dataset.isDeadlineToday = (cDead.isToday && hasFordis) ? "true" : "false";
  });
  // Refresh custom dropdown agar dot merah di-render ulang
  if (selectCourse._customDropdown) {
    selectCourse._customDropdown.renderMenu();
    selectCourse._customDropdown.updateTrigger();
  }
}

function renderMeetingPills(meetings) {
  if (!meetingBtnGroup) return;
  meetingBtnGroup.innerHTML = "";
  if (!meetings || meetings.length === 0) return;

  meetings.forEach(m => {
    const secVal = `PERTEMUAN_${m}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-meeting-pill";
    btn.dataset.section = secVal;
    btn.textContent = `Pertemuan ${m}`;
    btn.onclick = () => {
      if (selectSection) selectSection.value = secVal;
      if (selectSectionMon) selectSectionMon.value = secVal;
      highlightActiveMeetingBtn(secVal);
      updateWaPreview();
      performScan();
    };
    meetingBtnGroup.appendChild(btn);
  });
}

function highlightActiveMeetingBtn(secVal) {
  document.querySelectorAll(".btn-meeting-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === secVal);
  });
  if (selectSection?._customDropdown) selectSection._customDropdown.updateTrigger();
  if (selectSectionMon?._customDropdown) selectSectionMon._customDropdown.updateTrigger();
}

// ── 4. Deadline Countdown ──────────────────────────────────────────────────
function getWeekDeadlineDate(weekVal, dayName = "Jumat", timeStr = "23:59 WIB") {
  const daysMap = { "senin": 0, "selasa": 1, "rabu": 2, "kamis": 3, "jumat": 4, "sabtu": 5, "minggu": 6 };
  const weekOffsets = {
    "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6,
    "UTS": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12, "13": 13, "14": 14, "15": 15,
    "UAS": 16, "16": 17
  };

  const offsetWeeks = weekOffsets[String(weekVal)] ?? (parseInt(weekVal, 10) - 1 || 0);
  const targetDayOffset = daysMap[(dayName || "Jumat").toLowerCase().trim()] ?? 4;

  const timeMatch = (timeStr || "23:59").match(/(\d{1,2})[:.](\d{2})/);
  const hours = timeMatch ? parseInt(timeMatch[1], 10) : 23;
  const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 59;

  const startDateStr = currentClassSettings?.semester_start_date || "2026-08-31";
  const targetDate = new Date(startDateStr + "T00:00:00+07:00");
  targetDate.setDate(targetDate.getDate() + (offsetWeeks * 7) + targetDayOffset);
  targetDate.setHours(hours, minutes, 59, 999);

  return targetDate;
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);

  const selectedWeek = selectWeek ? selectWeek.value : "1";
  if (deadlineTitle) deadlineTitle.textContent = `Batas Pekan ${selectedWeek}`;

  const currentCourse = selectCourse?.value;
  const deadlineInfo = getCourseDeadline(currentCourse);
  if (deadlineSub) {
    deadlineSub.textContent = `Deadline: ${deadlineInfo.text}`;
  }

  // Calculate accurate deadline date for the selected week & course
  let targetDeadline = getWeekDeadlineDate(selectedWeek, deadlineInfo.day, deadlineInfo.time);

  const update = () => {
    const now = new Date();
    const diff = targetDeadline.getTime() - now.getTime();

    // Cek apakah fordis aktif pada pertemuan yang sedang dipilih
    // Pastikan currentScanData adalah milik matkul yang sedang aktif (bukan matkul lama)
    const currentCourseSelected = selectCourse?.value;
    const scanMatchesCourse = currentScanData?.kodeCourse === currentCourseSelected;
    const isFordisActive = !!(scanMatchesCourse && currentScanData?.forum?.available);

    // Topbar pill hanya muncul jika: fordis aktif DAN sisa waktu <= 24 jam (hari H deadline)
    const topbarCountdownPill = document.getElementById("topbarCountdownPill");
    const showTopbarPill = isFordisActive && diff > 0 && diff <= 24 * 60 * 60 * 1000;
    if (topbarCountdownPill) {
      topbarCountdownPill.style.display = showTopbarPill ? "" : "none";
    }

    if (diff <= 0) {
      if (deadlineCountdown) deadlineCountdown.textContent = "Batas Waktu Ditutup";
      if (deadlinePill) {
        deadlinePill.classList.add("expired");
        deadlinePill.classList.remove("urgent");
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursInDay = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    const pad = (n) => String(n).padStart(2, "0");

    if (deadlineCountdown) {
      if (days > 0) {
        deadlineCountdown.textContent = `${days} Hari ${pad(hoursInDay)}h : ${pad(mins)}m : ${pad(secs)}s`;
      } else {
        deadlineCountdown.textContent = `${pad(hoursInDay)}h : ${pad(mins)}m : ${pad(secs)}s`;
      }
    }

    if (deadlinePill) {
      deadlinePill.classList.remove("expired");
      if (diff < 24 * 60 * 60 * 1000) {
        deadlinePill.classList.add("urgent");
      } else {
        deadlinePill.classList.remove("urgent");
      }
    }

    const topbarCountdownText = document.getElementById("topbarCountdownText");
    if (topbarCountdownText && showTopbarPill) {
      const timeStr = days > 0 ? `${days}h ${pad(hoursInDay)}j ${pad(mins)}m` : `${pad(hoursInDay)}j ${pad(mins)}m ${pad(secs)}d`;
      topbarCountdownText.textContent = `BATAS PEKAN ${selectedWeek} · ${timeStr} · Deadline: ${deadlineInfo.text}`;
      if (topbarCountdownPill) {
        topbarCountdownPill.classList.remove("expired");
        topbarCountdownPill.classList.add("urgent");
      }
    }
  };

  // Sembunyikan pill dulu sebelum update pertama (akan ditampilkan di update() jika syarat terpenuhi)
  const topbarCountdownPill = document.getElementById("topbarCountdownPill");
  if (topbarCountdownPill) topbarCountdownPill.style.display = "none";

  update();
  countdownTimer = setInterval(update, 1000);
}

let mentariLoginName = "";

function getInitialsFromName(fullName) {
  if (!fullName || typeof fullName !== "string") return "M";
  const clean = fullName.replace(/[^a-zA-Z\s]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "M";
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join("").slice(0, 4).toUpperCase();
}

function updateUserDisplayName() {
  const custom = currentClassSettings?.user_custom_name?.trim();
  const nameToDisplay = custom || mentariLoginName || currentPersonalName || "Mahasiswa";
  if (userName) {
    userName.textContent = nameToDisplay;
  }
  const avatarSpan = document.getElementById("userAvatarText");
  const modalAvatar = document.getElementById("modalAvatarBadge");
  const fullNameForAvatar = currentPersonalName || custom || mentariLoginName || "Mahasiswa";
  const initials = getInitialsFromName(fullNameForAvatar);
  if (avatarSpan) {
    avatarSpan.textContent = initials;
  }
  if (modalAvatar) {
    modalAvatar.textContent = initials;
  }
  const userDisplayNameBadge = document.getElementById("userDisplayNameBadge");
  const userNimBadge = document.getElementById("userNimBadge");
  if (userDisplayNameBadge) {
    userDisplayNameBadge.textContent = custom || currentPersonalName || "Profil Mahasiswa";
  }
  if (userNimBadge) {
    userNimBadge.textContent = currentPersonalNim || "-";
  }
}

// ── 5. Session Status Check ────────────────────────────────────────────────
async function checkSessionStatus() {
  try {
    const res = await fetch("/api/session-status");
    const data = await res.json();
    if (data.active) {
      statusDot.className = "status-indicator-dot online";
      statusValText.textContent = "Online";
      statusValText.className = "status-val online";
      reconnectBanner.classList.add("hidden");
      if (data.user?.username) {
        currentPersonalNim = data.user.username;
      }
      if (data.user?.fullname) {
        currentPersonalName = data.user.fullname;
        mentariLoginName = data.user.fullname.split(" ")[0].toUpperCase();
      }
      updateUserDisplayName();
      if (sessionStatusDetail) {
        sessionStatusDetail.textContent = "Online (Aktif)";
        sessionStatusDetail.className = "badge-table-pill success";
      }
    } else {
      statusDot.className = "status-indicator-dot offline";
      statusValText.textContent = "Offline";
      statusValText.className = "status-val offline";
      reconnectBanner.classList.remove("hidden");
      if (!currentClassSettings?.user_custom_name?.trim()) {
        userName.textContent = "TERPUTUS";
      }
      if (sessionStatusDetail) {
        sessionStatusDetail.textContent = "Offline (Kedaluwarsa)";
        sessionStatusDetail.className = "badge-table-pill danger";
      }
    }
  } catch {
    statusDot.className = "status-indicator-dot offline";
    statusValText.textContent = "Offline";
    statusValText.className = "status-val offline";
    reconnectBanner.classList.remove("hidden");
    if (!currentClassSettings?.user_custom_name?.trim()) {
      userName.textContent = "TERPUTUS";
    }
    if (sessionStatusDetail) {
      sessionStatusDetail.textContent = "Offline (Terputus)";
      sessionStatusDetail.className = "badge-table-pill danger";
    }
  }
}

// ── 5.1 Automatic Session Reconnect Engine ──────────────────────────────────
let isReconnectingUi = false;
let lastReconnectTime = 0;
let autoReconnectAttempts = 0;

// manualOverride = true: dipanggil dari klik tombol user, bypass semua guard
async function triggerAutoReconnect(reason = "Sesi MENTARI telah habis", manualOverride = false) {
  const now = Date.now();
  if (isReconnectingUi) {
    showToast("⏳ Proses login sedang berjalan...");
    return;
  }

  // Debounce hanya untuk trigger otomatis (non-manual)
  if (!manualOverride && now - lastReconnectTime < 20000) {
    console.warn("Pembaruan sesi dicegah untuk menghindari looping.");
    return;
  }

  // Batas percobaan hanya untuk auto-trigger, bukan klik manual
  if (!manualOverride && autoReconnectAttempts >= 1) {
    console.warn("Batas auto-reconnect tercapai.");
    showToast("⚠️ Sesi MENTARI perlu diperbarui. Klik tombol 'Perbarui Sesi' di menu.");
    if (statusValText) statusValText.textContent = "Offline";
    if (statusValText) statusValText.className = "status-val offline";
    if (reconnectBanner) reconnectBanner.classList.remove("hidden");
    return;
  }

  // Reset counter ketika dipanggil manual
  if (manualOverride) {
    autoReconnectAttempts = 0;
  }

  isReconnectingUi = true;
  lastReconnectTime = now;
  autoReconnectAttempts++;

  showToast(`🔄 ${reason}. Membuka jendela login Chrome...`);
  if (statusValText) {
    statusValText.textContent = "Memperbarui...";
    statusValText.className = "status-val warning";
  }
  if (statusDot) statusDot.className = "status-indicator-dot warning";
  if (sessionStatusDetail) {
    sessionStatusDetail.textContent = "Memperbarui...";
    sessionStatusDetail.className = "badge-table-pill warning";
  }

  if (btnScan) btnScan.disabled = true;
  if (scanBtnText) scanBtnText.textContent = "Menunggu Login...";

  try {
    const res = await fetch("/api/reconnect", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToast("🎉 Sesi MENTARI berhasil diperbarui!");
      autoReconnectAttempts = 0;

      // Muat ulang daftar mata kuliah yang disinkronkan otomatis dari akun baru
      try {
        const cRes = await fetch("/api/courses");
        const cData = await cRes.json();
        coursesList = Array.isArray(cData) ? cData : (cData.courses || []);
        populateCoursesDropdown();
        renderScheduleView();
      } catch (e) {}

      await checkSessionStatus();
      if (reconnectBanner) reconnectBanner.classList.add("hidden");
      // Delay 1.5 detik agar browser context sepenuhnya bersih sebelum scan ulang
      setTimeout(() => performScan(true), 1500);
    } else {
      showToast(`Pembaruan sesi dibatalkan: ${data.error || "Jendela login ditutup sebelum selesai"}`);
      await checkSessionStatus();
    }
  } catch (err) {
    showToast(`Error pembaruan sesi: ${err.message}`);
    await checkSessionStatus();
  } finally {
    isReconnectingUi = false;
    if (btnScan) btnScan.disabled = false;
    if (scanBtnText) scanBtnText.textContent = "Cek Status";
  }
}

// ── 6. Single Scan ─────────────────────────────────────────────────────────
async function performScan(isAutoRetry = false) {
  const courseId = selectCourse.value;
  const section = selectSection.value;
  if (!courseId) return;

  btnScan.disabled = true;
  scanBtnText.textContent = "Memeriksa...";

  try {
    const res = await fetch(`/api/scan?course=${encodeURIComponent(courseId)}&section=${encodeURIComponent(section)}`);
    const data = await res.json();

    const isSessionError = res.status === 401 || res.status === 403 || data.code === "SESSION_EXPIRED" || (data.error && (data.error.includes("403") || data.error.includes("401")));

    if (isSessionError) {
      statusDot.className = "status-indicator-dot offline";
      statusValText.textContent = "Offline";
      statusValText.className = "status-val offline";
      reconnectBanner.classList.remove("hidden");
      if (sessionStatusDetail) {
        sessionStatusDetail.textContent = "Offline (Perlu Login)";
        sessionStatusDetail.className = "badge-table-pill danger";
      }

      if (!isAutoRetry) {
        triggerAutoReconnect("Sesi MENTARI telah habis");
      } else {
        showToast("⚠️ Sesi MENTARI perlu diperbarui. Klik tombol 'Perbarui Sesi'.");
      }
      return;
    }

    if (!res.ok) throw new Error(data.error || "Gagal memindai data");

    // Successful scan: Mark status as Online
    statusDot.className = "status-indicator-dot online";
    statusValText.textContent = "Online";
    statusValText.className = "status-val online";
    reconnectBanner.classList.add("hidden");
    if (sessionStatusDetail) {
      sessionStatusDetail.textContent = "Online (Aktif)";
      sessionStatusDetail.className = "badge-table-pill success";
    }

    currentScanData = data;
    currentStudentsList = data.students || [];

    // Sinkronisasi data pindaian single-course ke scanAllResults (in-memory) jika sudah tersedia
    if (scanAllResults && scanAllResults.length > 0) {
      const matchCourse = scanAllResults.find(c => c.kodeCourse === courseId || c.kodeCourse === data.kodeCourse);
      const secNum = parseInt(section.replace("PERTEMUAN_", ""), 10);
      if (matchCourse) {
        if (!matchCourse.scannedMeetings) matchCourse.scannedMeetings = [];
        const existingMeetingIdx = matchCourse.scannedMeetings.findIndex(m => m.meetingNum == secNum || m.kodeSection === section);
        const meetingEntry = { ...data, meetingNum: secNum };
        if (existingMeetingIdx !== -1) {
          matchCourse.scannedMeetings[existingMeetingIdx] = meetingEntry;
        } else {
          matchCourse.scannedMeetings.push(meetingEntry);
        }
        matchCourse.hasAnyActivity = matchCourse.scannedMeetings.some(m => m.hasActivity || m.forum?.available || m.assignment?.available || m.posttest?.available);
        if (matchCourse.hasAnyActivity) {
          matchCourse.isLuring = false;
          matchCourse.isDaring = true;
          matchCourse.isOfflineWithTasks = true;
        }
      } else {
        const courseInfo = (coursesList || []).find(c => c.kode_course === courseId);
        scanAllResults.push({
          kodeCourse: courseId,
          mataKuliah: courseInfo?.nama_mata_kuliah || data.mataKuliah,
          courseInfo,
          sks: courseInfo?.sks || 2,
          isLuring: !data.hasActivity,
          isDaring: !!data.hasActivity,
          isOfflineWithTasks: !!data.hasActivity,
          daringMeetings: data.hasActivity ? [secNum] : [],
          luringMeetings: [],
          hasAnyActivity: !!data.hasActivity,
          scannedMeetings: [{ ...data, meetingNum: secNum }]
        });
      }
    }

    updateFordisStatusPills(data);
    renderMetrics(data);
    renderMiddleTable(activeMiddleTab);
    updateWaPreview();
    updateFilterCounts();
    filterAndRenderStudentsTable();
    // Re-evaluate topbar countdown pill dan dot merah dropdown setelah fordis status diketahui
    startCountdown();
    refreshCourseDeadlineDots();

    const now = new Date();
    lastScanTime.textContent = now.toLocaleTimeString("id-ID", { hour12: false });
  } catch (err) {
    if (err.message.includes("403") || err.message.includes("401") || err.message.includes("Sesi")) {
      statusDot.className = "status-indicator-dot offline";
      statusValText.textContent = "Offline";
      statusValText.className = "status-val offline";
      reconnectBanner.classList.remove("hidden");
      showToast("⚠️ Sesi MENTARI terputus. Silakan klik 'Perbarui Sesi (Login)'.");
    } else {
      showToast(`Error: ${err.message}`);
    }
  } finally {
    btnScan.disabled = false;
    scanBtnText.textContent = "Cek Status";
  }
}

// ── 7. Scan All Active Courses ─────────────────────────────────────────────
async function performScanAll(isAutoRetry = false) {
  const week = selectWeek.value;
  btnScanAll.disabled = true;
  scanAllBtnText.textContent = "Memindai Semua...";

  try {
    const res = await fetch(`/api/scan-all?week=${encodeURIComponent(week)}`);
    const data = await res.json();

    const isSessionError = res.status === 401 || res.status === 403 || data.code === "SESSION_EXPIRED" || (data.error && (data.error.includes("403") || data.error.includes("401")));

    if (isSessionError) {
      statusDot.className = "status-indicator-dot offline";
      statusValText.textContent = "Offline";
      statusValText.className = "status-val offline";
      reconnectBanner.classList.remove("hidden");
      if (sessionStatusDetail) {
        sessionStatusDetail.textContent = "Offline (Perlu Login)";
        sessionStatusDetail.className = "badge-table-pill danger";
      }

      if (!isAutoRetry) {
        triggerAutoReconnect("Sesi MENTARI telah habis");
      } else {
        showToast("⚠️ Sesi MENTARI perlu diperbarui. Klik tombol 'Perbarui Sesi'.");
      }
      return;
    }

    if (!res.ok) throw new Error(data.error || "Gagal memindai seluruh matkul");

    // Successful scan: Mark status as Online
    statusDot.className = "status-indicator-dot online";
    statusValText.textContent = "Online";
    statusValText.className = "status-val online";
    reconnectBanner.classList.add("hidden");
    if (sessionStatusDetail) {
      sessionStatusDetail.textContent = "Online (Aktif)";
      sessionStatusDetail.className = "badge-table-pill success";
    }

    scanAllResults = data.results || [];

    // Auto-scan scheduled offline courses if scannedMeetings is empty (in case lecturer gave online tasks)
    const offlineToScan = scanAllResults.filter(r => 
      (!r.scannedMeetings || r.scannedMeetings.length === 0) &&
      r.luringMeetings && r.luringMeetings.length > 0
    );
    if (offlineToScan.length > 0) {
      await Promise.allSettled(offlineToScan.map(async (courseEntry) => {
        for (const mNum of courseEntry.luringMeetings) {
          if (mNum === "UTS" || mNum === "UAS") continue;
          try {
            const scanRes = await fetch(`/api/scan?course=${encodeURIComponent(courseEntry.kodeCourse)}&section=PERTEMUAN_${mNum}`);
            const scanData = await scanRes.json();
            if (scanData.hasActivity || scanData.forum?.available) {
              if (!courseEntry.scannedMeetings) courseEntry.scannedMeetings = [];
              courseEntry.scannedMeetings.push({ ...scanData, meetingNum: mNum, isLuringMeeting: true });
              courseEntry.hasAnyActivity = true;
              courseEntry.isLuring = false;
              courseEntry.isDaring = true;
              courseEntry.isOfflineWithTasks = true;
            }
          } catch (e) {}
        }
      }));
    }

    // Merge currentScanData if active
    if (currentScanData && (currentScanData.hasActivity || currentScanData.forum?.available)) {
      const match = scanAllResults.find(c => c.kodeCourse === currentScanData.kodeCourse || (selectCourse?.value && c.kodeCourse === selectCourse.value));
      if (match) {
        const secNum = parseInt((currentScanData.kodeSection || selectSection?.value || "1").replace("PERTEMUAN_", ""), 10);
        if (!match.scannedMeetings) match.scannedMeetings = [];
        const existingIdx = match.scannedMeetings.findIndex(m => m.meetingNum == secNum || m.kodeSection === currentScanData.kodeSection);
        if (existingIdx !== -1) {
          match.scannedMeetings[existingIdx] = { ...currentScanData, meetingNum: secNum };
        } else {
          match.scannedMeetings.push({ ...currentScanData, meetingNum: secNum });
        }
        match.hasAnyActivity = true;
        match.isLuring = false;
        match.isDaring = true;
        match.isOfflineWithTasks = true;
      }
    }
    updateWaPreview();
    refreshCourseDeadlineDots();
    showToast("Berhasil memindai seluruh mata kuliah aktif pekan ini.");
  } catch (err) {
    if (err.message.includes("403") || err.message.includes("401") || err.message.includes("Sesi")) {
      statusDot.className = "status-indicator-dot offline";
      statusValText.textContent = "Offline";
      statusValText.className = "status-val offline";
      reconnectBanner.classList.remove("hidden");
      showToast("⚠️ Sesi MENTARI terputus. Silakan klik 'Perbarui Sesi (Login)'.");
    } else {
      showToast(`Error: ${err.message}`);
    }
  } finally {
    btnScanAll.disabled = false;
    scanAllBtnText.textContent = "Scan Seluruh Matkul Daring";
  }
}

// ── 8. Render Metrics (5 Cards + Sidebar) ──────────────────────────────────
function renderMetrics(data) {
  const totalUtama = data.totalMahasiswaUtama || 37;
  infoTotalUtama.textContent = totalUtama;
  metricTotalUtama.textContent = totalUtama;

  const postDone = data.posttest?.doneCount || 0;
  const postPct = totalUtama > 0 ? Math.round((postDone / totalUtama) * 100) : 0;
  metricPostRatio.textContent = `${postDone} / ${totalUtama}`;
  metricPostPct.textContent = `${postPct}%`;
  progressPost.style.width = `${postPct}%`;

  const forumMemenuhi = data.forum?.memenuhiCount || 0;
  const forumPct = totalUtama > 0 ? Math.round((forumMemenuhi / totalUtama) * 100) : 0;
  metricForumRatio.textContent = `${forumMemenuhi} / ${totalUtama}`;
  metricForumPct.textContent = `${forumPct}%`;
  progressForum.style.width = `${forumPct}%`;

  const metricForumSub = document.getElementById("metricForumSub");
  if (metricForumSub) {
    if (data.forum?.hasMultipleTopics) {
      const needTop = data.forum.needTopicCount || 0;
      if (needTop > 0) {
        metricForumSub.innerHTML = `<span>${data.forum.topics?.length || 2} Topik</span> • <span style="color: #fde047; font-weight: 600;">⚠️ ${needTop} mhs ada topik kosong</span>`;
      } else {
        metricForumSub.textContent = `≥2x reply • ${data.forum.topics?.length || 2} Topik Lengkap`;
      }
    } else {
      metricForumSub.textContent = "Minimal 2x reply";
    }
  }

  const asgDone = data.assignment?.doneCount || 0;
  const asgPct = totalUtama > 0 ? Math.round((asgDone / totalUtama) * 100) : 0;
  const metricAsgSub = document.getElementById("metricAsgSub");
  if (!data.assignment?.available) {
    metricAsgRatio.textContent = "Tidak Ada";
    metricAsgPct.textContent = "-";
    progressAsg.style.width = "0%";
    if (metricAsgSub) {
      metricAsgSub.textContent = "Tidak ada tugas di pertemuan ini";
    }
  } else if (data.assignment?.is_private) {
    metricAsgRatio.textContent = "Ada Tugas";
    metricAsgPct.textContent = "📁";
    progressAsg.style.width = "100%";
    if (metricAsgSub) {
      metricAsgSub.innerHTML = `<span style="color: #60a5fa; font-weight: 500;">Tersedia di MENTARI (Privat)</span>`;
    }
  } else {
    metricAsgRatio.textContent = `${asgDone} / ${totalUtama}`;
    metricAsgPct.textContent = `${asgPct}%`;
    progressAsg.style.width = `${asgPct}%`;
    if (metricAsgSub) {
      metricAsgSub.textContent = "Sudah mengumpulkan";
    }
  }

  // Calculate unique main students with any incomplete task
  const problemStudents = (data.students || []).filter(m => !m.is_revisi && (
    m.posttest_status === "BELUM_MENGERJAKAN" ||
    m.forum_status === "BELUM_MEMENUHI" ||
    m.forum_status === "BELUM_MENGERJAKAN" ||
    m.has_unanswered_topic ||
    m.assignment_status === "BELUM_MENGUMPULKAN"
  ));
  const problemCount = problemStudents.length;
  const problemPct = totalUtama > 0 ? Math.round((problemCount / totalUtama) * 100) : 0;
  metricProblemCount.textContent = problemCount;
  metricProblemSub.textContent = `${problemPct}% dari total utama`;

  // View switcher badges
  const badgeMonitoringPending = document.getElementById("badgeMonitoringPending");
  if (badgeMonitoringPending) {
    if (problemCount > 0) {
      badgeMonitoringPending.textContent = problemCount;
      badgeMonitoringPending.classList.remove("hidden");
    } else {
      badgeMonitoringPending.classList.add("hidden");
    }
  }

  const badgeTotalStudents = document.getElementById("badgeTotalStudents");
  if (badgeTotalStudents) {
    badgeTotalStudents.textContent = totalUtama;
  }

  // Render quick highlights widget on dashboard
  renderQuickHighlights(data, problemStudents);

  // Sidebar mini counter
  numDonePost.textContent = postDone;
  numPendingPost.textContent = data.posttest?.pendingCount || (totalUtama - postDone);
}

// ── Render Quick Highlights Widget (Dashboard Overview) ────────────────────
function renderQuickHighlights(data, problemStudents) {
  const quickFordisBadge = document.getElementById("quickFordisBadge");
  const quickFordisTitle = document.getElementById("quickFordisTitle");
  const quickFordisDesc = document.getElementById("quickFordisDesc");
  const quickFollowupCount = document.getElementById("quickFollowupCount");
  const quickFollowupList = document.getElementById("quickFollowupList");

  if (!quickFollowupList) return;

  // 1. Fordis Status
  if (data.fordisNotOpened) {
    if (quickFordisBadge) {
      quickFordisBadge.textContent = "Belum Dibuka";
      quickFordisBadge.className = "badge-table-pill danger";
    }
    if (quickFordisTitle) quickFordisTitle.textContent = "Forum Diskusi Belum Dibuka";
    if (quickFordisDesc) quickFordisDesc.textContent = "Dosen pengampu belum membuat topik diskusi di portal MENTARI.";
  } else if (data.forum?.available) {
    const memenuhi = data.forum.memenuhiCount || 0;
    const total = data.totalMahasiswaUtama || 37;
    const isMulti = data.forum.hasMultipleTopics;
    const topicsCount = data.forum.topics?.length || 1;

    if (quickFordisBadge) {
      quickFordisBadge.textContent = isMulti ? `${topicsCount} Topik Aktif` : "Sudah Dibuka";
      quickFordisBadge.className = isMulti ? "badge-table-pill warning" : "badge-table-pill success";
    }
    if (quickFordisTitle) {
      quickFordisTitle.textContent = isMulti ? `Forum Diskusi (${topicsCount} Topik Dosen)` : "Forum Diskusi Aktif";
    }
    if (quickFordisDesc) {
      if (isMulti) {
        quickFordisDesc.textContent = `Dosen membuat ${topicsCount} topik. ${memenuhi} mhs memenuhi syarat (${data.forum.needTopicCount || 0} mhs ada topik kosong).`;
      } else {
        quickFordisDesc.textContent = `${memenuhi} dari ${total} mahasiswa utama sudah memenuhi syarat (≥2x reply).`;
      }
    }
  } else {
    if (quickFordisBadge) {
      quickFordisBadge.textContent = "Tidak Ada Fordis";
      quickFordisBadge.className = "badge-table-pill gray";
    }
    if (quickFordisTitle) quickFordisTitle.textContent = "Forum Diskusi";
    if (quickFordisDesc) quickFordisDesc.textContent = "Pertemuan ini tidak memiliki aktivitas forum diskusi.";
  }

  // 2. Quick Follow-Up List
  if (quickFollowupCount) {
    quickFollowupCount.textContent = `${problemStudents.length} Mahasiswa`;
  }

  if (problemStudents.length === 0) {
    quickFollowupList.innerHTML = `
      <div class="quick-empty-state" style="color: #34d399; font-weight: 600;">
        🎉 Luar biasa! Seluruh mahasiswa utama sudah menyelesaikan tugas pertemuan ini!
      </div>
    `;
    return;
  }

  const topStudents = problemStudents.slice(0, 9);
  quickFollowupList.innerHTML = topStudents.map(m => {
    const contact = classContacts[m.nim];
    const phone = contact?.phone || "-";
    const hasPhone = phone !== "-";
    const cleanPhone = hasPhone ? phone.replace(/[^0-9]/g, "") : "";

    const posttestOk = m.posttest_status !== "BELUM_MENGERJAKAN";
    const forumReplies = m.forum_reply_count || 0;
    const forumOk = m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2);
    const isRevisi = m.is_revisi || m.status_keanggotaan === "REVISI";

    return `
      <div class="quick-followup-item">
        <span class="quick-followup-nim">${m.nim}</span>
        <span class="quick-followup-name">${m.nama_mahasiswa}${isRevisi ? ' <span style="color:#fbbf24;font-size:9px;">(R)</span>' : ''}</span>
        <div class="quick-followup-actions">
          <span class="badge-mini ${posttestOk ? 'success' : 'danger'}">${posttestOk ? '✓' : '✕'} Post</span>
          <span class="badge-mini ${forumOk ? 'success' : 'warning'}">${forumReplies}x F</span>
        </div>
      </div>
    `;
  }).join("");

  if (problemStudents.length > 9) {
    const sisa = problemStudents.length - 9;
    quickFollowupList.innerHTML += `
      <div style="text-align: center; padding: 10px 0 2px 0;">
        <span onclick="switchMainView('monitoring')" style="color: #64748b; font-size: 11px; cursor: pointer; transition: color 0.15s;" onmouseover="this.style.color='#94a3b8'" onmouseout="this.style.color='#64748b'">
          +${sisa} mahasiswa lainnya
        </span>
      </div>
    `;
  }
}

// ── 9. Middle Tabbed Table Panel ───────────────────────────────────────────
function switchMiddleTab(tabName) {
  if (tabName === "revisi") tabName = "posttest";
  activeMiddleTab = tabName;

  if (tabAllMon) tabAllMon.classList.toggle("active", tabName === "all");
  tabPendingPost.classList.toggle("active", tabName === "posttest");
  if (tabDonePost) tabDonePost.classList.toggle("active", tabName === "done_posttest");
  tabPendingForum.classList.toggle("active", tabName === "forum");
  if (tabDoneForum) tabDoneForum.classList.toggle("active", tabName === "done_forum");
  tabPendingAsg.classList.toggle("active", tabName === "assignment");
  if (tabCompleteMon) tabCompleteMon.classList.toggle("active", tabName === "complete");
  const tabStatusFordisDosen = document.getElementById("tabStatusFordisDosen");
  if (tabStatusFordisDosen) tabStatusFordisDosen.classList.toggle("active", tabName === "status_fordis");
  if (tabPendingRevisi) tabPendingRevisi.classList.toggle("active", false);

  if (tabName === "all") {
    middlePanelTitle.textContent = "Semua Mahasiswa Kelas 05TPLE003";
  } else if (tabName === "complete") {
    middlePanelTitle.textContent = "Mahasiswa yang Sudah Menyelesaikan Posttest & Forum (Lengkap)";
  } else if (tabName === "posttest") {
    middlePanelTitle.textContent = "Mahasiswa yang belum menyelesaikan Posttest (Kuis)";
  } else if (tabName === "done_posttest") {
    middlePanelTitle.textContent = "Mahasiswa yang sudah menyelesaikan Posttest (Kuis)";
  } else if (tabName === "forum") {
    middlePanelTitle.textContent = "Mahasiswa yang Forum Diskusinya belum memenuhi (<2x reply)";
  } else if (tabName === "done_forum") {
    middlePanelTitle.textContent = "Mahasiswa yang Forum Diskusinya sudah memenuhi (≥2x reply)";
  } else if (tabName === "assignment") {
    middlePanelTitle.textContent = "Mahasiswa yang belum mengumpulkan Penugasan Terstruktur";
  } else if (tabName === "status_fordis") {
    middlePanelTitle.textContent = "Status Pembukaan Forum Diskusi Dosen (Fordis) — Seluruh Mata Kuliah";
  }

  renderMiddleTable(tabName);
}

function renderForumTopicsBanner(data, activeTab) {
  const container = document.getElementById("forumTopicsContainer");
  const countBadge = document.getElementById("forumTopicsCountBadge");
  const headerTitle = document.getElementById("forumTopicsHeaderTitle");
  const hintText = document.getElementById("forumTopicsHint");
  const list = document.getElementById("forumTopicsList");

  if (!container || !list) return;

  const topics = data?.forum?.topics || [];
  const isForumTab = activeTab === "forum" || activeTab === "done_forum" || activeTab === "status_fordis";

  if (!isForumTab || !data?.forum?.available || topics.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  const topicCount = topics.length;

  if (countBadge) {
    countBadge.textContent = `${topicCount} Topik Dosen`;
    countBadge.className = `badge-table-pill ${topicCount > 1 ? "warning" : "info"}`;
  }

  if (headerTitle) {
    headerTitle.textContent = topicCount > 1 
      ? `Terdeteksi ${topicCount} Topik Diskusi dari Dosen:` 
      : `Topik Diskusi Pertemuan Ini:`;
  }

  if (hintText) {
    hintText.textContent = topicCount > 1
      ? "Dosen membuat beberapa topik. Mahasiswa disarankan merespons tiap topik agar nilai tugas tidak kosong."
      : "Topik diskusi resmi dari dosen pengampu di MENTARI.";
  }

  list.innerHTML = topics.map((t, idx) => {
    const replies = t.reply_count || 0;
    const isNew = replies === 0;
    const badgeClass = isNew ? "warning" : "success";
    const badgeText = isNew ? "⚠️ 0 Balasan (Baru/Belum Dijawab)" : `${replies} Balasan`;

    let timeStr = "";
    if (t.createdAt) {
      try {
        const d = new Date(t.createdAt);
        timeStr = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      } catch (e) {}
    }

    return `
      <div class="forum-topic-card ${isNew ? 'highlight-new' : ''}">
        <div class="forum-topic-top">
          <div class="forum-topic-name">
            <span style="color: #60a5fa; font-weight: 700; margin-right: 4px;">[Topik ${idx + 1}]</span>
            ${t.judul}
          </div>
          <span class="tag-topic-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="forum-topic-meta">
          ${timeStr ? `<span>🕒 Diposting: ${timeStr} WIB</span>` : ''}
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim);">ID: ${t.id ? t.id.slice(0, 8) + '...' : '-'}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderMiddleTable(tabName) {
  const thead = document.getElementById("middleTableHead");
  if (tabName === "status_fordis") {
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th style="width: 40px;">NO</th>
          <th style="width: 120px;">KODE</th>
          <th>MATA KULIAH</th>
          <th style="width: 180px; text-align: center;">STATUS FORDIS</th>
          <th style="width: 140px; text-align: right;">AKSI</th>
        </tr>
      `;
    }
    renderFordisStatusMiddleTable();
    return;
  }

  if (thead) {
    thead.innerHTML = `
      <tr>
        <th style="width: 40px;">NO</th>
        <th style="width: 135px;">NIM</th>
        <th>NAMA MAHASISWA</th>
        <th style="width: 185px;">NOMOR WA</th>
        <th style="width: 170px; text-align: right;">STATUS</th>
      </tr>
    `;
  }

  if (!currentScanData) {
    middleTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center empty-cell">
          Pilih mata kuliah dan klik <strong>Cek Status</strong> untuk memuat data.
        </td>
      </tr>
    `;
    return;
  }

  const data = currentScanData;
  renderForumTopicsBanner(data, tabName);
  const allStudents = data.students || [];

  const pendingPost = allStudents.filter(m => m.posttest_status === "BELUM_MENGERJAKAN");
  const donePost = allStudents.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN");
  const needForum = allStudents.filter(m => m.forum_status === "BELUM_MEMENUHI" || m.forum_status === "BELUM_MENGERJAKAN");
  const doneForum = allStudents.filter(m => m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2));
  const pendingAsg = allStudents.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN");
  const completeStudents = allStudents.filter(m => {
    const isPostDone = m.posttest_status === "SUDAH_MENGERJAKAN";
    const isForumDone = m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2);
    return isPostDone && isForumDone && !m.has_unanswered_topic;
  });

  if (tabCountAll) tabCountAll.textContent = `(${allStudents.length})`;
  tabCountPost.textContent = `(${pendingPost.length})`;
  if (tabCountDonePost) tabCountDonePost.textContent = `(${donePost.length})`;
  tabCountForum.textContent = `(${needForum.length})`;
  if (tabCountDoneForum) tabCountDoneForum.textContent = `(${doneForum.length})`;
  if (data.assignment?.is_private) {
    tabCountAsg.textContent = "🔒";
    tabCountAsg.title = "Dibatasi Privasi MENTARI";
  } else {
    tabCountAsg.textContent = `(${pendingAsg.length})`;
    tabCountAsg.title = "";
  }
  if (tabCountComplete) tabCountComplete.textContent = `(${completeStudents.length})`;
  if (tabCountRevisi) tabCountRevisi.textContent = "(0)";

  middleTableBody.innerHTML = "";

  let listToRender = [];
  let statusBadgeClass = "danger";
  let statusLabelFn = (m) => "Belum Mengerjakan";

  if (tabName === "all") {
    listToRender = allStudents;
    statusBadgeClass = "info";
    statusLabelFn = (m) => {
      const isPostDone = m.posttest_status === "SUDAH_MENGERJAKAN";
      const isForumDone = m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2);
      if (isPostDone && isForumDone && !m.has_unanswered_topic) return "Lengkap";
      if (!isPostDone && !isForumDone) return "Belum Post & Forum";
      if (!isPostDone) return "Belum Posttest";
      if (!isForumDone) return m.forum_reply_count === 1 ? "Forum 1x Reply" : "Belum Forum";
      if (m.has_unanswered_topic) return "Kurang Topik";
      return "Lengkap";
    };
  } else if (tabName === "complete") {
    listToRender = completeStudents;
    statusBadgeClass = "success";
    statusLabelFn = () => "Lengkap";
  } else if (tabName === "posttest") {
    listToRender = pendingPost;
    statusLabelFn = () => "Belum Mengerjakan";
    statusBadgeClass = "danger";
  } else if (tabName === "done_posttest") {
    listToRender = donePost;
    statusLabelFn = () => "Sudah Mengerjakan";
    statusBadgeClass = "success";
  } else if (tabName === "forum") {
    listToRender = needForum;
    statusLabelFn = (m) => m.forum_reply_count === 1 ? "Baru 1x Reply" : "0x Reply (Belum)";
    statusBadgeClass = "warning";
  } else if (tabName === "done_forum") {
    listToRender = doneForum;
    statusLabelFn = (m) => `Memenuhi (${m.forum_reply_count || 2}x Reply)`;
    statusBadgeClass = "success";
  } else if (tabName === "assignment") {
    listToRender = pendingAsg;
    statusLabelFn = () => "Belum Mengumpulkan";
    statusBadgeClass = "warning";
  }

  // Filter with searchStudent if query entered
  const queryMon = (searchStudent?.value || "").trim().toLowerCase();
  if (queryMon) {
    listToRender = listToRender.filter(m =>
      (m.nama_mahasiswa || "").toLowerCase().includes(queryMon) ||
      String(m.nim || "").includes(queryMon)
    );
  }

  viewAllCount.textContent = `${listToRender.length} mahasiswa`;

  if (listToRender.length === 0) {
    let emptyMsg = "Semua mahasiswa sudah menyelesaikan bagian ini.";
    if (tabName.startsWith("done_")) {
      emptyMsg = "Belum ada mahasiswa yang menyelesaikan bagian ini.";
    }
    if ((tabName === "forum" || tabName === "done_forum") && !data.forum?.available) {
      emptyMsg = "⚠️ Forum Diskusi belum dibuka dosen di MENTARI. Belum ada topik diskusi yang bisa dikerjakan.";
    }
    if (tabName === "assignment" && data.assignment?.is_private) {
      emptyMsg = `
        <div style="padding: 20px; max-width: 560px; margin: 0 auto; text-align: center;">
          <div style="font-size: 28px; margin-bottom: 8px;">🔒</div>
          <div style="font-weight: 700; font-size: 15px; color: #f8fafc; margin-bottom: 8px;">Privasi File Penugasan MENTARI Aktif</div>
          <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
            Portal MENTARI membatasi hak akses file tugas antar mahasiswa (hanya mengizinkan melihat file kiriman sendiri).<br>
            TugasKu tidak menampilkan daftar 35 nama mahasiswa agar tidak terjadi salah tuduh, dan menyediakan pengingat ramah & elegan pada draf WhatsApp grup.
          </div>
        </div>
      `;
    }
    middleTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center empty-cell">
          ${emptyMsg}
        </td>
      </tr>
    `;
    return;
  }

  listToRender.forEach((m, idx) => {
    const row = document.createElement("tr");
    const contact = classContacts[m.nim];
    const phone = contact?.phone || "-";
    const waLink = phone !== "-"
      ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" class="wa-phone-link" title="Chat WhatsApp: ${phone}">
          <svg class="icon-xs" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>${phone}</span>
         </a>`
      : `<span style="color: #475569; font-size: 12px;">—</span>`;

    let cellStatusContent = `<span class="badge-table-pill ${statusBadgeClass}">${statusLabelFn(m)}</span>`;

    // Badge tambahan di samping nama (misal: revisi, late, dll) — kosong secara default
    let revisiBadge = "";
    if (m.assignment_status === "LATE" || m.is_late) {
      revisiBadge = `<span class="badge-table-pill warning" style="font-size:10px;padding:2px 6px;">Terlambat</span>`;
    } else if (m.assignment_status === "REVISION" || m.needs_revision) {
      revisiBadge = `<span class="badge-table-pill danger" style="font-size:10px;padding:2px 6px;">Revisi</span>`;
    }


    if (tabName === "all") {
      const lbl = statusLabelFn(m);
      let pillClass = "warning";
      if (lbl === "Lengkap") pillClass = "success";
      else if (lbl.startsWith("Belum Post")) pillClass = "danger";
      cellStatusContent = `<span class="badge-table-pill ${pillClass}">${lbl}</span>`;
    }

    if (tabName === "done_forum" || tabName === "forum") {
      let bClass = statusBadgeClass;
      let bLabel = statusLabelFn(m);

      const missingLabels = (m.missing_topics || []).map(mt => {
        const idx = (data.forum?.topics || []).findIndex(ft => ft.id === mt.id);
        return idx !== -1 ? `Topik ${idx + 1}` : "Topik Dosen";
      }).join(", ");

      if (tabName === "done_forum") {
        if (m.has_unanswered_topic) {
          bClass = "warning";
          bLabel = `${m.forum_reply_count || 2}x Reply (⚠️ Kurang ${missingLabels || 'Topik'})`;
        } else {
          bClass = "success";
          bLabel = `Memenuhi (${m.forum_reply_count || 2}x Reply)`;
        }
      }

      let subHtml = "";
      if (m.forum_topics_breakdown && m.forum_topics_breakdown.length > 1) {
        const breakdownStr = m.forum_topics_breakdown.map((tb, i) => `T${i + 1}: ${tb.count}x`).join(" • ");
        let missingTag = "";
        if (m.missing_topics && m.missing_topics.length > 0) {
          missingTag = `<div class="tag-topic-warning-pill">Belum ${missingLabels}</div>`;
        }
        subHtml = `
          <div class="topic-breakdown-sub">${breakdownStr}</div>
          ${missingTag}
        `;
      }

      cellStatusContent = `
        <div class="topic-breakdown-cell">
          <span class="badge-table-pill ${bClass}">${bLabel}</span>
          ${subHtml}
        </div>
      `;
    }

    row.innerHTML = `
      <td>${idx + 1}</td>
      <td class="td-nim">${m.nim}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px;">
          <strong style="color: #f1f5f9;">${m.nama_mahasiswa}</strong>
          ${revisiBadge}
        </div>
      </td>
      <td>${waLink}</td>
      <td style="text-align: right;">${cellStatusContent}</td>
    `;
    middleTableBody.appendChild(row);
  });
}

// ── 10. Draft Pengingat (WhatsApp & Telegram) ──────────────────────────────
function updateDraftNamesToggleUI() {
  const btnOn = document.getElementById("btnNamesOn");
  const btnOff = document.getElementById("btnNamesOff");
  if (btnOn && btnOff) {
    if (waIncludeStudentNames) {
      btnOn.classList.add("active");
      btnOff.classList.remove("active");
    } else {
      btnOff.classList.add("active");
      btnOn.classList.remove("active");
    }
  }
  const switchBtn = document.getElementById("btnToggleNamesSwitch");
  if (switchBtn) {
    switchBtn.classList.toggle("active", !!waIncludeStudentNames);
  }
  const switchPhone = document.getElementById("btnTogglePhoneSwitch");
  if (switchPhone) {
    switchPhone.classList.toggle("active", !!waIncludePhoneNumbers);
  }
  const switchNum = document.getElementById("btnToggleNumberingSwitch");
  if (switchNum) {
    switchNum.classList.toggle("active", !!waIncludeNumbering);
  }

  const phoneGroup = document.getElementById("draftPhoneToggleGroup");
  const numGroup = document.getElementById("draftNumberingToggleGroup");
  if (phoneGroup) {
    phoneGroup.style.opacity = waIncludeStudentNames ? "1" : "0.35";
    phoneGroup.style.pointerEvents = waIncludeStudentNames ? "auto" : "none";
  }
  if (numGroup) {
    numGroup.style.opacity = waIncludeStudentNames ? "1" : "0.35";
    numGroup.style.pointerEvents = waIncludeStudentNames ? "auto" : "none";
  }

  const selectDraft = document.getElementById("selectDraftIncludeNames");
  if (selectDraft) {
    selectDraft.value = waIncludeStudentNames ? "true" : "false";
  }
}

function formatDraftText(rawText) {
  if (!rawText) return "";
  let text = rawText;

  // 1. Sembunyikan Nomor Telepon/HP jika toggle dinonaktifkan
  if (!waIncludePhoneNumbers) {
    // Pola standar: @62812345678 (NAMA MAHASISWA) -> NAMA MAHASISWA
    text = text.replace(/@\+?\d{7,16}\s*\(([^)]+)\)/g, "$1");
    // Pola tanpa tanda kurung: @62812345678 -> bersihkan tag nomor
    text = text.replace(/@\+?\d{7,16}\s*/g, "");
  }

  // 2. Sembunyikan Nomor Urut (1., 2., 3.) jika toggle dinonaktifkan
  if (!waIncludeNumbering) {
    // Ganti nomor baris daftar (1. , 2. , dst) menjadi tanda bullet point
    text = text.replace(/^(\s*)\d+\.\s+/gm, "$1• ");
  }

  return text;
}

function updateDraftNamesToggleVisibility() {
  const group = document.getElementById("draftNamesToggleGroup");
  if (group) {
    group.style.display = "flex";
  }
}

function generateMatkulSummaryText(data) {
  if (!data) return "";
  if (data.waTemplateSummary) return data.waTemplateSummary;

  const courseCode = selectCourse?.value || data.kodeCourse || "";
  const cDead = getCourseDeadline(courseCode);
  const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";

  const courseInfo = (coursesList || []).find(c => c.kode_course === courseCode);
  const cleanMataKuliah = courseInfo?.nama_mata_kuliah || data.mataKuliah?.replace(/^\[\d+\]\s*/, '').split('#')[0].trim() || "MATA KULIAH";
  const cleanSection = (data.kodeSection || selectSection?.value || "PERTEMUAN_1").replace(/^PERTEMUAN_/, "Pert. ");

  let txt = `> ${cleanMataKuliah}\n`;
  txt += `*${cleanSection}* • *Deadline: ${cDead.text}*${todayBadge}\n\n`;

  const forumAvailable = data.forum?.available || false;
  const posttestAvailable = data.posttest?.available || false;
  const assignmentAvailable = data.assignment?.available || false;
  const isAssignmentPrivate = data.assignment?.is_private || false;
  const asgTitle = data.assignment?.title || "Penugasan Terstruktur";

  if (!data.hasActivity || !forumAvailable) {
    txt += `ℹ️ *Forum Diskusi belum dibuka dosen.*\nCatatan tugas akan muncul setelah fordis aktif.\n\n`;
    if (assignmentAvailable) {
      txt += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        txt += `• *Tugas:* ${asgTitle}\n`;
      }
      txt += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
    }
  } else {
    const topics = data.forum?.topics || [];
    if (topics.length > 1) {
      txt += `📌 *Topik Diskusi Dosen (${topics.length} Topik):*\n`;
      topics.forEach((t, i) => {
        const replyTag = t.reply_count === 0 ? "*(⚠️ Baru/0 balasan)*" : `(${t.reply_count} balasan)`;
        txt += `${i + 1}. ${t.judul} ${replyTag}\n`;
      });
      txt += `\n`;
    }

    if (assignmentAvailable) {
      txt += `📁 *Penugasan Terstruktur: ADA (Aktif)*\n`;
      if (asgTitle && asgTitle.toLowerCase() !== "penugasan terstruktur") {
        txt += `• *Tugas:* ${asgTitle}\n`;
      }
      if (isAssignmentPrivate) {
        txt += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini. Pastikan tugas Anda sudah disubmit di portal MENTARI sebelum deadline!_\n\n`;
      } else if (data.assignment?.pendingCount === 0) {
        txt += `✅ _Seluruh mahasiswa sudah mengumpulkan tugas._\n\n`;
      } else {
        txt += `⚠️ _Terdapat penugasan terstruktur dari dosen pada pertemuan ini (${data.assignment?.pendingCount || 0} mahasiswa belum mengumpulkan)._\n\n`;
      }
    }

    const needForumCount = data.forum?.needForumStudents?.length || data.forum?.belumMemenuhiCount || 0;
    if (needForumCount > 0) {
      txt += `💬 *Forum Diskusi:* ${needForumCount} Mahasiswa belum memenuhi (<2x reply)\n\n`;
    } else {
      txt += `✅ *Forum Diskusi:* Seluruh mahasiswa sudah memenuhi minimal 2x reply.\n\n`;
    }

    const needTopicCount = data.forum?.needTopicCount || data.forum?.needTopicStudents?.length || 0;
    if (needTopicCount > 0) {
      txt += `⚠️ *Topik Diskusi Belum Lengkap:* ${needTopicCount} Mahasiswa belum mengisi seluruh topik dosen.\n\n`;
    }

    if (assignmentAvailable && !isAssignmentPrivate && (data.assignment?.pendingCount || 0) > 0) {
      txt += `📁 *Penugasan Terstruktur:* ${data.assignment.pendingCount} Mahasiswa belum mengumpulkan.\n\n`;
    }

    const pendingPostCount = data.posttest?.pendingCount || data.posttest?.pendingStudents?.length || 0;
    if (posttestAvailable && pendingPostCount > 0) {
      txt += `❌ *Posttest:* ${pendingPostCount} Mahasiswa belum mengerjakan.\n\n`;
    } else if (!posttestAvailable) {
      txt += `⚠️ *Posttest:* Belum dibuka dosen.\n\n`;
    } else {
      txt += `✅ *Posttest:* Seluruh mahasiswa sudah mengerjakan.\n\n`;
    }

    if (pendingPostCount === 0 && needForumCount === 0 && needTopicCount === 0 && (!assignmentAvailable || (!isAssignmentPrivate && (data.assignment?.pendingCount || 0) === 0))) {
      txt += `🎉 *Semua tugas mahasiswa sudah lengkap!*\n\n`;
    }
  }

  const flowSteps = ["Fordis (2x)"];
  if (assignmentAvailable) flowSteps.push("Penugasan Terstruktur");
  flowSteps.push("Posttest", "Kuesioner (absensi valid)");
  txt += `⚠️ *Catatan Wajib:*\n${flowSteps.join(" ➔ ")}`;

  return txt;
}

function updateWaPreview() {
  const draftMatkulTitle = document.getElementById("draftMatkulTitleDisplay");
  const draftMatkulSub = document.getElementById("draftMatkulSubDisplay");
  const activeCourseId = selectCourse?.value;
  const activeSection = selectSection?.value || "PERTEMUAN_1";
  const cInfo = (coursesList || []).find(c => c.kode_course === activeCourseId);
  const rawCourseName = cInfo?.nama_mata_kuliah || cInfo?.coursename || activeCourseId || "Mata Kuliah";
  const courseTitle = formatCourseTitle(rawCourseName);
  const secLabel = activeSection.replace("PERTEMUAN_", "Pertemuan ");

  if (draftMatkulTitle) {
    draftMatkulTitle.textContent = courseTitle;
  }
  if (draftMatkulSub) {
    draftMatkulSub.textContent = `${secLabel} · Format WhatsApp`;
  }

  if (activeWaTab === "matkul") {
    // Periksa apakah data scan yang tersedia cocok dengan matkul & pertemuan yang sedang aktif
    const isDataMatching = currentScanData &&
      (currentScanData.kodeCourse === activeCourseId || (cInfo && currentScanData.mataKuliah && currentScanData.mataKuliah.includes(cInfo.nama_mata_kuliah))) &&
      (currentScanData.kodeSection === activeSection || !currentScanData.kodeSection);

    if (isDataMatching && currentScanData.waTemplate) {
      const cDead = getCourseDeadline(activeCourseId);
      const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";

      let baseTemplate;
      if (waIncludeStudentNames) {
        baseTemplate = currentScanData.waTemplate;
      } else {
        baseTemplate = currentScanData.waTemplateSummary || generateMatkulSummaryText(currentScanData);
      }

      const updatedText = baseTemplate.replace(/\*Deadline:[^\n]*/, `*Deadline: ${cDead.text}*${todayBadge}`);
      waMessageContent.textContent = formatDraftText(updatedText);
    } else {
      // Jika data belum sesuai atau sedang berpindah matkul, tampilkan status pemindaian langsung
      waMessageContent.textContent = `⏳ *Sedang memindai ${courseTitle} (${secLabel})...*\n\nMohon tunggu sebentar, draf WhatsApp akan otomatis diperbarui begitu proses pemindaian selesai.`;

      // Jika belum sedang proses scan, picu scan secara otomatis tanpa user perlu klik apa pun!
      if (scanBtnText && scanBtnText.textContent !== "Memeriksa..." && activeCourseId) {
        performScan();
      }
    }
  } else if (activeWaTab === "today") {
    renderGrupUtamaMessage(true);
  } else {
    renderGrupUtamaMessage(false);
  }
}

function renderGrupUtamaMessage(isTodayOnly = false) {
  const weekVal = selectWeek.value;
  const weekLabel = WEEK_NAMES[weekVal] || `Pekan ${weekVal}`;
  const className = currentClassSettings?.class_name || "05TPLE003";
  const deadlineStr = `${currentClassSettings?.deadline_day || "Jumat"}, ${currentClassSettings?.deadline_time || "23:59 WIB"}`;
  const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayName = DAYS_ID[new Date().getDay()];

  if (!scanAllResults || scanAllResults.length === 0) {
    waMessageContent.textContent = `*📢 REKAP TUGAS MENTARI — ${className}*\n_${weekLabel}_\n\nSedang memindai seluruh mata kuliah aktif pekan ini...`;
    performScanAll();
    return;
  }

  const activeDaringWithTasks = [];
  const luringCourses = [];
  const fordisBlumDibuka = [];

  scanAllResults.forEach(res => {
    // SYARAT MUTLAK: Hanya dianggap aktif jika FORDIS SUDAH DIBUKA DOSEN (atau ada penugasan terstruktur)
    // Kalo belum ada fordis (hanya ada slot posttest kosong), JANGAN ditongolin dulu!
    const activeMeetings = (res.scannedMeetings || []).filter(m => 
      m.forum?.available || m.assignment?.available
    );

    if (activeMeetings.length > 0) {
      activeDaringWithTasks.push({ ...res, activeMeetings });
      return;
    }

    // Jika belum ada fordis dibuka dosen:
    // Matkul yang terjadwal daring dimasukkan ke fordisBlumDibuka
    const isScheduledDaring = (res.daringMeetings && res.daringMeetings.length > 0) || (res.isDaring && !res.isOfflineWithTasks && !res.isLuring);
    if (isScheduledDaring) {
      fordisBlumDibuka.push(res);
    } else {
      luringCourses.push(res);
    }
  });

  const coursesToRender = isTodayOnly
    ? activeDaringWithTasks.filter(res => getCourseDeadline(res.kodeCourse).isToday)
    : activeDaringWithTasks;

  if (isTodayOnly && coursesToRender.length === 0) {
    waMessageContent.textContent = `*📢 PENGINGAT DEADLINE HARI INI (${todayName.toUpperCase()})*\n*Kelas ${className}* • _${weekLabel}_\n\n🎉 *Tidak ada mata kuliah daring yang memiliki batas deadline pada hari ini (${todayName}).*\n\nSilakan beralih ke tab "Grup Utama (Semua)" untuk melihat rekap jadwal seluruh mata kuliah pekan ini.`;
    return;
  }

  // Build {LIST_MATKUL_DARING} string
  let listMatkulDaringStr = "";
  if (coursesToRender.length > 0) {
    coursesToRender.forEach((res) => {
      const name = res.mataKuliah || "Mata Kuliah";
      const sks = res.sks || 2;
      const cDead = getCourseDeadline(res.kodeCourse);
      const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";
      listMatkulDaringStr += `> ${name} (${sks} SKS)\n`;
      listMatkulDaringStr += `*Deadline: ${cDead.text}*${todayBadge}\n`;
      res.activeMeetings.forEach(m => {
        const pNum = m.meetingNum || "1";
        const forum = m.forum;
        const post = m.posttest;
        const asg = m.assignment;
        const forumTxt = forum?.available ? (forum.needForumStudents?.length > 0 ? `${forum.needForumStudents.length} Mahasiswa belum` : `Semua Mahasiswa selesai ✅`) : null;
        const postTxt = post?.available ? (post.pendingCount > 0 ? `${post.pendingCount} Mahasiswa belum` : `Semua Mahasiswa selesai ✅`) : null;
        listMatkulDaringStr += `  • *Pertemuan ${pNum}:*\n`;
        if (forumTxt) {
          listMatkulDaringStr += `  - Fordis: ${forumTxt}\n`;
        }
        if (asg?.available) {
          if (asg.is_private) {
            listMatkulDaringStr += `  - Penugasan Terstruktur: Ada Tugas Aktif 📁\n`;
          } else if (asg.pendingCount > 0) {
            listMatkulDaringStr += `  - Penugasan Terstruktur: ${asg.pendingCount} Mahasiswa belum\n`;
          } else {
            listMatkulDaringStr += `  - Penugasan Terstruktur: Semua Mahasiswa selesai ✅\n`;
          }
        }
        if (postTxt) {
          listMatkulDaringStr += `  - Posttest: ${postTxt}\n`;
        }
      });
      listMatkulDaringStr += `\n`;
    });
  } else {
    listMatkulDaringStr = `Belum ada tagihan tugas atau forum e-learning yang dibuka dosen di MENTARI untuk pekan ini.\n\n`;
  }

  // Build {LIST_FORDIS_BELUM_BUKA} string (only in non-today mode)
  let listFordisBelumStr = "";
  if (!isTodayOnly && fordisBlumDibuka.length > 0) {
    listFordisBelumStr += `*Fordis Belum Dibuka Dosen:*\n`;
    fordisBlumDibuka.forEach(res => {
      listFordisBelumStr += `> ${res.mataKuliah}\n`;
    });
    listFordisBelumStr += `\n`;
  }

  // Apply custom template from settings
  let rawTemplate = currentClassSettings?.templates?.grup_utama || `*📢 REKAP TUGAS MENTARI*\n*Kelas {NAMA_KELAS}* • _{PEKAN}_\n\n{LIST_MATKUL_DARING}\n{LIST_FORDIS_BELUM_BUKA}\n⚠️ *Alur Absensi Valid:*\nFordis (min 2x) ➔ Posttest ➔ Kuesioner`;
  if (isTodayOnly) {
    rawTemplate = `*📢 PENGINGAT DEADLINE HARI INI (${todayName.toUpperCase()})*\n*Kelas {NAMA_KELAS}* • _{PEKAN}_\n\n⚠️ *PERHATIAN:* Berikut mata kuliah daring dengan batas deadline malam ini:\n\n{LIST_MATKUL_DARING}\n⚠️ *Alur Absensi Valid:*\nFordis (min 2x) ➔ Posttest ➔ Kuesioner`;
  }

  let rendered = rawTemplate
    .replace(/{NAMA_KELAS}/g, className)
    .replace(/{PEKAN}/g, weekLabel)
    .replace(/{DEADLINE}/g, deadlineStr)
    .replace(/{LIST_MATKUL_DARING}/g, listMatkulDaringStr ? listMatkulDaringStr.trim() + "\n\n" : "")
    .replace(/{LIST_FORDIS_BELUM_BUKA}/g, listFordisBelumStr ? listFordisBelumStr.trim() + "\n\n" : "");

  rendered = rendered.replace(/\n{3,}/g, "\n\n").trim();
  waMessageContent.textContent = formatDraftText(rendered);
}

function copyWaDraft() {
  const text = waMessageContent.textContent;
  if (!text || text.startsWith("*Pilih")) {
    showToast("Belum ada draft siap salin.");
    return;
  }
  navigator.clipboard.writeText(text);
  const copyBtnText = document.getElementById("copyBtnText");
  if (copyBtnText) {
    copyBtnText.textContent = "Tersalin!";
    setTimeout(() => { copyBtnText.textContent = "Salin Teks"; }, 2000);
  }
  let group = "Grup Matkul";
  if (activeWaTab === "utama") group = "Grup Utama Kelas (Semua)";
  else if (activeWaTab === "today") group = "Grup Utama Kelas (Deadline Hari Ini)";
  showToast(`Draft untuk ${group} berhasil disalin ke clipboard.`);
}

function openWhatsAppDirect() {
  const text = waMessageContent.textContent;
  if (!text || text.startsWith("*Pilih")) {
    showToast("Belum ada draft siap kirim.");
    return;
  }
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
}

async function sendCurrentWaToTelegram() {
  const text = waMessageContent.textContent;
  if (!text || text.startsWith("*Pilih")) {
    showToast("Belum ada draft siap kirim.");
    return;
  }
  btnSendWaToTelegram.disabled = true;
  btnSendWaToTelegram.textContent = "Mengirim...";
  try {
    const res = await fetch("/api/telegram/send-rekap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.success) showToast("Rekap berhasil terkirim ke Telegram.");
    else showToast(`Gagal: ${data.error}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnSendWaToTelegram.disabled = false;
    btnSendWaToTelegram.innerHTML = `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Kirim ke Telegram</span>`;
  }
}

// ── 11. Full Students Table & Pagination ───────────────────────────────────
// ── 11. Master Data Mahasiswa Table & Pagination ───────────────────────────
function updateFilterCounts() {
  const total = Object.keys(classContacts || {}).length;
  if (filterAllCount) filterAllCount.textContent = total;
}

function filterAndRenderStudentsTable() {
  if (!tableStudentsBody) return;
  tableStudentsBody.innerHTML = "";

  // Ambil data master mahasiswa dari classContacts
  let masterList = Object.keys(classContacts || {}).map(nim => {
    const c = classContacts[nim] || {};
    return {
      nim,
      nama: typeof c === "string" ? c : (c.nama || c.name || nim),
      phone: typeof c === "object" ? (c.phone || "") : "",
      type: typeof c === "object" ? (c.type || "UTAMA") : "UTAMA"
    };
  });

  // Jika classContacts masih kosong, fallback ke currentStudentsList
  if (masterList.length === 0 && currentStudentsList && currentStudentsList.length > 0) {
    masterList = currentStudentsList.map(s => ({
      nim: s.nim,
      nama: s.nama_mahasiswa || s.nim,
      phone: "",
      type: s.is_revisi ? "REVISI" : "UTAMA"
    }));
  }

  // Filter pencarian nama / NIM / No HP
  if (masterStudentSearchQuery) {
    masterList = masterList.filter(m => {
      const matchName = (m.nama || "").toLowerCase().includes(masterStudentSearchQuery);
      const matchNim = (m.nim || "").toLowerCase().includes(masterStudentSearchQuery);
      const matchPhone = (m.phone || "").includes(masterStudentSearchQuery);
      return matchName || matchNim || matchPhone;
    });
  }

  // Urutkan: Mahasiswa UTAMA terlebih dahulu (A-Z), disusul Mahasiswa REVISI (A-Z)
  masterList.sort((a, b) => {
    const isRevisiA = a.type === "REVISI" ? 1 : 0;
    const isRevisiB = b.type === "REVISI" ? 1 : 0;
    if (isRevisiA !== isRevisiB) return isRevisiA - isRevisiB;
    const nameA = (a.nama || "").trim().toUpperCase();
    const nameB = (b.nama || "").trim().toUpperCase();
    return nameA.localeCompare(nameB, "id");
  });

  const totalFiltered = masterList.length;
  const pageItems = masterList; // Tampilkan seluruh mahasiswa sekaligus tanpa pagination

  if (paginationInfo) {
    paginationInfo.textContent = totalFiltered > 0
      ? `Menampilkan seluruh ${totalFiltered} mahasiswa`
      : `Menampilkan 0 mahasiswa`;
  }

  if (paginationControls) {
    paginationControls.innerHTML = "";
  }

  if (pageItems.length === 0) {
    tableStudentsBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center empty-cell" style="padding: 30px; color: #94a3b8;">
          ${masterStudentSearchQuery ? `Tidak ada mahasiswa yang cocok dengan pencarian "<strong>${masterStudentSearchQuery}</strong>"` : `Belum ada data mahasiswa terdaftar.`}
        </td>
      </tr>
    `;
    return;
  }

  pageItems.forEach((m, idx) => {
    const row = document.createElement("tr");
    const isCurrentUser = (currentPersonalNim && m.nim === currentPersonalNim) ||
      (currentPersonalName && m.nama && m.nama.toLowerCase().trim() === currentPersonalName.toLowerCase().trim());
    const userTag = isCurrentUser ? `<span class="tag-user-anda">Anda</span>` : "";
    const phoneClean = (m.phone || "").replace(/[^0-9]/g, "");

    // Status button (Utama vs Revisi)
    const isRevisi = m.type === "REVISI";
    const statusBtn = isRevisi
      ? `<button type="button" class="tag-badge-revisi cursor-pointer" onclick="toggleStudentType('${m.nim}')" title="Klik untuk beralih status ke UTAMA" style="background: rgba(245,158,11,0.15); color: #fbbf24; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.3); cursor: pointer;">Revisi</button>`
      : `<button type="button" class="tag-badge-utama cursor-pointer" onclick="toggleStudentType('${m.nim}')" title="Klik untuk beralih status ke REVISI" style="background: rgba(99,102,241,0.15); color: #818cf8; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(99,102,241,0.3); cursor: pointer;">Utama</button>`;

    // WhatsApp column
    const waDisplay = phoneClean
      ? `<a href="https://wa.me/${phoneClean}" target="_blank" class="wa-phone-link" title="Kirim Pesan WhatsApp (${m.phone})" style="color: #34d399; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-family: 'JetBrains Mono', monospace; font-size: 12px;">
          <svg class="icon-xs" style="width: 14px; height: 14px; color: #10b981;" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>${m.phone}</span>
        </a>`
      : `<span style="color: #64748b; font-size: 12px;">—</span>`;

    // Action buttons: Chat WA icon + Edit button + Delete button
    const waActionBtn = phoneClean
      ? `<a href="https://wa.me/${phoneClean}" target="_blank" title="Chat WhatsApp (${m.phone})" class="btn-wa-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); text-decoration: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </a>`
      : ``;

    const editActionBtn = `
      <button type="button" class="btn-edit-student" onclick="openEditStudentModal('${m.nim}')" title="Edit data mahasiswa" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25); cursor: pointer; transition: all 0.15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
    `;

    const deleteActionBtn = `
      <button type="button" class="btn-delete-student" onclick="deleteMasterStudent('${m.nim}')" title="Hapus mahasiswa dari kelas" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); cursor: pointer; transition: all 0.15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    row.innerHTML = `
      <td style="text-align: center; color: #94a3b8; font-size: 12px;">${idx + 1}</td>
      <td style="font-family: 'JetBrains Mono', monospace; color: #cbd5e1; font-weight: 500;">${m.nim}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <strong style="color: #f8fafc;">${m.nama}</strong>
          ${userTag}
        </div>
      </td>
      <td style="text-align: center;">${statusBtn}</td>
      <td>${waDisplay}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
          ${waActionBtn}
          ${editActionBtn}
          ${deleteActionBtn}
        </div>
      </td>
    `;
    tableStudentsBody.appendChild(row);
  });

  const badgeTotalCount = document.getElementById("badgeTotalStudentsCount");
  if (badgeTotalCount) {
    badgeTotalCount.textContent = `${totalFiltered} Mahasiswa`;
  }
}

function openAddStudentModal() {
  if (modalAddStudent) {
    modalAddStudent.classList.remove("hidden");
    if (addStudentNim) addStudentNim.focus();
  }
}

function closeAddStudentModal() {
  if (modalAddStudent) modalAddStudent.classList.add("hidden");
  if (addStudentNim) addStudentNim.value = "";
  if (addStudentName) addStudentName.value = "";
  if (addStudentPhone) addStudentPhone.value = "";
  if (addStudentType) addStudentType.value = "UTAMA";
}

function openEditStudentModal(nim) {
  const c = classContacts[nim] || {};
  const s = (currentStudentsList || []).find(x => x.nim === nim);
  const nama = c.nama || s?.nama_mahasiswa || "";
  const phone = c.phone || "";
  const type = c.type || (s?.is_revisi ? "REVISI" : "UTAMA");

  const modalEdit = document.getElementById("modalEditStudent");
  const editNim = document.getElementById("editStudentNim");
  const editName = document.getElementById("editStudentName");
  const editPhone = document.getElementById("editStudentPhone");
  const editType = document.getElementById("editStudentType");

  if (editNim) editNim.value = nim;
  if (editName) editName.value = nama;
  if (editPhone) editPhone.value = phone;
  if (editType) editType.value = type;

  if (modalEdit) {
    modalEdit.classList.remove("hidden");
    if (editName) editName.focus();
  }
}
window.openEditStudentModal = openEditStudentModal;

function closeEditStudentModal() {
  const modalEdit = document.getElementById("modalEditStudent");
  if (modalEdit) modalEdit.classList.add("hidden");
}
window.closeEditStudentModal = closeEditStudentModal;

async function saveEditedStudent() {
  const editNim = document.getElementById("editStudentNim");
  const editName = document.getElementById("editStudentName");
  const editPhone = document.getElementById("editStudentPhone");
  const editType = document.getElementById("editStudentType");
  const btnSave = document.getElementById("btnSaveEditStudent");

  const nim = (editNim?.value || "").trim();
  const nama = (editName?.value || "").trim().toUpperCase();
  let phone = (editPhone?.value || "").trim().replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  const type = editType?.value || "UTAMA";

  if (!nim || !nama) {
    showToast("⚠️ Nama Mahasiswa wajib diisi!");
    return;
  }

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim, nama, phone, type })
    });
    const data = await res.json();
    if (data.success) {
      classContacts[nim] = { nim, nama, phone, type };
      const existing = currentStudentsList.find(s => s.nim === nim);
      if (existing) {
        existing.nama_mahasiswa = nama;
        existing.is_revisi = type === "REVISI";
      }
      closeEditStudentModal();
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
      updateWaPreview();
      showToast(`✅ Data mahasiswa ${nama} berhasil diperbarui!`);
    } else {
      showToast(`Gagal: ${data.error || "Gagal menyimpan perubahan"}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Perubahan";
    }
  }
}

async function saveNewStudent() {
  const nim = (addStudentNim?.value || "").trim();
  const nama = (addStudentName?.value || "").trim().toUpperCase();
  let phone = (addStudentPhone?.value || "").trim().replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  const type = addStudentType?.value || "UTAMA";

  if (!nim || !nama) {
    showToast("⚠️ NIM dan Nama Mahasiswa wajib diisi!");
    return;
  }

  if (btnSaveNewStudent) {
    btnSaveNewStudent.disabled = true;
    btnSaveNewStudent.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim, nama, phone, type })
    });
    const data = await res.json();
    if (data.success) {
      classContacts[nim] = { nim, nama, phone, type };
      const existing = currentStudentsList.find(s => s.nim === nim);
      if (existing) {
        existing.nama_mahasiswa = nama;
        existing.is_revisi = type === "REVISI";
      } else {
        currentStudentsList.push({
          nim,
          nama_mahasiswa: nama,
          is_revisi: type === "REVISI",
          posttest_status: "NOT_AVAILABLE",
          forum_status: "NOT_AVAILABLE",
          assignment_status: "NOT_AVAILABLE"
        });
      }
      closeAddStudentModal();
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
      updateWaPreview();
      showToast(`🎉 Berhasil mendaftarkan mahasiswa ${nama}!`);
    } else {
      showToast(`Gagal: ${data.error || "Gagal menyimpan"}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveNewStudent) {
      btnSaveNewStudent.disabled = false;
      btnSaveNewStudent.textContent = "Simpan Mahasiswa";
    }
  }
}

window.deleteMasterStudent = async function(nim) {
  const c = classContacts[nim];
  const nama = c?.nama || nim;
  if (!confirm(`Apakah Anda yakin ingin menghapus mahasiswa ${nama} (${nim}) dari kelas?\n\nMahasiswa akan dihapus dari direktori kontak dan draf pengingat WhatsApp.`)) {
    return;
  }
  try {
    const res = await fetch("/api/contacts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim })
    });
    const data = await res.json();
    if (data.success) {
      delete classContacts[nim];
      currentStudentsList = currentStudentsList.filter(s => s.nim !== nim);
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
      updateWaPreview();
      showToast(`🗑️ Mahasiswa ${nama} berhasil dihapus.`);
    } else {
      showToast(`Gagal: ${data.error || "Gagal menghapus mahasiswa"}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

window.toggleStudentType = async function(nim) {
  try {
    const res = await fetch("/api/contacts/toggle-type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nim })
    });
    const data = await res.json();
    if (data.success && data.contact) {
      classContacts[nim] = data.contact;
      const s = currentStudentsList.find(x => x.nim === nim);
      if (s) s.is_revisi = data.contact.type === "REVISI";
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
      updateWaPreview();
      showToast(`Status ${data.contact.nama} diubah ke ${data.contact.type}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

function renderPaginationControls(totalPages) {
  paginationControls.innerHTML = "";
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn-page";
  prevBtn.innerHTML = "‹";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; filterAndRenderStudentsTable(); };
  paginationControls.appendChild(prevBtn);

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `btn-page ${i === currentPage ? "active" : ""}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => { currentPage = i; filterAndRenderStudentsTable(); };
      paginationControls.appendChild(pageBtn);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `btn-page ${i === currentPage ? "active" : ""}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => { currentPage = i; filterAndRenderStudentsTable(); };
        paginationControls.appendChild(pageBtn);
      }
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn-page";
  nextBtn.innerHTML = "›";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; filterAndRenderStudentsTable(); };
  paginationControls.appendChild(nextBtn);
}

// ── 12. Export Helpers (CSV & Google Sheets) ────────────────────────────────
function exportToCsv() {
  const nims = Object.keys(classContacts || {});
  if (nims.length === 0) {
    showToast("Belum ada data mahasiswa untuk diekspor.");
    return;
  }

  // UTF-8 BOM (\uFEFF) + sep=, directive agar Microsoft Excel di semua sistem/locale (termasuk Indonesia)
  // otomatis memecah kolom dengan rapi dan tidak menumpuk di Kolom A saja.
  let csv = "\uFEFFsep=,\r\nNo,NIM,Nama Mahasiswa,Status,Nomor WhatsApp\r\n";
  const sorted = Object.values(classContacts).sort((a, b) => {
    const isRevA = a.type === "REVISI" ? 1 : 0;
    const isRevB = b.type === "REVISI" ? 1 : 0;
    if (isRevA !== isRevB) return isRevA - isRevB;
    return (a.nama || "").localeCompare(b.nama || "", "id");
  });

  sorted.forEach((c, idx) => {
    const no = idx + 1;
    const nimVal = (c.nim || "").toString().trim();
    // Gunakan ="..." agar Excel mempertahankan angka panjang sebagai string teks tanpa notasi ilmiah (2.41E+11)
    const nimCol = nimVal ? `="${nimVal}"` : `""`;
    const namaCol = `"${(c.nama || "").toString().replace(/"/g, '""')}"`;
    const typeCol = `"${(c.type || "UTAMA").toString().replace(/"/g, '""')}"`;
    const phoneVal = (c.phone || "").toString().trim();
    const phoneCol = (phoneVal && phoneVal !== "-") ? `="${phoneVal}"` : `"-"`;

    csv += `${no},${nimCol},${namaCol},${typeCol},${phoneCol}\r\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const rawClass = currentClassSettings?.class_name || (coursesList && coursesList[0]?.id_kelas) || "05TPLE003";
  const cleanClass = String(rawClass).replace(/[^a-zA-Z0-9_-]/g, "");
  a.download = `Data_Mahasiswa_${cleanClass}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`File CSV data mahasiswa (${cleanClass}) berhasil diunduh.`);
}

function copyForGoogleSheets() {
  const nims = Object.keys(classContacts || {});
  if (nims.length === 0) {
    showToast("Belum ada data mahasiswa untuk disalin.");
    return;
  }
  let tsv = "No\tNIM\tNama Mahasiswa\tStatus\tNomor WhatsApp\n";
  const sorted = Object.values(classContacts).sort((a, b) => {
    const isRevA = a.type === "REVISI" ? 1 : 0;
    const isRevB = b.type === "REVISI" ? 1 : 0;
    if (isRevA !== isRevB) return isRevA - isRevB;
    return (a.nama || "").localeCompare(b.nama || "", "id");
  });
  sorted.forEach((c, idx) => {
    const nimVal = (c.nim || "").toString().trim();
    const phoneVal = (c.phone || "").toString().trim();
    tsv += `${idx + 1}\t${nimVal}\t${c.nama || ""}\t${c.type || "UTAMA"}\t${phoneVal || "-"}\n`;
  });
  navigator.clipboard.writeText(tsv);
  showToast("Data mahasiswa berhasil disalin! Silakan tempel di Google Sheets.");
}

// ── 13. Contacts List Renderer ─────────────────────────────────────────────
function renderContactsList() {
  contactsListContainer.innerHTML = "";
  const query = searchContactInput.value.trim().toLowerCase();
  const nims = Object.keys(classContacts || {});

  if (nims.length === 0) {
    contactsListContainer.innerHTML = `
      <div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">
        Belum ada database mahasiswa tersimpan. Tambahkan manual di atas atau lakukan scan matkul.
      </div>
    `;
    return;
  }

  const filteredNims = nims.filter(nim => {
    const c = classContacts[nim];
    if (!c) return false;
    if (!query) return true;
    return (c.nama || "").toLowerCase().includes(query) || String(nim).includes(query);
  });

  if (filteredNims.length === 0) {
    contactsListContainer.innerHTML = `
      <div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">
        Tidak ada mahasiswa yang cocok dengan pencarian "<strong>${query}</strong>".
      </div>
    `;
    return;
  }

  // Urutkan: Mahasiswa UTAMA terlebih dahulu (A-Z), disusul Mahasiswa REVISI (A-Z)
  filteredNims.sort((a, b) => {
    const cA = classContacts[a] || {};
    const cB = classContacts[b] || {};
    const isRevisiA = cA.type === "REVISI" ? 1 : 0;
    const isRevisiB = cB.type === "REVISI" ? 1 : 0;

    if (isRevisiA !== isRevisiB) {
      return isRevisiA - isRevisiB; // UTAMA di atas, REVISI di bawah
    }

    const nameA = (cA.nama || "").trim().toUpperCase();
    const nameB = (cB.nama || "").trim().toUpperCase();
    return nameA.localeCompare(nameB, "id");
  });

  filteredNims.forEach(nim => {
    const c = classContacts[nim];
    const row = document.createElement("div");
    row.className = "contact-row-card";
    const tagRevisi = c.type === "REVISI" 
      ? `<span style="font-size: 9px; background: rgba(245,158,11,0.2); color: #fbbf24; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">REVISI</span>` 
      : "";

    row.innerHTML = `
      <div class="contact-info">
        <span class="contact-name">${c.nama || '-'}${tagRevisi}</span>
        <span class="contact-nim">${nim}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="text" class="contact-input-phone input-contact-phone form-control" data-nim="${nim}" value="${c.phone || ''}" placeholder="0812xxxxxx">
        <button type="button" class="btn-delete-contact" data-nim="${nim}" title="Hapus mahasiswa (tidak lanjut kuliah)">
          <svg style="width: 13px; height: 13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Hapus</span>
        </button>
      </div>
    `;

    const btnDelete = row.querySelector(".btn-delete-contact");
    if (btnDelete) {
      btnDelete.onclick = async (e) => {
        e.stopPropagation();
        const studentName = c.nama || nim;
        if (confirm(`Hapus ${studentName} (${nim}) dari kelas?\n\nMahasiswa yang sudah tidak lanjut kuliah akan dinonaktifkan permanen dan tidak akan masuk ke draf pesan WhatsApp pengingat tugas MENTARI.`)) {
          try {
            const res = await fetch("/api/contacts/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nim })
            });
            const data = await res.json();
            if (data.success) {
              delete classContacts[nim];
              renderContactsList();
              updateWaPreview();
              showToast(`🗑️ ${studentName} berhasil dihapus & dinonaktifkan.`);
            } else {
              showToast(`Gagal menghapus: ${data.error}`);
            }
          } catch (err) {
            showToast(`Error: ${err.message}`);
          }
        }
      };
    }

    contactsListContainer.appendChild(row);
  });
}

function autoFormatAllContactPhones() {
  document.querySelectorAll(".input-contact-phone").forEach(input => {
    let val = input.value.trim().replace(/[^0-9]/g, "");
    if (val.startsWith("0")) val = "62" + val.slice(1);
    input.value = val;
  });
  showToast("Nomor HP diformat ke awalan 628xx.");
}

async function addNewStudentFromModal() {
  const nim = newStudentNim.value.trim();
  const nama = newStudentName.value.trim().toUpperCase();
  let phone = newStudentPhone.value.trim().replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);

  if (!nim || !nama) {
    showToast("NIM dan Nama Mahasiswa wajib diisi!");
    return;
  }

  const isCurrentBatch = String(nim).startsWith("241011") || String(nim).startsWith("24");
  classContacts[nim] = {
    nim,
    nama,
    phone,
    type: isCurrentBatch ? "UTAMA" : "REVISI"
  };

  newStudentNim.value = "";
  newStudentName.value = "";
  newStudentPhone.value = "";

  renderContactsList();
  showToast(`✅ Mahasiswa ${nama} berhasil ditambahkan! Klik 'Simpan Seluruh Kontak' untuk menyimpan.`);
}

async function saveContactsFromModal() {
  btnSaveContacts.disabled = true;
  btnSaveContacts.textContent = "Menyimpan...";

  document.querySelectorAll(".input-contact-phone").forEach(input => {
    const nim = input.dataset.nim;
    if (classContacts[nim]) {
      classContacts[nim].phone = input.value.trim();
    }
  });

  try {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: classContacts })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Berhasil menyimpan ${Object.keys(classContacts).length} kontak mahasiswa!`);
      closeSettings();
      filterAndRenderStudentsTable();
      renderMiddleTable(activeMiddleTab);
    } else {
      showToast(`Gagal: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnSaveContacts.disabled = false;
    btnSaveContacts.textContent = "Simpan Seluruh Kontak";
  }
}

// ── 14. Telegram Bot Integration ───────────────────────────────────────────
async function loadTelegramConfig() {
  try {
    const res = await fetch("/api/telegram/config");
    const cfg = await res.json();
    teleBotToken.value = cfg.bot_token || "";
    teleChatId.value = cfg.chat_id || "";
  } catch (e) {
    console.error("Gagal load config telegram:", e);
  }
}

async function saveTelegramConfig() {
  const token = teleBotToken.value.trim();
  const chatId = teleChatId.value.trim();

  btnSaveTelegram.disabled = true;
  try {
    const res = await fetch("/api/telegram/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_token: token, chat_id: chatId })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Pengaturan Telegram berhasil disimpan.");
      await fetch("/api/telegram/bot-stop", { method: "POST" });
      await fetch("/api/telegram/bot-start", { method: "POST" });
      loadBotStatus();
    } else {
      showToast(`Gagal: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnSaveTelegram.disabled = false;
  }
}

async function testTelegramBot() {
  const token = teleBotToken.value.trim();
  const chatId = teleChatId.value.trim();
  btnTestTelegram.disabled = true;
  btnTestTelegram.textContent = "Mengirim...";
  try {
    const res = await fetch("/api/telegram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_token: token, chat_id: chatId })
    });
    const data = await res.json();
    if (data.success) showToast("Pesan tes berhasil terkirim ke Telegram.");
    else showToast(`Gagal: ${data.error}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnTestTelegram.disabled = false;
    btnTestTelegram.textContent = "Tes Kirim Pesan";
  }
}

async function loadBotStatus() {
  try {
    const res = await fetch("/api/telegram/bot-status");
    const data = await res.json();
    const running = data.running;
    botStatusDot.style.background = running ? "#10b981" : "#4b5563";
    botStatusLabel.textContent = running ? "Bot Aktif — polling Telegram" : "Bot Tidak Aktif";
    botActiveWeekLabel.textContent = data.activeWeek || "-";
    btnBotStart.disabled = running;
    btnBotStop.disabled = !running;
  } catch {
    botStatusLabel.textContent = "Gagal cek status bot";
  }
}

async function startBot() {
  btnBotStart.disabled = true;
  btnBotStart.textContent = "Memulai...";
  try {
    const res = await fetch("/api/telegram/bot-start", { method: "POST" });
    const data = await res.json();
    if (data.running) showToast("Bot Telegram berhasil diaktifkan.");
    else showToast("Gagal mengaktifkan bot — cek Token & Chat ID.");
    loadBotStatus();
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnBotStart.textContent = "Aktifkan";
  }
}

async function stopBot() {
  btnBotStop.disabled = true;
  try {
    await fetch("/api/telegram/bot-stop", { method: "POST" });
    showToast("Bot Telegram dihentikan.");
    loadBotStatus();
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function triggerBot() {
  const week = selectWeek.value || "1";
  btnBotTrigger.disabled = true;
  btnBotTrigger.textContent = "Memicu scan...";
  try {
    const res = await fetch("/api/telegram/bot-trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week })
    });
    const data = await res.json();
    if (data.success) showToast(`Scan dipicu! Hasil akan dikirim ke Telegram.`);
    else showToast(`Gagal: ${data.error}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    btnBotTrigger.disabled = false;
    btnBotTrigger.innerHTML = `<svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Picu Scan &amp; Kirim ke Telegram</span>`;
  }
}

// ── 15. Toast Helper ───────────────────────────────────────────────────────
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

// ── 16. Fordis Availability Functions ──────────────────────────────────────
function updateFordisStatusPills(data) {
  const pillFordis = document.getElementById("pillStatusFordis");
  const labelFordis = document.getElementById("labelStatusFordis");
  const dotFordis = document.getElementById("dotFordis");
  const pillAsg = document.getElementById("pillStatusAssignment");
  const labelAsg = document.getElementById("labelStatusAssignment");
  const dotAsg = document.getElementById("dotAssignment");
  const pillPost = document.getElementById("pillStatusPosttest");
  const labelPost = document.getElementById("labelStatusPosttest");
  const dotPost = document.getElementById("dotPosttest");
  const fordisAlert = document.getElementById("fordisAlertBanner");
  const fordisAlertTitle = document.getElementById("fordisAlertTitle");
  const fordisAlertDesc = document.getElementById("fordisAlertDesc");

  if (!pillFordis) return;

  const isFordisAvailable = data?.forum?.available;
  const isPosttestAvailable = data?.posttest?.available;
  const isAssignmentAvailable = data?.assignment?.available;

  if (isFordisAvailable) {
    pillFordis.className = "info-meta-pill status-pill success";
    if (dotFordis) dotFordis.className = "status-indicator-dot dot-green";
    if (labelFordis) labelFordis.textContent = "Fordis: Sudah Dibuka (Aktif)";
    if (fordisAlert) fordisAlert.classList.add("hidden");
  } else {
    pillFordis.className = "info-meta-pill status-pill warning";
    if (dotFordis) dotFordis.className = "status-indicator-dot dot-amber";
    if (labelFordis) labelFordis.textContent = "Fordis: Belum Dibuka Dosen";
    if (fordisAlert) {
      fordisAlert.classList.remove("hidden");
      if (fordisAlertTitle) fordisAlertTitle.textContent = "Forum Diskusi Belum Dibuka Dosen";
      if (fordisAlertDesc) fordisAlertDesc.textContent = `Topik diskusi untuk mata kuliah ${data?.mataKuliah || ""} belum dibuat dosen di portal MENTARI untuk pertemuan ini. Belum ada aktivitas yang dapat dikerjakan mahasiswa saat ini.`;
    }
  }

  if (pillAsg) {
    if (isAssignmentAvailable) {
      pillAsg.className = "info-meta-pill status-pill success";
      if (dotAsg) dotAsg.className = "status-indicator-dot dot-green";
      if (labelAsg) labelAsg.textContent = "Penugasan: Ada Tugas (Aktif)";
    } else {
      pillAsg.className = "info-meta-pill status-pill";
      if (dotAsg) dotAsg.className = "status-indicator-dot dot-gray";
      if (labelAsg) labelAsg.textContent = "Penugasan: Tidak Ada";
    }
  }

  if (isPosttestAvailable) {
    pillPost.className = "info-meta-pill status-pill success";
    if (dotPost) dotPost.className = "status-indicator-dot dot-green";
    if (labelPost) labelPost.textContent = "Posttest: Sudah Dibuka";
  } else {
    pillPost.className = "info-meta-pill status-pill";
    if (dotPost) dotPost.className = "status-indicator-dot dot-gray";
    if (labelPost) labelPost.textContent = "Posttest: Belum Dibuka";
  }
}

async function renderFordisStatusMiddleTable() {
  middleTableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center empty-cell">
        Memeriksa ketersediaan Fordis seluruh mata kuliah dari MENTARI...
      </td>
    </tr>
  `;

  if (!scanAllResults || scanAllResults.length === 0) {
    await performScanAll();
  }

  if (!scanAllResults || scanAllResults.length === 0) {
    middleTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center empty-cell">
          Gagal memuat status mata kuliah. Pastikan koneksi MENTARI aktif dan coba lagi.
        </td>
      </tr>
    `;
    return;
  }

  middleTableBody.innerHTML = "";
  viewAllCount.textContent = scanAllResults.length;

  scanAllResults.forEach((res, idx) => {
    const hasActiveTasks = res.hasAnyActivity || (res.scannedMeetings || []).some(m => m.hasActivity || m.forum?.available || m.assignment?.available || m.posttest?.available);
    const hasDaring = res.isDaring || (res.daringMeetings && res.daringMeetings.length > 0) || hasActiveTasks;
    const isPureLuring = !hasActiveTasks && (!hasDaring || (res.isLuring && (!res.daringMeetings || res.daringMeetings.length === 0)));
    const isKombinasi = res.isKombinasi || (res.luringMeetings?.length > 0 && res.daringMeetings?.length > 0);
    const fordisOpen = (res.scannedMeetings || []).some(m => m.forum?.available);

    let fordisBadge = `<span class="badge-table-pill gray">Tatap Muka</span>`;
    if (hasActiveTasks) {
      fordisBadge = fordisOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill warning">📁 Ada Tugas MENTARI</span>`;
    } else if (!isPureLuring) {
      fordisBadge = fordisOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill warning">🟡 Belum Dibuka Dosen</span>`;
    }

    let modeText = "DARING (MENTARI)";
    let modeColor = "#34d399";
    if (isPureLuring) {
      modeText = "LURING (Tatap Muka)";
      modeColor = "#60a5fa";
    } else if (hasActiveTasks && (!res.daringMeetings || res.daringMeetings.length === 0)) {
      modeText = "LURING (Ada Tugas MENTARI)";
      modeColor = "#38bdf8";
    } else if (isKombinasi) {
      modeText = "KOMBINASI (Hybrid)";
      modeColor = "#a78bfa";
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td style="font-family: 'JetBrains Mono', monospace; color: #94a3b8;">${res.kodeCourse?.split("-").slice(-1)[0] || ""}</td>
      <td>
        <strong style="color: #fff;">${res.mataKuliah || res.coursename}</strong>
        <div style="font-size: 11px; color: ${modeColor}; font-weight: 600;">${modeText} • ${res.sks || 2} SKS</div>
      </td>
      <td style="text-align: center;">${fordisBadge}</td>
      <td style="text-align: right;">
        ${!isPureLuring ? `<button type="button" class="btn-select-matkul-action btn-middle-select-matkul" data-code="${res.kodeCourse}">Pilih Matkul</button>` : `<span style="color: #64748b;">-</span>`}
      </td>
    `;
    middleTableBody.appendChild(row);
  });

  middleTableBody.querySelectorAll(".btn-middle-select-matkul").forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code;
      if (code) {
        selectCourse.value = code;
        updateCourseMetaInfo();
        switchMiddleTab("posttest");
        performScan();
        showToast(`Beralih ke mata kuliah ${code}`);
      }
    };
  });
}

function openStatusFordisModal() {
  const modal = document.getElementById("modalStatusFordis");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderFordisStatusModalTable();
}

function closeStatusFordisModal() {
  document.getElementById("modalStatusFordis")?.classList.add("hidden");
}

async function refreshFordisStatusList() {
  const btn = document.getElementById("btnRefreshFordisStatus");
  const txt = document.getElementById("txtRefreshFordis");
  if (btn) btn.disabled = true;
  if (txt) txt.textContent = "Memindai Seluruh Matkul...";
  try {
    await performScanAll();
    await renderFordisStatusModalTable();
    showToast("Status pembukaan fordis seluruh matkul telah diperbarui.");
  } finally {
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = "Periksa Ulang Seluruh Matkul";
  }
}

async function renderFordisStatusModalTable() {
  const tbody = document.getElementById("tableFordisStatusBody");
  const summaryText = document.getElementById("fordisSummaryText");
  if (!tbody) return;

  if (!scanAllResults || scanAllResults.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center empty-cell">
          Sedang memindai seluruh mata kuliah dari MENTARI... Mohon tunggu.
        </td>
      </tr>
    `;
    await performScanAll();
  }

  if (!scanAllResults || scanAllResults.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center empty-cell">
          Belum ada data pindaian mata kuliah. Klik "Periksa Ulang Seluruh Matkul".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  let fordisOpenCount = 0;
  let daringCount = 0;

  scanAllResults.forEach((res, idx) => {
    const hasActiveTasks = res.hasAnyActivity || (res.scannedMeetings || []).some(m => m.hasActivity || m.forum?.available || m.assignment?.available || m.posttest?.available);
    const hasDaring = res.isDaring || (res.daringMeetings && res.daringMeetings.length > 0) || hasActiveTasks;
    const isPureLuring = !hasActiveTasks && (!hasDaring || (res.isLuring && (!res.daringMeetings || res.daringMeetings.length === 0)));
    const isKombinasi = res.isKombinasi || (res.luringMeetings?.length > 0 && res.daringMeetings?.length > 0);
    if (!isPureLuring) daringCount++;

    const fordisOpen = (res.scannedMeetings || []).some(m => m.forum?.available);
    const posttestOpen = (res.scannedMeetings || []).some(m => m.posttest?.available);
    if (fordisOpen) fordisOpenCount++;

    let fordisBadge = `<span class="badge-table-pill gray">Tatap Muka</span>`;
    let postBadge = `<span class="badge-table-pill gray">-</span>`;

    if (hasActiveTasks) {
      fordisBadge = fordisOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill warning">📁 Ada Tugas MENTARI</span>`;

      postBadge = posttestOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill gray">⚪ Belum Dibuka</span>`;
    } else if (!isPureLuring) {
      fordisBadge = fordisOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill warning">🟡 Belum Dibuka Dosen</span>`;

      postBadge = posttestOpen
        ? `<span class="badge-table-pill success">🟢 Sudah Dibuka</span>`
        : `<span class="badge-table-pill gray">⚪ Belum Dibuka</span>`;
    }

    let modeBadge = `<span class="badge-mode-pill daring" style="height: auto; padding: 2px 8px; font-size: 10px;">DARING</span>`;
    if (isPureLuring) {
      modeBadge = `<span class="badge-mode-pill luring" style="height: auto; padding: 2px 8px; font-size: 10px;">LURING</span>`;
    } else if (hasActiveTasks && (!res.daringMeetings || res.daringMeetings.length === 0)) {
      modeBadge = `<span class="badge-mode-pill daring" style="height: auto; padding: 2px 8px; font-size: 10px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">LURING + TUGAS</span>`;
    } else if (isKombinasi) {
      modeBadge = `<span class="badge-mode-pill daring" style="height: auto; padding: 2px 8px; font-size: 10px; background: rgba(167, 139, 250, 0.2); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.4);">KOMBINASI</span>`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <strong style="color: #fff;">${res.mataKuliah || res.coursename}</strong>
        <div style="font-size: 10px; color: #64748b;">${res.kodeCourse || ""}</div>
      </td>
      <td>${res.sks || 2} SKS</td>
      <td>${modeBadge}</td>
      <td>${fordisBadge}</td>
      <td>${postBadge}</td>
      <td style="text-align: right;">
        ${!isPureLuring ? `<button type="button" class="btn-select-matkul-action btn-modal-select-matkul" data-code="${res.kodeCourse}">Pilih Matkul</button>` : `<span style="color: #64748b;">-</span>`}
      </td>
    `;
    tbody.appendChild(row);
  });

  if (summaryText) {
    summaryText.innerHTML = `Hasil: <strong>${fordisOpenCount} dari ${daringCount}</strong> Mata Kuliah Daring sudah dibuka dosen di MENTARI.`;
  }

  tbody.querySelectorAll(".btn-modal-select-matkul").forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code;
      if (code) {
        selectCourse.value = code;
        updateCourseMetaInfo();
        closeStatusFordisModal();
        performScan();
        showToast(`Beralih ke mata kuliah ${code}`);
      }
    };
  });
}

// ── Helper: Update Course Meta Info & Pill ─────────────────────────────────
function updateCourseMetaInfo() {
  syncWithSchedule();
  startCountdown();
  updateCourseDeadlinePill();
}

// ── 16b. Rangkuman Tugas Pribadi (Status Saya) ──────────────────────────────
let currentPersonalNim = "";
let currentPersonalName = "";

function openPersonalSummaryModal() {
  switchMainView("rangkuman");
}

function closePersonalSummaryModal() {
  document.getElementById("modalPersonalSummary")?.classList.add("hidden");
}

function populatePersonalStudentDropdown() {
  const select = document.getElementById("selectPersonalStudent");
  if (!select) return;
  select.innerHTML = "";

  const studentMap = new Map();

  // 1. Prioritaskan akun yang sedang login
  if (currentPersonalNim) {
    studentMap.set(currentPersonalNim, {
      nim: currentPersonalNim,
      nama_mahasiswa: currentPersonalName || "Mahasiswa"
    });
  }

  // 2. Tambahkan dari classContacts (seluruh mahasiswa kelas dari /api/contacts)
  if (classContacts && typeof classContacts === "object") {
    Object.values(classContacts).forEach(c => {
      if (c && c.nim) {
        studentMap.set(c.nim, {
          nim: c.nim,
          nama_mahasiswa: c.nama || c.nama_mahasiswa || c.nim
        });
      }
    });
  }

  // 3. Tambahkan dari currentStudentsList jika ada
  if (Array.isArray(currentStudentsList)) {
    currentStudentsList.forEach(s => {
      if (s && s.nim) {
        studentMap.set(s.nim, {
          nim: s.nim,
          nama_mahasiswa: s.nama_mahasiswa || s.nim
        });
      }
    });
  }

  // 4. Tambahkan dari scanAllResults jika ada
  if (Array.isArray(scanAllResults)) {
    scanAllResults.forEach(res => {
      (res.scannedMeetings || []).forEach(m => {
        (m.students || []).forEach(s => {
          if (s && s.nim) {
            studentMap.set(s.nim, {
              nim: s.nim,
              nama_mahasiswa: s.nama_mahasiswa || s.nim
            });
          }
        });
      });
    });
  }

  const allList = Array.from(studentMap.values()).sort((a, b) => {
    // Akun sendiri selalu diletakkan paling atas
    if (a.nim === currentPersonalNim) return -1;
    if (b.nim === currentPersonalNim) return 1;
    return (a.nama_mahasiswa || "").localeCompare(b.nama_mahasiswa || "", "id");
  });

  allList.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.nim;
    const isMe = s.nim === currentPersonalNim;
    opt.textContent = `${s.nama_mahasiswa} (${s.nim})${isMe ? " ★ (Akun Saya)" : ""}`;
    select.appendChild(opt);
  });

  if (Array.from(select.options).some(o => o.value === currentPersonalNim)) {
    select.value = currentPersonalNim;
  } else if (select.options.length > 0) {
    currentPersonalNim = select.options[0].value;
  }
}

function populatePersonalWeekDropdown() {
  const select = document.getElementById("selectPersonalWeek");
  if (!select) return;
  select.innerHTML = "";

  const allWeeks = [
    "1", "2", "3", "4", "5", "6", "7", "UTS",
    "8", "9", "10", "11", "12", "13", "14", "UAS", "15", "16"
  ];

  allWeeks.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    let label = `Pekan ${w}`;
    if (w === "UTS") label = "Pekan UTS";
    else if (w === "UAS") label = "Pekan UAS";
    opt.textContent = label;
    select.appendChild(opt);
  });

  select.value = selectWeek?.value || "2";
}

let isPersonalScanning = false;
async function refreshPersonalSummary() {
  if (isPersonalScanning) return;
  isPersonalScanning = true;
  const btn = document.getElementById("btnRefreshPersonal");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span> <span>Memindai...</span>`;
  }
  const selectPersonalWeek = document.getElementById("selectPersonalWeek");
  if (selectPersonalWeek && selectWeek) {
    selectWeek.value = selectPersonalWeek.value;
  }
  try {
    await performScanAll();
    populatePersonalStudentDropdown();
    await renderPersonalSummaryTable();
    showToast("Status tugas pribadi berhasil diperbarui.");
  } catch (err) {
    console.error("Gagal memindai rangkuman pribadi:", err);
  } finally {
    isPersonalScanning = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Scan Ulang</span>`;
    }
  }
}

async function renderPersonalSummaryTable() {
  const tbody = document.getElementById("tablePersonalBody");
  const statTotal = document.getElementById("personalTotalCourses");
  const statDone = document.getElementById("personalDoneCourses");
  const statPending = document.getElementById("personalPendingCourses");
  const statToday = document.getElementById("personalTodayDeadlineCount");
  if (!tbody) return;

  if (!scanAllResults || scanAllResults.length === 0) {
    if (isPersonalScanning) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 48px 16px; color: #94a3b8;">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;">
          <span class="spinner" style="width: 24px; height: 24px; display: inline-block;"></span>
          <span style="font-weight: 500; font-size: 14px; color: #cbd5e1;">Sedang memindai status tugas seluruh mata kuliah...</span>
          <span style="font-size: 12px; color: #64748b;">Memeriksa Fordis, Penugasan, Posttest, dan Kuesioner</span>
        </div>
      </td></tr>`;
      if (statTotal) statTotal.textContent = "-";
      if (statDone) statDone.textContent = "-";
      if (statPending) statPending.textContent = "-";
      if (statToday) statToday.textContent = "-";
      return;
    }
    if (coursesList && coursesList.length > 0) {
      const currentWeek = (selectPersonalWeek ? selectPersonalWeek.value : null) || (selectWeek ? selectWeek.value : "3");
      const isDemo = (c) => (c.kode_course || "").includes("20252");
      const validCourses = coursesList.filter(c => !isDemo(c));

      scanAllResults = validCourses.map((c, i) => {
        const mode = getCourseModeForWeek(c, currentWeek);
        const isPureLuring = mode === "LURING";
        const cleanName = c.nama_mata_kuliah || c.coursename?.split('#')[0].replace(/^\[\d+\]\s*/, '').trim() || c.kode_course;
        return {
          kodeCourse: c.kode_course,
          mataKuliah: cleanName,
          coursename: c.coursename,
          sks: c.sks || (c.coursename?.startsWith("[3]") ? 3 : 2),
          isLuring: isPureLuring,
          isDaring: !isPureLuring,
          hasAnyActivity: !isPureLuring,
          scannedMeetings: isPureLuring ? [] : [{
            meetingNum: 1,
            forum: { available: true },
            posttest: { available: true },
            assignment: { available: false },
            questionnaire: { available: true, is_done: i !== 1 },
            students: [{
              nim: currentPersonalNim,
              nama_mahasiswa: currentPersonalName || "Mahasiswa",
              forum_status: "MEMENUHI",
              forum_reply_count: 2,
              posttest_status: i === 1 ? "BELUM_MENGERJAKAN" : "SUDAH_MENGERJAKAN",
              assignment_status: "NOT_AVAILABLE",
              questionnaire_status: i === 1 ? "BELUM_MENGISI" : "SUDAH_MENGISI"
            }]
          }]
        };
      });
    }
  }

  tbody.innerHTML = "";
  let totalCoursesCount = 0;
  let doneCoursesCount = 0;
  let pendingCoursesCount = 0;
  let todayDeadlineCount = 0;

  const targetNim = currentPersonalNim;
  const isTargetMe = targetNim === currentPersonalNim;

  let rowNumber = 1;
  scanAllResults.forEach((res) => {
    const cDead = getCourseDeadline(res.kodeCourse);
    if (cDead.isToday) todayDeadlineCount++;

    // Sesuai acuan draf WhatsApp: Sebuah pertemuan daring HANYA dianggap aktif jika Forum Diskusi sudah dibuka dosen atau ada Penugasan Terstruktur.
    // Pertemuan tanpa fordis/tugas aktif (hanya template kuis kosong) tidak boleh dideteksi sebagai tagihan tugas.
    const activeMeetings = (res.scannedMeetings || []).filter(m => 
      m.forum?.available || m.assignment?.available
    );

    const hasActiveTasks = activeMeetings.length > 0;
    const hasDaring = res.isDaring || (res.daringMeetings && res.daringMeetings.length > 0) || hasActiveTasks;
    const isPureLuring = !hasActiveTasks && (!hasDaring || (res.isLuring && (!res.daringMeetings || res.daringMeetings.length === 0)));

    if (isPureLuring) {
      totalCoursesCount++;
      doneCoursesCount++;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rowNumber++}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #60a5fa; font-weight: 500;">🏫 TATAP MUKA (LURING) • ${res.sks || 2} SKS</div>
        </td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Jadwal Kelas</span></td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td style="text-align: center;"><span class="badge-table-pill success">🟢 Tatap Muka</span></td>
      `;
      tbody.appendChild(row);
      return;
    }

    if (activeMeetings.length === 0) {
      totalCoursesCount++;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rowNumber++}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #94a3b8;">${res.sks || 2} SKS</div>
        </td>
        <td style="text-align: center;"><span class="badge-table-pill gray">${cDead.text}</span></td>
        <td colspan="4" class="text-center" style="color: #64748b; font-size: 12px;">Fordis belum dibuka dosen di MENTARI</td>
        <td style="text-align: center;"><span class="badge-table-pill gray">Belum Dibuka</span></td>
      `;
      tbody.appendChild(row);
      return;
    }

    activeMeetings.forEach((m, mIdx) => {
      totalCoursesCount++;
      const pNum = m.meetingNum || (mIdx + 1);
      const student = (m.students || []).find(s => s.nim === targetNim);

      // 1. Forum Status
      let forumHtml = `<span class="badge-table-pill gray">Belum Dibuka</span>`;
      let isForumDone = true;
      if (m.forum?.available) {
        if (!student) {
          forumHtml = `<span class="badge-table-pill gray">Data Kosong</span>`;
          isForumDone = false;
        } else if (student.forum_status === "MEMENUHI") {
          if (student.has_unanswered_topic) {
            forumHtml = `<span class="badge-table-pill warning" title="Ada topik dosen yang belum diisi">⚠️ Ada Topik Kosong</span>`;
            isForumDone = false;
          } else {
            forumHtml = `<span class="badge-table-pill success">✅ Memenuhi (${student.forum_reply_count || 2}x)</span>`;
            isForumDone = true;
          }
        } else if (student.forum_status === "BELUM_MEMENUHI") {
          forumHtml = `<span class="badge-table-pill warning">⚠️ Kurang (${student.forum_reply_count || 1}x)</span>`;
          isForumDone = false;
        } else {
          forumHtml = `<span class="badge-table-pill danger">❌ Belum Reply (0x)</span>`;
          isForumDone = false;
        }
      }

      // 2. Assignment Status
      let asgHtml = `<span class="badge-table-pill gray">Tidak Ada</span>`;
      let isAsgDone = true;
      if (m.assignment?.available) {
        if (!student) {
          asgHtml = `<span class="badge-table-pill gray">-</span>`;
          isAsgDone = false;
        } else if (student.assignment_status === "SUDAH_MENGUMPULKAN") {
          asgHtml = `<span class="badge-table-pill success">✅ Sudah Submit</span>`;
          isAsgDone = true;
        } else if (student.assignment_status === "BELUM_MENGUMPULKAN") {
          asgHtml = `<span class="badge-table-pill danger">❌ Belum Submit</span>`;
          isAsgDone = false;
        } else if (student.assignment_status === "PRIVAT_MENTARI") {
          if (isTargetMe) {
            asgHtml = `<span class="badge-table-pill danger" title="Belum terdeteksi pengumpulan di portal MENTARI.">❌ Belum Submit</span>`;
            isAsgDone = false;
          } else {
            asgHtml = `<span class="badge-table-pill info" title="Privasi MENTARI: Akun lain tidak dapat melihat tugas mahasiswa ini.">🔒 Privat (Cek Portal)</span>`;
            isAsgDone = true;
          }
        } else {
          asgHtml = `<span class="badge-table-pill warning">⚠️ Cek MENTARI</span>`;
          isAsgDone = false;
        }
      }

      // 3. Posttest Status
      let postHtml = `<span class="badge-table-pill gray">Belum Dibuka</span>`;
      let isPostDone = true;
      if (m.posttest?.available) {
        if (!student) {
          postHtml = `<span class="badge-table-pill gray">-</span>`;
          isPostDone = false;
        } else if (student.posttest_status === "SUDAH_MENGERJAKAN") {
          postHtml = `<span class="badge-table-pill success">✅ Selesai</span>`;
          isPostDone = true;
        } else {
          postHtml = `<span class="badge-table-pill danger">❌ Belum Dikerjakan</span>`;
          isPostDone = false;
        }
      }

      // 4. Questionnaire Status
      let quesHtml = `<span class="badge-table-pill gray">Tidak Ada</span>`;
      let isQuesDone = true;
      const quesObj = m.questionnaire;
      if (quesObj?.available) {
        if (!isTargetMe) {
          quesHtml = `<span class="badge-table-pill info" title="Privasi MENTARI: Pengisian kuesioner hanya dapat diakses oleh pemilik akun.">🔒 Privat Akun</span>`;
          isQuesDone = true;
        } else {
          const isDone = !!(quesObj.is_done || student?.questionnaire_status === "SUDAH_MENGISI");
          if (isDone) {
            quesHtml = `<span class="badge-table-pill success">✅ Sudah Diisi</span>`;
            isQuesDone = true;
          } else {
            quesHtml = `<span class="badge-table-pill danger">❌ Belum Diisi</span>`;
            isQuesDone = false;
          }
        }
      }

      // 5. Overall Status
      const isCourseActive = m.forum?.available || m.assignment?.available;
      let overallHtml = `<span class="badge-table-pill gray">Belum Ada Tugas</span>`;
      if (isCourseActive) {
        if (isForumDone && isAsgDone && isPostDone && isQuesDone) {
          overallHtml = `<span class="badge-table-pill success" style="font-weight: 700;">🟢 LENGKAP</span>`;
          doneCoursesCount++;
        } else {
          overallHtml = `<span class="badge-table-pill danger" style="font-weight: 700;">🔴 PERLU DIKERJAKAN</span>`;
          pendingCoursesCount++;
        }
      } else {
        doneCoursesCount++;
      }

      const todayBadge = cDead.isToday
        ? `<div style="font-size: 10px; color: #f87171; font-weight: 700; margin-top: 2px;">🚨 HARI INI!</div>`
        : "";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rowNumber++}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 500;">Pertemuan ${pNum} • ${res.sks || 2} SKS</div>
        </td>
        <td style="text-align: center;">
          <div style="font-weight: 600; color: ${cDead.isToday ? '#f87171' : '#cbd5e1'}; font-size: 12px;">${cDead.text}</div>
          ${todayBadge}
        </td>
        <td style="text-align: center;">${forumHtml}</td>
        <td style="text-align: center;">${asgHtml}</td>
        <td style="text-align: center;">${postHtml}</td>
        <td style="text-align: center;">${quesHtml}</td>
        <td style="text-align: center;">${overallHtml}</td>
      `;
      tbody.appendChild(row);
    });
  });

  if (statTotal) statTotal.textContent = totalCoursesCount;
  if (statDone) statDone.textContent = doneCoursesCount;
  if (statPending) statPending.textContent = pendingCoursesCount;
  if (statToday) statToday.textContent = todayDeadlineCount;

  const userDisplayNameBadge = document.getElementById("userDisplayNameBadge");
  const userNimBadge = document.getElementById("userNimBadge");
  if (userDisplayNameBadge) {
    userDisplayNameBadge.textContent = currentClassSettings?.user_custom_name || currentPersonalName || "Profil Mahasiswa";
  }
  if (userNimBadge) {
    userNimBadge.textContent = currentPersonalNim || "-";
  }

  tbody.querySelectorAll(".btn-personal-select").forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code;
      if (code) {
        selectCourse.value = code;
        updateCourseMetaInfo();
        closePersonalSummaryModal();
        performScan();
        showToast(`Beralih ke mata kuliah ${code}`);
      }
    };
  });
}

function copyPersonalSummaryChecklist() {
  const targetNim = currentPersonalNim;
  const isTargetMe = targetNim === currentPersonalNim;
  const selectStudent = document.getElementById("selectPersonalStudent");
  const selectedText = selectStudent ? selectStudent.options[selectStudent.selectedIndex]?.text || targetNim : targetNim;
  const studentName = selectedText.split("(")[0].trim();
  const weekVal = selectWeek?.value || "2";
  const weekLabel = WEEK_NAMES[weekVal] || `Pekan ${weekVal}`;

  if (!scanAllResults || scanAllResults.length === 0) {
    showToast("Data tugas belum tersedia. Silakan klik Scan Ulang terlebih dahulu.");
    return;
  }

  let txt = `📋 *CHECKLIST TUGAS PRIBADI MENTARI*\n`;
  txt += `👤 *Mahasiswa:* ${studentName} (${targetNim})\n`;
  txt += `🗓️ *${weekLabel}*\n\n`;

  let totalItems = 0;
  let completeItems = 0;

  scanAllResults.forEach(res => {
    const hasDaring = res.isDaring || (res.daringMeetings && res.daringMeetings.length > 0) || (res.scannedMeetings && res.scannedMeetings.length > 0);
    const isPureLuring = !hasDaring || (res.isLuring && (!res.daringMeetings || res.daringMeetings.length === 0));
    if (isPureLuring) return;

    // Hanya pertemuan aktif sesuai acuan draf WhatsApp
    const activeMeetings = (res.scannedMeetings || []).filter(m => 
      m.forum?.available || m.assignment?.available
    );
    if (activeMeetings.length === 0) return;

    const cDead = getCourseDeadline(res.kodeCourse);
    const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";

    activeMeetings.forEach((m, mIdx) => {
      const pNum = m.meetingNum || (mIdx + 1);
      const student = (m.students || []).find(s => s.nim === targetNim);
      totalItems++;

      let forumStatusTxt = "Belum dibuka";
      let asgStatusTxt = "Tidak ada tugas";
      let postStatusTxt = "Belum dibuka";
      let isAllOk = true;

      if (m.forum?.available) {
        if (student?.forum_status === "MEMENUHI" && !student.has_unanswered_topic) {
          forumStatusTxt = "Sudah (2x reply) ✅";
        } else if (student?.forum_status === "MEMENUHI" && student.has_unanswered_topic) {
          forumStatusTxt = "Ada topik kosong ⚠️";
          isAllOk = false;
        } else if (student?.forum_status === "BELUM_MEMENUHI") {
          forumStatusTxt = "Baru 1x reply ⚠️";
          isAllOk = false;
        } else {
          forumStatusTxt = "Belum reply ❌";
          isAllOk = false;
        }
      }

      if (m.assignment?.available) {
        if (student?.assignment_status === "SUDAH_MENGUMPULKAN") {
          asgStatusTxt = "Sudah submit ✅";
        } else if (student?.assignment_status === "BELUM_MENGUMPULKAN") {
          asgStatusTxt = "Belum submit ❌";
          isAllOk = false;
        } else if (student?.assignment_status === "PRIVAT_MENTARI") {
          if (isTargetMe) {
            asgStatusTxt = "Belum submit ❌";
            isAllOk = false;
          } else {
            asgStatusTxt = "Privat MENTARI 🔒 (Cek portal)";
          }
        } else {
          asgStatusTxt = "Cek MENTARI ⚠️";
          isAllOk = false;
        }
      }

      if (m.posttest?.available) {
        if (student?.posttest_status === "SUDAH_MENGERJAKAN") {
          postStatusTxt = "Sudah selesai ✅";
        } else {
          postStatusTxt = "Belum dikerjakan ❌";
          isAllOk = false;
        }
      }

      if (isAllOk) completeItems++;

      txt += `> ${res.mataKuliah || res.coursename} (${res.sks || 2} SKS)\n`;
      txt += `*Deadline: ${cDead.text}*${todayBadge}\n`;
      txt += `  • Pertemuan ${pNum}:\n`;
      txt += `  - Fordis: ${forumStatusTxt}\n`;
      if (m.assignment?.available) {
        txt += `  - Penugasan: ${asgStatusTxt}\n`;
      }
      txt += `  - Posttest: ${postStatusTxt}\n\n`;
    });
  });

  txt += `📊 *Ringkasan Status:* ${completeItems} dari ${totalItems} pertemuan selesai.\n`;
  txt += `⚠️ *Catatan:* Pastikan seluruh tugas disubmit sebelum batas deadline!`;

  navigator.clipboard.writeText(txt);
  showToast("Checklist status tugas pribadi berhasil disalin ke clipboard!");
}

// ── 17. Class Settings, Weeks & Dynamic Templates Management ───────────────
const DEFAULT_TEMPLATES = {
  grup_utama: "*📢 REKAP TUGAS MENTARI*\n*Kelas {NAMA_KELAS}* • _{PEKAN}_\n\n{LIST_MATKUL_DARING}\n{LIST_FORDIS_BELUM_BUKA}\n⚠️ *Alur Absensi Valid:*\nFordis (min 2x) ➔ Posttest ➔ Kuesioner",
  grup_matkul: "> {NAMA_MATKUL}\n*{PERTEMUAN}* • *Deadline: {DEADLINE}*\n\n{DETAIL_TUGAS}\n\n⚠️ *Catatan Wajib:*\nFordis (2x) ➔ Posttest ➔ Kuesioner (absensi valid)"
};

const TEMPLATE_VARS = {
  grup_utama: [
    { tag: "{NAMA_KELAS}", desc: "Nama kelas (misal 05TPLE003)" },
    { tag: "{PEKAN}", desc: "Pekan aktif (misal Pekan 1)" },
    { tag: "{DEADLINE}", desc: "Hari & jam deadline" },
    { tag: "{LIST_MATKUL_DARING}", desc: "Daftar matkul daring + rincian fordis & posttest" },
    { tag: "{LIST_FORDIS_BELUM_BUKA}", desc: "Daftar matkul yang fordisnya belum dibuka" }
  ],
  grup_matkul: [
    { tag: "{NAMA_MATKUL}", desc: "Nama mata kuliah" },
    { tag: "{PERTEMUAN}", desc: "Nomor pertemuan (misal Pert. 1)" },
    { tag: "{DEADLINE}", desc: "Hari & jam deadline" },
    { tag: "{DETAIL_TUGAS}", desc: "Daftar mahasiswa yang belum tugas" }
  ]
};

function applyClassSettings(settings) {
  currentClassSettings = { ...currentClassSettings, ...settings };

  if (headerClassBadge) headerClassBadge.textContent = currentClassSettings.class_name || "05TPLE003";
  if (headerUserClass) headerUserClass.textContent = `(${currentClassSettings.class_name || "05TPLE003"})`;
  const activeCourseCode = selectCourse?.value;
  const courseDeadlineInfo = getCourseDeadline(activeCourseCode);
  if (deadlineSub) deadlineSub.textContent = `Deadline: ${courseDeadlineInfo.text}`;

  if (currentClassSettings.weeks) {
    WEEK_NAMES = { ...currentClassSettings.weeks };
    populateWeeksDropdown();
  }

  if (inputClassName) inputClassName.value = currentClassSettings.class_name || "";
  if (inputUserCustomName) inputUserCustomName.value = currentClassSettings.user_custom_name || "";
  if (inputSemesterCode) inputSemesterCode.value = currentClassSettings.semester || "";
  if (inputAcademicYear) inputAcademicYear.value = currentClassSettings.academic_year || "";
  if (inputStartDate) inputStartDate.value = currentClassSettings.semester_start_date || "2026-08-31";
  if (selectDeadlineDay) selectDeadlineDay.value = currentClassSettings.deadline_day || "Jumat";
  if (inputDeadlineTime) inputDeadlineTime.value = currentClassSettings.deadline_time || "23:59 WIB";

  const selectMentionFormat = document.getElementById("selectMentionFormat");
  if (selectMentionFormat && currentClassSettings.mention_format) {
    selectMentionFormat.value = currentClassSettings.mention_format;
  }

  const selectDraftIncludeNames = document.getElementById("selectDraftIncludeNames");
  if (selectDraftIncludeNames) {
    selectDraftIncludeNames.value = waIncludeStudentNames ? "true" : "false";
  }

  if (currentClassSettings.course_deadlines && Array.isArray(coursesList)) {
    coursesList.forEach(c => {
      const cd = currentClassSettings.course_deadlines[c.kode_course];
      if (cd) {
        if (cd.sks !== undefined) c.sks = parseInt(cd.sks, 10);
        if (cd.kelompok !== undefined) c.kelompok = String(cd.kelompok);
      }
    });
  }

  updateUserDisplayName();
  renderWeeksSettingsTable();
  updateTemplateEditorView();
}

async function autoDetectClass() {
  if (btnAutoDetectClass) btnAutoDetectClass.disabled = true;
  if (txtAutoDetect) txtAutoDetect.textContent = "Mendeteksi...";

  try {
    const res = await fetch("/api/class-settings/auto-detect", { method: "POST" });
    const data = await res.json();
    if (data.success && data.settings) {
      applyClassSettings(data.settings);
      showToast(`🎉 Berhasil mendeteksi kelas: ${data.detected.class_name} (${data.detected.courses_count} Matkul)!`);
    } else {
      showToast(`Gagal: ${data.error || "Tidak dapat mendeteksi kelas"}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnAutoDetectClass) btnAutoDetectClass.disabled = false;
    if (txtAutoDetect) txtAutoDetect.textContent = "Deteksi dari MENTARI";
  }
}

async function saveClassProfile() {
  const className = inputClassName?.value.trim().toUpperCase() || "05TPLE003";
  const userCustomName = inputUserCustomName?.value.trim() || "";
  const semester = inputSemesterCode?.value.trim() || "20261";
  const academicYear = inputAcademicYear?.value.trim() || "2026/2027";
  const startDate = inputStartDate?.value || "2026-08-31";
  if (btnSaveClassProfile) {
    btnSaveClassProfile.disabled = true;
    btnSaveClassProfile.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/class-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_name: className,
        user_custom_name: userCustomName,
        semester,
        academic_year: academicYear,
        semester_start_date: startDate
      })
    });
    const data = await res.json();
    if (data.success) {
      applyClassSettings(data.settings);
      updateWaPreview();
      showToast(`✅ Profil kelas ${className} berhasil disimpan!`);
      closeSettings();
    } else {
      showToast(`Gagal menyimpan: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveClassProfile) {
      btnSaveClassProfile.disabled = false;
      btnSaveClassProfile.textContent = "Simpan Profil Kelas";
    }
  }
}

function renderWeeksSettingsTable() {
  if (!tableWeeksSettingsBody) return;
  tableWeeksSettingsBody.innerHTML = "";
  const weeks = currentClassSettings?.weeks || {};

  // Render dalam urutan kanonik
  getOrderedWeekKeys(weeks).forEach(wKey => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="week-label-cell">${wKey === "UTS" || wKey === "UAS" ? wKey : 'Pekan' + wKey}</span></td>
      <td>
        <input type="text" class="input-week-label" data-week="${wKey}" value="${weeks[wKey] || ''}">
      </td>
    `;
    tableWeeksSettingsBody.appendChild(row);
  });
}

function recalculateWeeksFromStartDate() {
  const startVal = inputStartDate ? inputStartDate.value : "2026-08-31";
  if (!startVal) {
    showToast("Pilih tanggal awal semester terlebih dahulu.");
    return;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  let curr = new Date(startVal + "T00:00:00");
  const newWeeks = {};

  const weekKeys = ["1", "2", "3", "4", "5", "6", "7", "UTS", "8", "9", "10", "11", "12", "13", "14", "15", "UAS", "16"];

  weekKeys.forEach(k => {
    const startD = new Date(curr);
    const endD = new Date(curr);
    endD.setDate(endD.getDate() + 5);

    const sDay = startD.getDate();
    const sMo = MONTHS[startD.getMonth()];
    const eDay = endD.getDate();
    const eMo = MONTHS[endD.getMonth()];
    const yr = endD.getFullYear();

    const dateStr = sMo === eMo ? `${sDay} - ${eDay} ${eMo} ${yr}` : `${sDay} ${sMo} - ${eDay} ${eMo} ${yr}`;
    if (k === "UTS") {
      newWeeks[k] = `Pekan UTS (${dateStr})`;
    } else if (k === "UAS") {
      newWeeks[k] = `Pekan UAS (${dateStr})`;
    } else {
      newWeeks[k] = `Pekan ${k} (${dateStr})`;
    }

    curr.setDate(curr.getDate() + 7);
  });

  currentClassSettings.weeks = newWeeks;
  renderWeeksSettingsTable();
  showToast("📅 Label pekan berhasil dihitung ulang dari tanggal awal!");
}

async function saveDeadlinesSettings() {
  const courseDeadlines = {};
  let fallbackDay = "Jumat";
  let fallbackTime = "23:59 WIB";

  document.querySelectorAll("#tableCourseDeadlinesBody tr").forEach(row => {
    const cCode = row.dataset.courseCode;
    const kelompok = row.querySelector(".select-row-course-kelompok")?.value || "1";
    const sks = parseInt(row.querySelector(".select-row-course-sks")?.value, 10) || 2;
    const day = row.querySelector(".select-row-deadline-day")?.value || "Jumat";
    const time = row.querySelector(".input-row-deadline-time")?.value.trim() || "23:59 WIB";
    if (cCode) {
      courseDeadlines[cCode] = { day, time, sks, kelompok };
      fallbackDay = day;
      fallbackTime = time;
      const course = coursesList.find(c => c.kode_course === cCode);
      if (course) {
        course.sks = sks;
        course.kelompok = kelompok;
      }
    }
  });

  const btn = document.getElementById("btnSaveDeadlinesSettings");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/class-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deadline_day: fallbackDay,
        deadline_time: fallbackTime,
        course_deadlines: courseDeadlines
      })
    });
    const data = await res.json();
    if (data.success) {
      applyClassSettings(data.settings);
      populateCoursesDropdown();
      renderScheduleView();
      renderPersonalSummaryTable();
      startCountdown();
      updateCourseDeadlinePill();
      renderCourseDeadlinesTable();
      updateWaPreview();
      showToast("✅ Pengaturan matkul (kelompok, SKS & deadline) berhasil disimpan!");
      closeSettings();
    } else {
      showToast(`Gagal menyimpan: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Simpan Deadline Mata Kuliah";
    }
  }
}

async function saveWeeksSettings() {
  const customWeeks = {};
  document.querySelectorAll(".input-week-label").forEach(input => {
    const wKey = input.dataset.week;
    if (wKey) customWeeks[wKey] = input.value.trim();
  });

  if (btnSaveWeeksSettings) {
    btnSaveWeeksSettings.disabled = true;
    btnSaveWeeksSettings.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/class-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weeks: Object.keys(customWeeks).length > 0 ? customWeeks : currentClassSettings.weeks
      })
    });
    const data = await res.json();
    if (data.success) {
      applyClassSettings(data.settings);
      showToast("✅ Sinkronisasi label pekan berhasil disimpan!");
      closeSettings();
    } else {
      showToast(`Gagal menyimpan: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveWeeksSettings) {
      btnSaveWeeksSettings.disabled = false;
      btnSaveWeeksSettings.textContent = "Simpan Label Pekan";
    }
  }
}

async function saveWeeksAndDeadline() {
  return saveDeadlinesSettings();
}

function updateTemplateEditorView() {
  const type = selectTemplateType ? selectTemplateType.value : "grup_utama";
  const vars = TEMPLATE_VARS[type] || [];

  if (chipTagsList) {
    chipTagsList.innerHTML = "";
    vars.forEach(v => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "btn-var-chip";
      chip.textContent = v.tag;
      chip.title = v.desc;
      chip.onclick = () => insertTagIntoEditor(v.tag);
      chipTagsList.appendChild(chip);
    });
  }

  if (txtTemplateEditor && currentClassSettings?.templates) {
    txtTemplateEditor.value = currentClassSettings.templates[type] || DEFAULT_TEMPLATES[type] || "";
    renderTemplateLivePreview();
  }
}

function insertTagIntoEditor(tag) {
  if (!txtTemplateEditor) return;
  const start = txtTemplateEditor.selectionStart;
  const end = txtTemplateEditor.selectionEnd;
  const val = txtTemplateEditor.value;
  txtTemplateEditor.value = val.substring(0, start) + tag + val.substring(end);
  txtTemplateEditor.selectionStart = txtTemplateEditor.selectionEnd = start + tag.length;
  txtTemplateEditor.focus();
  renderTemplateLivePreview();
}

function renderTemplateLivePreview() {
  if (!templateLivePreviewContent || !txtTemplateEditor) return;
  const type = selectTemplateType ? selectTemplateType.value : "grup_utama";
  const raw = txtTemplateEditor.value;
  const className = currentClassSettings?.class_name || "05TPLE003";
  const deadlineStr = `${currentClassSettings?.deadline_day || "Jumat"}, ${currentClassSettings?.deadline_time || "23:59 WIB"}`;

  if (type === "grup_utama") {
    const sampleMatkul = `> TEKNIK RISET OPERASIONAL (2 SKS)\n*Deadline: ${deadlineStr}*\n  • *Pertemuan 1:*\n  - Fordis: 34 Mahasiswa belum\n  - Penugasan Terstruktur: 35 Mahasiswa belum\n  - Posttest: 34 Mahasiswa belum`;
    const sampleUnopened = `*Fordis Belum Dibuka Dosen:*\n> PEMROGRAMAN WEB I\n> METODE PENELITIAN`;
    let preview = raw
      .replace(/{NAMA_KELAS}/g, className)
      .replace(/{PEKAN}/g, "Pekan 1 (31 Agt - 5 Sep 2026)")
      .replace(/{DEADLINE}/g, deadlineStr)
      .replace(/{LIST_MATKUL_DARING}/g, sampleMatkul)
      .replace(/{LIST_FORDIS_BELUM_BUKA}/g, sampleUnopened);
    templateLivePreviewContent.textContent = preview;
  } else {
    const sampleDetail = `💬 *Forum Kurang (<2x reply) (1):*\n1. @241011401354 (ATTHORIQ)\n\n❌ *Belum Posttest (1):*\n1. @241011401354 (ATTHORIQ)`;
    let preview = raw
      .replace(/{NAMA_MATKUL}/g, "KECERDASAN BUATAN")
      .replace(/{PERTEMUAN}/g, "Pert. 1")
      .replace(/{DEADLINE}/g, deadlineStr)
      .replace(/{DETAIL_TUGAS}/g, sampleDetail);
    templateLivePreviewContent.textContent = preview;
  }
}

function resetTemplateToDefault() {
  const type = selectTemplateType ? selectTemplateType.value : "grup_utama";
  if (!DEFAULT_TEMPLATES[type]) return;
  if (txtTemplateEditor) {
    txtTemplateEditor.value = DEFAULT_TEMPLATES[type];
    renderTemplateLivePreview();
    showToast(`Format template ${type} dikembalikan ke default baku.`);
  }
}

async function saveTemplatesFromModal() {
  const type = selectTemplateType ? selectTemplateType.value : "grup_utama";
  const content = txtTemplateEditor?.value || "";
  const mentionFormat = document.getElementById("selectMentionFormat")?.value || "phone_name";

  const updatedTemplates = {
    ...(currentClassSettings?.templates || DEFAULT_TEMPLATES),
    [type]: content
  };

  if (btnSaveTemplates) {
    btnSaveTemplates.disabled = true;
    btnSaveTemplates.textContent = "Menyimpan...";
  }

  try {
    const res = await fetch("/api/class-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: updatedTemplates, mention_format: mentionFormat })
    });
    const data = await res.json();
    if (data.success) {
      const selectDraft = document.getElementById("selectDraftIncludeNames");
      if (selectDraft) {
        waIncludeStudentNames = selectDraft.value === "true";
        localStorage.setItem("tugasku_draft_include_names", waIncludeStudentNames ? "true" : "false");
        updateDraftNamesToggleUI();
        updateWaPreview();
      }
      applyClassSettings(data.settings);
      performScan();
      showToast("🎉 Format template & pengaturan draft WhatsApp berhasil disimpan!");
      closeSettings();
    } else {
      showToast(`Gagal: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveTemplates) {
      btnSaveTemplates.disabled = false;
      btnSaveTemplates.textContent = "Simpan Format Template";
    }
  }
}

function openSettings(initialTab = "class") {
  if (!modalSettings) return;
  // Selalu sinkronkan form dengan state currentClassSettings terkini
  applyClassSettings(currentClassSettings);
  modalSettings.classList.remove("hidden");
  switchSettingsTab(initialTab);
}
window.openSettings = openSettings;

function closeSettings() {
  if (!modalSettings) return;
  modalSettings.classList.add("hidden");
}
window.closeSettings = closeSettings;

function switchSettingsTab(tabKey) {
  const tabs = [
    { key: "class", btn: tabBtnClassSettings, panel: panelTabClassSettings },
    { key: "deadlines", btn: tabBtnDeadlineSettings, panel: panelTabDeadlineSettings },
    { key: "weeks", btn: tabBtnWeeksSettings, panel: panelTabWeeksSettings },
    { key: "templates", btn: tabBtnTemplates, panel: panelTabTemplates },
    { key: "bot", btn: tabBtnBot, panel: panelTabBot },
    { key: "schedule", btn: tabBtnSchedule, panel: panelTabSchedule }
  ];

  tabs.forEach(t => {
    const isTarget = t.key === tabKey;
    if (t.btn) t.btn.classList.toggle("active", isTarget);
    if (t.panel) {
      t.panel.classList.toggle("active", isTarget);
      t.panel.classList.toggle("hidden", !isTarget);
    }
  });

  if (tabKey === "bot") loadBotStatus();
  if (tabKey === "templates") updateTemplateEditorView();
  if (tabKey === "deadlines") renderCourseDeadlinesTable();
  if (tabKey === "weeks") renderWeeksSettingsTable();
}

// ── Course Deadlines Management ───────────────────────────────────────────
function openQuickDeadlineModal(courseCode) {
  window.openQuickDeadlineModal = openQuickDeadlineModal;
  if (!modalQuickDeadline) return;
  const targetCode = courseCode || selectCourse?.value;
  if (!targetCode) return;

  const course = coursesList.find(c => c.kode_course === targetCode);
  const courseName = course?.nama_mata_kuliah || course?.coursename || targetCode;
  
  if (quickDeadlineCourseName) {
    quickDeadlineCourseName.textContent = courseName;
    quickDeadlineCourseName.dataset.courseCode = targetCode;
  }

  const defDay = currentClassSettings?.deadline_day || "Jumat";
  const defTime = currentClassSettings?.deadline_time || "23:59 WIB";
  if (quickDefaultDeadlineLabel) {
    quickDefaultDeadlineLabel.textContent = `${defDay}, ${defTime}`;
  }

  const currentDeadline = getCourseDeadline(targetCode);
  if (currentDeadline.isCustom) {
    if (radioDeadlineCustom) radioDeadlineCustom.checked = true;
    if (radioDeadlineDefault) radioDeadlineDefault.checked = false;
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "block";
    if (quickDeadlineDay) quickDeadlineDay.value = currentDeadline.day;
    if (quickDeadlineTime) quickDeadlineTime.value = currentDeadline.time;
  } else {
    if (radioDeadlineDefault) radioDeadlineDefault.checked = true;
    if (radioDeadlineCustom) radioDeadlineCustom.checked = false;
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "none";
    if (quickDeadlineDay) quickDeadlineDay.value = defDay;
    if (quickDeadlineTime) quickDeadlineTime.value = defTime;
  }

  modalQuickDeadline.classList.remove("hidden");
}

function closeQuickDeadlineModal() {
  if (modalQuickDeadline) modalQuickDeadline.classList.add("hidden");
}

async function saveQuickDeadline() {
  const courseCode = quickDeadlineCourseName?.dataset?.courseCode;
  if (!courseCode) return;

  const isDefault = radioDeadlineDefault?.checked;
  if (btnSaveQuickDeadline) {
    btnSaveQuickDeadline.disabled = true;
    btnSaveQuickDeadline.textContent = "Menyimpan...";
  }

  try {
    const payload = isDefault
      ? { kode_course: courseCode, reset: true }
      : { kode_course: courseCode, day: quickDeadlineDay.value, time: quickDeadlineTime.value.trim() };

    const res = await fetch("/api/settings/course-deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      if (!currentClassSettings.course_deadlines) currentClassSettings.course_deadlines = {};
      if (isDefault) {
        if (currentClassSettings.course_deadlines[courseCode]) {
          delete currentClassSettings.course_deadlines[courseCode].day;
          delete currentClassSettings.course_deadlines[courseCode].time;
        }
      } else {
        const prev = currentClassSettings.course_deadlines[courseCode] || {};
        currentClassSettings.course_deadlines[courseCode] = {
          ...prev,
          day: quickDeadlineDay.value,
          time: quickDeadlineTime.value.trim()
        };
      }
      closeQuickDeadlineModal();
      updateCourseDeadlinePill();
      renderCourseDeadlinesTable();
      updateWaPreview();
      const course = coursesList.find(c => c.kode_course === courseCode);
      showToast(`✅ Deadline ${course?.nama_mata_kuliah || 'matkul'} berhasil disimpan!`);
    } else {
      showToast(`Gagal: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveQuickDeadline) {
      btnSaveQuickDeadline.disabled = false;
      btnSaveQuickDeadline.textContent = "Simpan Deadline";
    }
  }
}

function renderCourseDeadlinesTable() {
  if (!tableCourseDeadlinesBody) return;
  tableCourseDeadlinesBody.innerHTML = "";

  if (!currentClassSettings.course_deadlines) {
    currentClassSettings.course_deadlines = {};
  }

  coursesList.forEach(course => {
    if (course.kode_course?.includes("20252")) return;
    const courseCode = course.kode_course;
    const courseName = course.nama_mata_kuliah || course.coursename?.split('#')[0].replace(/^\[\d+\]\s*/, '') || courseCode;
    const dosen = course.nama_dosen || "Dosen Pengampu";

    // Single source of truth: explicit deadline, SKS & Kelompok per course
    const custom = currentClassSettings?.course_deadlines?.[courseCode];
    const defaultDay = courseName.toUpperCase().includes("RISET") ? "Sabtu" : (currentClassSettings?.deadline_day || "Jumat");
    const activeDay = custom?.day || defaultDay;
    const activeTime = custom?.time || currentClassSettings?.deadline_time || "23:59 WIB";
    const activeSks = parseInt(custom?.sks !== undefined ? custom.sks : (course.sks || (course.coursename?.startsWith("[3]") ? 3 : 2)), 10) || 2;
    const defaultKelompok = (course.coursename?.includes("[E-2]") || String(course.id_periode || course.periode || "") === "2") ? "2" : "1";
    const activeKelompok = custom?.kelompok !== undefined && custom.kelompok !== "" ? String(custom.kelompok) : (course.kelompok || defaultKelompok);

    currentClassSettings.course_deadlines[courseCode] = { 
      day: activeDay, 
      time: activeTime, 
      sks: activeSks,
      kelompok: activeKelompok
    };

    const kLabel = getKelompokShortLabel(activeKelompok);

    const row = document.createElement("tr");
    row.dataset.courseCode = courseCode;
    row.innerHTML = `
      <td>
        <div style="font-weight: 600; color: #f8fafc; font-size: 12.5px;">${courseName}</div>
        <div style="font-size: 11px; color: #64748b;">${dosen}</div>
      </td>
      <td>
        <select class="form-control select-row-course-kelompok" style="padding: 4px 8px; font-size: 12px; height: 32px; background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-weight: 600; border-radius: 6px; width: 100%;">
          <option value="1" ${activeKelompok === "1" ? "selected" : ""}>Kelompok 1 [E-1]</option>
          <option value="2" ${activeKelompok === "2" ? "selected" : ""}>Kelompok 2 [E-2]</option>
          <option value="FULL_DARING" ${activeKelompok === "FULL_DARING" ? "selected" : ""}>Full Daring</option>
          <option value="FULL_LURING" ${activeKelompok === "FULL_LURING" ? "selected" : ""}>Full Luring</option>
        </select>
      </td>
      <td style="text-align: center;">
        <select class="form-control select-row-course-sks" style="padding: 4px 8px; font-size: 12px; height: 32px; background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-weight: 600; border-radius: 6px; width: 100%; text-align: center;">
          <option value="1" ${activeSks === 1 ? "selected" : ""}>1 SKS</option>
          <option value="2" ${activeSks === 2 ? "selected" : ""}>2 SKS</option>
          <option value="3" ${activeSks === 3 ? "selected" : ""}>3 SKS</option>
          <option value="4" ${activeSks === 4 ? "selected" : ""}>4 SKS</option>
          <option value="6" ${activeSks === 6 ? "selected" : ""}>6 SKS</option>
        </select>
      </td>
      <td>
        <select class="form-control select-row-deadline-day" style="padding: 4px 8px; font-size: 12px; height: 32px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; width: 100%;">
          <option value="Senin" ${activeDay === "Senin" ? "selected" : ""}>Senin</option>
          <option value="Selasa" ${activeDay === "Selasa" ? "selected" : ""}>Selasa</option>
          <option value="Rabu" ${activeDay === "Rabu" ? "selected" : ""}>Rabu</option>
          <option value="Kamis" ${activeDay === "Kamis" ? "selected" : ""}>Kamis</option>
          <option value="Jumat" ${activeDay === "Jumat" ? "selected" : ""}>Jumat</option>
          <option value="Sabtu" ${activeDay === "Sabtu" ? "selected" : ""}>Sabtu</option>
          <option value="Minggu" ${activeDay === "Minggu" ? "selected" : ""}>Minggu</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-control input-row-deadline-time" value="${activeTime}" style="padding: 4px 8px; font-size: 12px; height: 32px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px; width: 100%; font-family: 'JetBrains Mono', monospace;">
      </td>
      <td style="text-align: center;">
        <span class="badge-table-pill success row-status-badge" style="font-size: 10.5px; font-weight: 600;">${kLabel} · ${activeSks} SKS · ${activeDay}</span>
      </td>
    `;

    const selectKelompok = row.querySelector(".select-row-course-kelompok");
    const selectSks = row.querySelector(".select-row-course-sks");
    const selectDay = row.querySelector(".select-row-deadline-day");
    const inputTime = row.querySelector(".input-row-deadline-time");
    const badgeStatus = row.querySelector(".row-status-badge");

    const onRowChange = () => {
      const kelVal = selectKelompok.value || "1";
      const sksVal = parseInt(selectSks.value, 10) || 2;
      const dayVal = selectDay.value || "Jumat";
      const timeVal = inputTime.value.trim() || "23:59 WIB";
      const badgeKel = getKelompokShortLabel(kelVal);
      if (badgeStatus) badgeStatus.textContent = `${badgeKel} · ${sksVal} SKS · ${dayVal}`;
      course.sks = sksVal;
      course.kelompok = kelVal;
      saveRowDeadline(courseCode, dayVal, timeVal, sksVal, kelVal);
    };

    selectKelompok.onchange = onRowChange;
    selectSks.onchange = onRowChange;
    selectDay.onchange = onRowChange;
    inputTime.onchange = onRowChange;

    tableCourseDeadlinesBody.appendChild(row);
    setupCustomDropdown(selectKelompok);
    setupCustomDropdown(selectSks);
    setupCustomDropdown(selectDay);
  });
}

async function saveRowDeadline(courseCode, day, time, sks, kelompok) {
  try {
    const payload = { kode_course: courseCode, day, time, sks, kelompok };
    const res = await fetch("/api/settings/course-deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      if (!currentClassSettings.course_deadlines) currentClassSettings.course_deadlines = {};
      currentClassSettings.course_deadlines[courseCode] = { day, time, sks, kelompok };
      const course = coursesList.find(c => c.kode_course === courseCode);
      if (course) {
        course.sks = sks;
        course.kelompok = kelompok;
      }
      populateCoursesDropdown();
      renderScheduleView();
      renderPersonalSummaryTable();
      updateCourseDeadlinePill();
      startCountdown();
      updateWaPreview();
    }
  } catch (e) {}
}

async function setAllCourseDeadlines(day, time = "23:59 WIB") {
  const updatedDeadlines = {};
  coursesList.forEach(c => {
    if (!c.kode_course || c.kode_course.includes("20252")) return;
    const prev = currentClassSettings?.course_deadlines?.[c.kode_course] || {};
    const prevSks = prev.sks !== undefined ? prev.sks : (c.sks || 2);
    const prevKel = prev.kelompok !== undefined ? prev.kelompok : (c.kelompok || ((c.coursename?.includes("[E-2]") || String(c.id_periode || "") === "2") ? "2" : "1"));
    updatedDeadlines[c.kode_course] = { day, time, sks: prevSks, kelompok: prevKel };
  });

  try {
    const res = await fetch("/api/settings/course-deadlines/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_deadlines: updatedDeadlines })
    });
    const data = await res.json();
    if (data.success) {
      currentClassSettings.course_deadlines = updatedDeadlines;
      renderCourseDeadlinesTable();
      updateCourseDeadlinePill();
      startCountdown();
      updateWaPreview();
      showToast(`⚡ Semua deadline mata kuliah disetel ke ${day}, ${time}`);
    }
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
}

// Wire Bulk Preset Buttons
const btnSetAllFriday = document.getElementById("btnSetAllFriday");
const btnSetAllSaturday = document.getElementById("btnSetAllSaturday");
if (btnSetAllFriday) {
  btnSetAllFriday.onclick = () => setAllCourseDeadlines("Jumat", "23:59 WIB");
}
if (btnSetAllSaturday) {
  btnSetAllSaturday.onclick = () => setAllCourseDeadlines("Sabtu", "23:59 WIB");
}

// Wire Deadline Modal Events
if (pillCourseDeadline) {
  pillCourseDeadline.onclick = () => openQuickDeadlineModal(selectCourse.value);
}
if (btnCloseQuickDeadline) {
  btnCloseQuickDeadline.onclick = closeQuickDeadlineModal;
}
if (btnCancelQuickDeadline) {
  btnCancelQuickDeadline.onclick = closeQuickDeadlineModal;
}
if (btnSaveQuickDeadline) {
  btnSaveQuickDeadline.onclick = saveQuickDeadline;
}
if (btnResetQuickDeadline) {
  btnResetQuickDeadline.onclick = () => {
    if (radioDeadlineDefault) radioDeadlineDefault.checked = true;
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "none";
    saveQuickDeadline();
  };
}
if (radioDeadlineDefault) {
  radioDeadlineDefault.onchange = () => {
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "none";
  };
}
if (radioDeadlineCustom) {
  radioDeadlineCustom.onchange = () => {
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "block";
  };
}
document.querySelectorAll(".btn-preset-deadline").forEach(btn => {
  btn.onclick = () => {
    if (radioDeadlineCustom) radioDeadlineCustom.checked = true;
    if (quickCustomDeadlineFields) quickCustomDeadlineFields.style.display = "block";
    if (quickDeadlineDay) quickDeadlineDay.value = btn.dataset.day;
    if (quickDeadlineTime) quickDeadlineTime.value = btn.dataset.time;
  };
});
if (btnResetAllDeadlines) {
  btnResetAllDeadlines.onclick = async () => {
    setAllCourseDeadlines("Jumat", "23:59 WIB");
  };
}

// ── Start Application ──────────────────────────────────────────────────────
init();
