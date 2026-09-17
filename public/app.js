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
const pageSize = 10;
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
    "15": "Pekan 15 (14 Des - 19 Des 2026)",
    "UAS": "Pekan UAS (21 Des - 26 Des 2026)",
    "16": "Pekan 16 (28 Des 2026 - 2 Jan 2027)"
  }
};

let WEEK_NAMES = { ...currentClassSettings.weeks };

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
    7: "UTS", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", 14: "14", 15: "15",
    16: "UAS", 17: "16"
  };

  return offsetToWeek[diffWeeks] || (diffWeeks > 17 ? "16" : "1");
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
const tabPendingPost = document.getElementById("tabPendingPost");
const tabDonePost = document.getElementById("tabDonePost");
const tabPendingForum = document.getElementById("tabPendingForum");
const tabDoneForum = document.getElementById("tabDoneForum");
const tabPendingAsg = document.getElementById("tabPendingAsg");
const tabPendingRevisi = document.getElementById("tabPendingRevisi");
const tabCountPost = document.getElementById("tabCountPost");
const tabCountDonePost = document.getElementById("tabCountDonePost");
const tabCountForum = document.getElementById("tabCountForum");
const tabCountDoneForum = document.getElementById("tabCountDoneForum");
const tabCountAsg = document.getElementById("tabCountAsg");
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

// Students Table & Filters
const searchStudent = document.getElementById("searchStudent");
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
const tabBtnWeeksSettings = document.getElementById("tabBtnWeeksSettings");
const tabBtnTemplates = document.getElementById("tabBtnTemplates");
const tabBtnBot = document.getElementById("tabBtnBot");
const tabBtnContacts = document.getElementById("tabBtnContacts");
const tabBtnSchedule = document.getElementById("tabBtnSchedule");

// Settings Modal Panels
const panelTabClassSettings = document.getElementById("panelTabClassSettings");
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

    const setData = await setRes.json().catch(() => null);
    if (setData && setData.settings) {
      applyClassSettings(setData.settings);
    }

    // Auto-select pekan aktif sekarang saat pertama kali dibuka
    const activeWeekKey = getCurrentSemesterWeek();
    if (selectWeek && activeWeekKey) {
      selectWeek.value = activeWeekKey;
    }

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
    syncWithSchedule();
    startCountdown();
    performScan();
  };

  selectWeek.onchange = () => {
    scanAllResults = null;
    populateCoursesDropdown();
    syncWithSchedule();
    startCountdown();
    performScan();
  };

  selectSection.onchange = () => {
    highlightActiveMeetingBtn(selectSection.value);
    performScan();
  };

  btnScan.onclick = performScan;
  btnScanAll.onclick = performScanAll;
  btnRefreshScan.onclick = performScan;

  // Middle Table Tabs
  tabPendingPost.onclick = () => switchMiddleTab("posttest");
  if (tabDonePost) tabDonePost.onclick = () => switchMiddleTab("done_posttest");
  tabPendingForum.onclick = () => switchMiddleTab("forum");
  if (tabDoneForum) tabDoneForum.onclick = () => switchMiddleTab("done_forum");
  tabPendingAsg.onclick = () => switchMiddleTab("assignment");
  if (tabPendingRevisi) tabPendingRevisi.onclick = () => switchMiddleTab("posttest");
  const tabStatusFordisDosen = document.getElementById("tabStatusFordisDosen");
  if (tabStatusFordisDosen) tabStatusFordisDosen.onclick = () => switchMiddleTab("status_fordis");

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
    setSidebarActive("navRangkumanPribadi");
    openPersonalSummaryModal();
  });
  document.getElementById("btnViewPersonalSummary")?.addEventListener("click", (e) => {
    e.preventDefault();
    openPersonalSummaryModal();
  });
  document.getElementById("userPill")?.addEventListener("click", () => {
    openPersonalSummaryModal();
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
    selectWeek.value = e.target.value;
    performScanAll().then(renderPersonalSummaryTable);
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
    openSettings("contacts");
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

  // Draft Names Toggle (Dengan Nama vs Ringkas Awal Pekan)
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
  searchStudent.oninput = (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    btnClearSearch.classList.toggle("hidden", currentSearchQuery.length === 0);
    currentPage = 1;
    filterAndRenderStudentsTable();
  };

  btnClearSearch.onclick = () => {
    searchStudent.value = "";
    currentSearchQuery = "";
    btnClearSearch.classList.add("hidden");
    currentPage = 1;
    filterAndRenderStudentsTable();
  };

  filterChips.forEach(chip => {
    chip.onclick = () => {
      setActiveFilter(chip.dataset.filter);
    };
  });

  btnExportCsv.onclick = exportToCsv;
  btnCopySheet.onclick = copyForGoogleSheets;

  btnModalReconnect.onclick = () => triggerAutoReconnect("Pembaruan sesi MENTARI");
  btnBannerReconnect.onclick = () => triggerAutoReconnect("Pembaruan sesi MENTARI");

  // ── UNIFIED SETTINGS MODAL ───────────────────────────────────────────────
  btnOpenSettings.onclick = () => openSettings("class");
  btnCloseSettings.onclick = closeSettings;
  if (btnCloseSettingsFooter) btnCloseSettingsFooter.onclick = closeSettings;

  if (tabBtnClassSettings) tabBtnClassSettings.onclick = () => switchSettingsTab("class");
  if (tabBtnWeeksSettings) tabBtnWeeksSettings.onclick = () => switchSettingsTab("weeks");
  if (tabBtnTemplates) tabBtnTemplates.onclick = () => switchSettingsTab("templates");
  tabBtnBot.onclick = () => switchSettingsTab("bot");
  tabBtnContacts.onclick = () => switchSettingsTab("contacts");
  tabBtnSchedule.onclick = () => switchSettingsTab("schedule");

  // Class Profile Handlers
  if (btnAutoDetectClass) btnAutoDetectClass.onclick = autoDetectClass;
  if (btnSaveClassProfile) btnSaveClassProfile.onclick = saveClassProfile;
  if (btnUseMentariName) {
    btnUseMentariName.onclick = () => {
      if (inputUserCustomName) inputUserCustomName.value = "";
      showToast("Nama disetel otomatis mengikuti profil akun MENTARI.");
    };
  }

  // Weeks & Deadline Handlers
  if (btnRecalculateWeeks) btnRecalculateWeeks.onclick = recalculateWeeksFromStartDate;
  if (btnSaveWeeksSettings) btnSaveWeeksSettings.onclick = saveWeeksAndDeadline;

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
}

// ── Multi-View Architecture Switcher ───────────────────────────────────────
let activeMainView = "dashboard";

function switchMainView(viewName, subTab = null) {
  activeMainView = viewName;

  const viewDashboard = document.getElementById("viewDashboard");
  const viewSchedule = document.getElementById("viewSchedule");
  const viewMonitoring = document.getElementById("viewMonitoring");
  const viewStudents = document.getElementById("viewStudents");

  if (viewDashboard) viewDashboard.classList.toggle("hidden", viewName !== "dashboard");
  if (viewSchedule) viewSchedule.classList.toggle("hidden", viewName !== "schedule");
  if (viewMonitoring) viewMonitoring.classList.toggle("hidden", viewName !== "monitoring");
  if (viewStudents) viewStudents.classList.toggle("hidden", viewName !== "students");

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
    if (subTab === "forum") setSidebarActive("navForumKurang");
    else if (subTab === "assignment") setSidebarActive("navBelumPenugasan");
    else if (subTab === "status_fordis") setSidebarActive("navStatusFordis");
    else setSidebarActive("navBelumPosttest");
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
    let label = `Pekan ${w}`;
    if (w === "UTS") label = "UTS";
    else if (w === "UAS") label = "UAS";
    return `<button class="sched-week-pill ${isActive ? "active" : ""}" onclick="renderScheduleView('${w}')">${label}</button>`;
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
    g1Badge.className = `sched-group-period-badge ${modeG1 === "DARING" ? "daring" : ""}`;
  }

  if (g2Badge) {
    g2Badge.textContent = `${modeG2} ${modeG2 === "LURING" ? "(Ruang V.619)" : "(MENTARI)"}`;
    g2Badge.className = `sched-group-period-badge ${modeG2 === "DARING" ? "daring" : ""}`;
  }

  // 3. Courses Filter
  const isG1 = (c) => String(c.id_periode || c.periode || "") === "1" || (c.coursename || "").includes("[E-1]");
  const isG2 = (c) => String(c.id_periode || c.periode || "") === "2" || (c.coursename || "").includes("[E-2]");
  const isDemo = (c) => (c.kode_course || "").includes("20252");

  const group1List = (coursesList || []).filter(c => isG1(c) && !isDemo(c));
  const group2List = (coursesList || []).filter(c => isG2(c) && !isDemo(c));

  // Helper to render card for a course
  function createCourseCard(c, groupKey, mode) {
    const sks = c.sks || 2;
    const cDead = getCourseDeadline(c.kode_course);
    const deadline = cDead.text;
    const todayBadge = cDead.isToday
      ? `<span class="badge-table-pill danger" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); font-weight: 700;">🚨 HARI INI</span>`
      : "";

    // Meetings calculation for this week
    let meetingStr = "Pertemuan Aktif";
    if (scheduleData?.meetings_by_sks?.[sks]?.week_mapping?.[currentWeek]) {
      const pArr = scheduleData.meetings_by_sks[sks].week_mapping[currentWeek];
      meetingStr = pArr.map(p => `Pertemuan ${p}`).join(" & ");
    } else if (currentWeek === "UTS") {
      meetingStr = "Sesi Ujian UTS";
    } else if (currentWeek === "UAS") {
      meetingStr = "Sesi Ujian UAS";
    }

    const modeBadge = mode === "LURING"
      ? `<span class="badge-table-pill success">🏫 LURING (Ruang V.619)</span>`
      : `<span class="badge-table-pill warning">🌐 DARING (MENTARI)</span>`;

    return `
      <div class="sched-course-card">
        <div class="sched-course-top">
          <div>
            <div class="sched-course-title">${c.nama_mata_kuliah || c.coursename}</div>
            <div class="sched-course-lecturer">
              <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${c.nama_dosen || "Dosen Pengampu"}</span>
            </div>
          </div>
          <span class="sched-group-sks" style="color: #60a5fa; background: rgba(59, 130, 246, 0.15);">${sks} SKS</span>
        </div>

        <div class="sched-course-meta-row">
          ${modeBadge}
          <span class="badge-table-pill info">${meetingStr}</span>
          ${todayBadge}
          <span class="badge-table-pill gray" style="cursor: pointer;" onclick="openQuickDeadlineModal('${c.kode_course}')" title="Klik untuk ubah deadline matkul ini">⏰ ${deadline} ✏️</span>
        </div>

        <div class="sched-course-footer">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim);">${c.kode_course}</span>
          <button class="btn btn-outline-primary btn-xs" onclick="selectAndMonitorCourse('${c.kode_course}', '${currentWeek}')">
            <span>Buka &amp; Pantau Tugas</span> →
          </button>
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
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
    item.classList.toggle("active", item.id === navId);
  });
}

function setActiveFilter(filterName) {
  activeFilter = filterName;
  filterChips.forEach(c => {
    c.classList.toggle("active", c.dataset.filter === filterName);
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

function populateCoursesDropdown() {
  const previousSelected = selectCourse.value;
  selectCourse.innerHTML = "";
  if (!coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
    console.warn("Daftar mata kuliah belum dimuat.");
    return;
  }

  const isG1 = (c) => String(c.id_periode || c.periode || "") === "1" || (c.coursename || "").includes("[E-1]");
  const isG2 = (c) => String(c.id_periode || c.periode || "") === "2" || (c.coursename || "").includes("[E-2]");
  const isDemo = (c) => (c.kode_course || "").includes("20252");

  const group1 = coursesList.filter(c => isG1(c) && !isDemo(c));
  const group2 = coursesList.filter(c => isG2(c) && !isDemo(c));
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
      const cDead = getCourseDeadline(c.kode_course);
      const todayTag = cDead.isToday ? " 🚨 [HARI INI]" : "";
      opt.textContent = `${c.nama_mata_kuliah || c.coursename} (${c.sks || 2} SKS)${todayTag}`;
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
      const cDead = getCourseDeadline(c.kode_course);
      const todayTag = cDead.isToday ? " 🚨 [HARI INI]" : "";
      opt.textContent = `${c.nama_mata_kuliah || c.coursename} (${c.sks || 2} SKS)${todayTag}`;
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
      const cDead = getCourseDeadline(c.kode_course);
      const todayTag = cDead.isToday ? " 🚨 [HARI INI]" : "";
      opt.textContent = `${c.nama_mata_kuliah || c.coursename} (${c.sks || 2} SKS)${todayTag}`;
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
      opt.textContent = `${c.nama_mata_kuliah || c.coursename} (Demo Data)`;
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

function syncWithSchedule() {
  const selectedCourseId = selectCourse.value;
  const selectedWeekVal = selectWeek.value;
  const course = coursesList.find(c => c.kode_course === selectedCourseId);

  if (!course) return;

  const sksNum = parseInt(course.sks || (course.coursename?.startsWith("[3]") ? 3 : 2), 10);
  const sks = String(sksNum);
  const maxMeetingsForCourse = sksNum === 2 ? 14 : 21; // 2 SKS max 14 pertemuan, 3 SKS max 21 pertemuan

  // Filter selectSection options dynamically based on SKS (max 14 or 21)
  Array.from(selectSection.options).forEach(opt => {
    const mNum = parseInt(opt.value.replace("PERTEMUAN_", ""), 10);
    if (!isNaN(mNum)) {
      opt.hidden = mNum > maxMeetingsForCourse;
      opt.disabled = mNum > maxMeetingsForCourse;
    }
  });

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
    selectSection.value = "PERTEMUAN_1";
    highlightActiveMeetingBtn("PERTEMUAN_1");
    return;
  }

  const isKelompok1 = String(course.id_periode || course.periode || "") === "1" || (course.coursename || "").includes("[E-1]");
  const groupKey = isKelompok1 ? "1" : "2";
  const kelompokName = isKelompok1 ? "Kelompok 1" : "Kelompok 2";
  const currentMode = getGroupMode(groupKey, selectedWeekVal);
  const isDaring = currentMode === "DARING";

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
    const mode = isUts
      ? (isKelompok1 ? "UTS LURING" : "UTS DARING")
      : (isKelompok1 ? "UAS DARING" : "UAS LURING");
    badgeMode.textContent = mode;
    badgeMode.className = mode.includes("DARING") ? "badge-mode-pill daring" : "badge-mode-pill luring";
    renderMeetingPills([isUts ? 8 : 16]);
    const secVal = isUts ? "PERTEMUAN_8" : "PERTEMUAN_16";
    selectSection.value = secVal;
    highlightActiveMeetingBtn(secVal);
    return;
  }

  const groupSchedule = scheduleData?.groups?.[groupKey]?.schedule?.[selectedWeekVal] || {};
  const sksSchedule = groupSchedule[sks] || { luring: [], daring: [] };
  const luringMeetings = sksSchedule.luring || [];
  const daringMeetings = sksSchedule.daring || [];

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

  const activeMeetings = hasDaring ? daringMeetings : luringMeetings;

  renderMeetingPills(activeMeetings);

  if (activeMeetings.length > 0 && typeof activeMeetings[0] === "number") {
    const defaultSec = `PERTEMUAN_${activeMeetings[0]}`;
    selectSection.value = defaultSec;
    highlightActiveMeetingBtn(defaultSec);
  }

  updateCourseDeadlinePill();
}

function getCourseDeadline(courseCode) {
  const custom = currentClassSettings?.course_deadlines?.[courseCode];
  const defDay = currentClassSettings?.deadline_day || "Jumat";
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
    isCustom: !!(custom && custom.day && custom.time),
    isToday,
    todayName
  };
}

function updateCourseDeadlinePill() {
  const selectedCourseId = selectCourse?.value;
  if (!selectedCourseId || !textCourseDeadline) return;
  const deadline = getCourseDeadline(selectedCourseId);
  const todayBadge = deadline.isToday
    ? ` <span class="badge-deadline-today" style="font-size: 10px; background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); padding: 1px 6px; border-radius: 4px; margin-left: 4px; font-weight: 700;">🚨 HARI INI</span>`
    : "";
  if (deadline.isCustom) {
    textCourseDeadline.innerHTML = `Deadline: <strong style="color: #38bdf8;">${deadline.text}</strong> <span style="font-size: 9px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 4px; border-radius: 3px; margin-left: 2px;">KHUSUS</span>${todayBadge}`;
  } else {
    textCourseDeadline.innerHTML = `Deadline: ${deadline.text}${todayBadge}`;
  }
}

function renderMeetingPills(meetings) {
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
      selectSection.value = secVal;
      highlightActiveMeetingBtn(secVal);
      performScan();
    };
    meetingBtnGroup.appendChild(btn);
  });
}

function highlightActiveMeetingBtn(secVal) {
  document.querySelectorAll(".btn-meeting-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === secVal);
  });
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
  };

  update();
  countdownTimer = setInterval(update, 1000);
}

let mentariLoginName = "";

function updateUserDisplayName() {
  const custom = currentClassSettings?.user_custom_name?.trim();
  const nameToDisplay = custom || mentariLoginName || "ATTHORIQ";
  if (userName) {
    userName.textContent = nameToDisplay;
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

async function triggerAutoReconnect(reason = "Sesi MENTARI telah habis") {
  const now = Date.now();
  if (isReconnectingUi) return;

  // Debounce: block if a reconnect occurred in the last 20 seconds
  if (now - lastReconnectTime < 20000) {
    console.warn("Pembaruan sesi dicegah untuk menghindari looping.");
    return;
  }

  // Max 1 auto-attempt per cycle to prevent any infinite window loops
  if (autoReconnectAttempts >= 1) {
    console.warn("Batas auto-reconnect tercapai.");
    showToast("⚠️ Sesi MENTARI perlu diperbarui. Klik tombol 'Perbarui Sesi' di menu.");
    statusValText.textContent = "Offline";
    statusValText.className = "status-val offline";
    reconnectBanner.classList.remove("hidden");
    return;
  }

  isReconnectingUi = true;
  lastReconnectTime = now;
  autoReconnectAttempts++;

  showToast(`🔄 ${reason}. Membuka jendela login...`);
  statusValText.textContent = "Memperbarui...";
  statusValText.className = "status-val warning";
  statusDot.className = "status-indicator-dot warning";
  if (sessionStatusDetail) {
    sessionStatusDetail.textContent = "Memperbarui...";
    sessionStatusDetail.className = "badge-table-pill warning";
  }

  btnScan.disabled = true;
  scanBtnText.textContent = "Menunggu Login...";

  try {
    const res = await fetch("/api/reconnect", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToast("🎉 Sesi MENTARI berhasil diperbarui!");
      autoReconnectAttempts = 0; // reset on success
      await checkSessionStatus();
      // Delay 1.5 detik agar browser context sepenuhnya bersih sebelum scan ulang
      setTimeout(() => performScan(true), 1500);
    } else {
      showToast(`Pembaruan sesi dibatalkan: ${data.error || "Jendela ditutup"}`);
      await checkSessionStatus();
    }
  } catch (err) {
    showToast(`Error pembaruan sesi: ${err.message}`);
    await checkSessionStatus();
  } finally {
    isReconnectingUi = false;
    btnScan.disabled = false;
    scanBtnText.textContent = "Cek Status";
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

  const topStudents = problemStudents.slice(0, 6);
  quickFollowupList.innerHTML = topStudents.map(m => {
    const contact = classContacts[m.nim];
    const phone = contact?.phone || "-";
    const hasPhone = phone !== "-";

    const issues = [];
    if (m.posttest_status === "BELUM_MENGERJAKAN") issues.push("Posttest");
    if (m.forum_status === "BELUM_MEMENUHI") issues.push(`Fordis (${m.forum_reply_count || 1}x)`);
    else if (m.forum_status === "BELUM_MENGERJAKAN") issues.push("Fordis (0x)");
    else if (m.has_unanswered_topic) issues.push("Topik 2 Kosong");
    if (m.assignment_status === "BELUM_MENGUMPULKAN") issues.push("Tugas");
    const issueText = issues.join(" & ");

    let waAction = "";
    if (hasPhone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const msg = encodeURIComponent(`Halo ${m.nama_mahasiswa}, mengingatkan untuk perkuliahan ${data.mataKuliah || "ini"}: ${issueText} masih belum selesai di MENTARI. Yuk segera dikerjakan ya! Semangat! 💪`);
      waAction = `
        <a href="https://wa.me/${cleanPhone}?text=${msg}" target="_blank" class="btn btn-ghost btn-xs" style="color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3);" title="Kirim WA pengingat langsung">
          <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span>Chat WA</span>
        </a>
      `;
    } else {
      waAction = `<span style="font-size: 11px; color: var(--text-dim);">-</span>`;
    }

    return `
      <div class="quick-followup-item">
        <div class="quick-followup-col">
          <span class="quick-followup-name">${m.nama_mahasiswa}</span>
          <span class="quick-followup-meta">
            <span style="font-family: 'JetBrains Mono', monospace;">${m.nim}</span>
            <span>•</span>
            <span style="color: #fca5a5;">${issueText}</span>
          </span>
        </div>
        <div class="quick-followup-actions">
          ${waAction}
        </div>
      </div>
    `;
  }).join("");

  if (problemStudents.length > 6) {
    const sisa = problemStudents.length - 6;
    quickFollowupList.innerHTML += `
      <div style="text-align: center; padding: 6px 0;">
        <button class="btn btn-ghost btn-xs" onclick="switchMainView('monitoring')" style="color: #60a5fa;">
          + ${sisa} mahasiswa lainnya (Buka Monitoring Tugas) →
        </button>
      </div>
    `;
  }
}

// ── 9. Middle Tabbed Table Panel ───────────────────────────────────────────
function switchMiddleTab(tabName) {
  if (tabName === "revisi") tabName = "posttest";
  activeMiddleTab = tabName;

  tabPendingPost.classList.toggle("active", tabName === "posttest");
  if (tabDonePost) tabDonePost.classList.toggle("active", tabName === "done_posttest");
  tabPendingForum.classList.toggle("active", tabName === "forum");
  if (tabDoneForum) tabDoneForum.classList.toggle("active", tabName === "done_forum");
  tabPendingAsg.classList.toggle("active", tabName === "assignment");
  const tabStatusFordisDosen = document.getElementById("tabStatusFordisDosen");
  if (tabStatusFordisDosen) tabStatusFordisDosen.classList.toggle("active", tabName === "status_fordis");
  if (tabPendingRevisi) tabPendingRevisi.classList.toggle("active", false);

  if (tabName === "posttest") {
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
  if (tabName === "status_fordis") {
    renderFordisStatusMiddleTable();
    return;
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

  tabCountPost.textContent = pendingPost.length;
  if (tabCountDonePost) tabCountDonePost.textContent = donePost.length;
  tabCountForum.textContent = needForum.length;
  if (tabCountDoneForum) tabCountDoneForum.textContent = doneForum.length;
  if (data.assignment?.is_private) {
    tabCountAsg.textContent = "🔒";
    tabCountAsg.title = "Dibatasi Privasi MENTARI";
  } else {
    tabCountAsg.textContent = pendingAsg.length;
    tabCountAsg.title = "";
  }
  if (tabCountRevisi) tabCountRevisi.textContent = "0";

  middleTableBody.innerHTML = "";

  let listToRender = [];
  let statusBadgeClass = "danger";
  let statusLabelFn = (m) => "Belum Mengerjakan";

  if (tabName === "posttest") {
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

  viewAllCount.textContent = listToRender.length;

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
      ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" class="wa-phone-link">
          <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span>${phone}</span>
         </a>`
      : `<span style="color: #64748b;">-</span>`;

    const revisiBadge = m.is_revisi ? `<span class="tag-badge-revisi">Revisi</span>` : "";

    let cellStatusContent = `<span class="badge-table-pill ${statusBadgeClass}">${statusLabelFn(m)}</span>`;

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
      <td style="font-family: 'JetBrains Mono', monospace; color: #94a3b8;">${m.nim}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px;">
          <strong>${m.nama_mahasiswa}</strong>
          ${revisiBadge}
        </div>
      </td>
      <td>${waLink}</td>
      <td>${cellStatusContent}</td>
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
  const selectDraft = document.getElementById("selectDraftIncludeNames");
  if (selectDraft) {
    selectDraft.value = waIncludeStudentNames ? "true" : "false";
  }
}

function updateDraftNamesToggleVisibility() {
  const group = document.getElementById("draftNamesToggleGroup");
  if (group) {
    group.style.display = activeWaTab === "matkul" ? "inline-flex" : "none";
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
  if (activeWaTab === "matkul") {
    if (currentScanData?.waTemplate) {
      const courseCode = selectCourse.value;
      const cDead = getCourseDeadline(courseCode);
      const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";
      
      let baseTemplate;
      if (waIncludeStudentNames) {
        baseTemplate = currentScanData.waTemplate;
      } else {
        baseTemplate = currentScanData.waTemplateSummary || generateMatkulSummaryText(currentScanData);
      }

      const updatedText = baseTemplate.replace(/\*Deadline:[^\n]*/, `*Deadline: ${cDead.text}*${todayBadge}`);
      waMessageContent.textContent = updatedText;
    } else {
      waMessageContent.textContent = "*Pilih mata kuliah dan klik Cek Status untuk melihat draf...*";
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
  waMessageContent.textContent = rendered;
}

function copyWaDraft() {
  const text = waMessageContent.textContent;
  if (!text || text.startsWith("*Pilih")) {
    showToast("Belum ada draft siap salin.");
    return;
  }
  navigator.clipboard.writeText(text);
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
function updateFilterCounts() {
  const total = currentStudentsList.length;
  const pendingPost = currentStudentsList.filter(m => m.posttest_status === "BELUM_MENGERJAKAN").length;
  const donePost = currentStudentsList.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN").length;
  const pendingForum = currentStudentsList.filter(m => m.forum_status === "BELUM_MEMENUHI" || m.forum_status === "BELUM_MENGERJAKAN").length;
  const doneForum = currentStudentsList.filter(m => m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2)).length;
  const pendingAsg = currentStudentsList.filter(m => m.assignment_status === "BELUM_MENGUMPULKAN").length;
  const complete = currentStudentsList.filter(m =>
    (m.posttest_status === "SUDAH_MENGERJAKAN" || m.posttest_status === "NOT_AVAILABLE") &&
    (m.forum_status === "MEMENUHI" || m.forum_status === "NOT_AVAILABLE") &&
    (m.assignment_status === "SUDAH_MENGUMPULKAN" || m.assignment_status === "NOT_AVAILABLE" || m.assignment_status === "PRIVAT_MENTARI")
  ).length;

  filterAllCount.textContent = total;
  filterPostCount.textContent = pendingPost;
  if (filterDonePostCount) filterDonePostCount.textContent = donePost;
  filterForumCount.textContent = pendingForum;
  if (filterDoneForumCount) filterDoneForumCount.textContent = doneForum;
  filterAsgCount.textContent = pendingAsg;
  filterCompleteCount.textContent = complete;
}

function filterAndRenderStudentsTable() {
  tableStudentsBody.innerHTML = "";

  let filtered = currentStudentsList.filter(m => {
    if (currentSearchQuery) {
      const matchName = (m.nama_mahasiswa || "").toLowerCase().includes(currentSearchQuery);
      const matchNim = (m.nim || "").toLowerCase().includes(currentSearchQuery);
      if (!matchName && !matchNim) return false;
    }
    if (activeFilter === "PENDING_POST") return m.posttest_status === "BELUM_MENGERJAKAN";
    if (activeFilter === "DONE_POST") return m.posttest_status === "SUDAH_MENGERJAKAN";
    if (activeFilter === "PENDING_FORUM") return m.forum_status === "BELUM_MEMENUHI" || m.forum_status === "BELUM_MENGERJAKAN";
    if (activeFilter === "DONE_FORUM") return m.forum_status === "MEMENUHI" || (m.forum_reply_count && m.forum_reply_count >= 2);
    if (activeFilter === "PENDING_ASG") return m.assignment_status === "BELUM_MENGUMPULKAN";
    if (activeFilter === "COMPLETE") {
      return (m.posttest_status === "SUDAH_MENGERJAKAN" || m.posttest_status === "NOT_AVAILABLE") &&
             (m.forum_status === "MEMENUHI" || m.forum_status === "NOT_AVAILABLE") &&
             (m.assignment_status === "SUDAH_MENGUMPULKAN" || m.assignment_status === "NOT_AVAILABLE" || m.assignment_status === "PRIVAT_MENTARI");
    }
    return true;
  });

  // Urutkan: Mahasiswa UTAMA terlebih dahulu (A-Z), disusul Mahasiswa REVISI (A-Z)
  filtered.sort((a, b) => {
    const isRevisiA = a.is_revisi ? 1 : 0;
    const isRevisiB = b.is_revisi ? 1 : 0;
    if (isRevisiA !== isRevisiB) return isRevisiA - isRevisiB;
    const nameA = (a.nama_mahasiswa || "").trim().toUpperCase();
    const nameB = (b.nama_mahasiswa || "").trim().toUpperCase();
    return nameA.localeCompare(nameB, "id");
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  paginationInfo.textContent = totalFiltered > 0
    ? `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, totalFiltered)} of ${totalFiltered}`
    : `Showing 0 to 0 of 0`;

  renderPaginationControls(totalPages);

  if (pageItems.length === 0) {
    tableStudentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center empty-cell">
          Tidak ada data mahasiswa yang sesuai dengan filter.
        </td>
      </tr>
    `;
    return;
  }

  pageItems.forEach((m, idx) => {
    const row = document.createElement("tr");
    const isCurrentUser = (m.nama_mahasiswa || "").toLowerCase().includes("atthoriq");
    const contact = classContacts[m.nim];
    const phone = contact?.phone || "";

    // Status Badges
    let postBadge = `<span class="badge-table-pill gray">Belum Ada</span>`;
    if (m.posttest_status === "SUDAH_MENGERJAKAN") postBadge = `<span class="badge-table-pill success">Sudah</span>`;
    else if (m.posttest_status === "BELUM_MENGERJAKAN") postBadge = `<span class="badge-table-pill danger">Belum</span>`;

    let forumBadge = `<span class="badge-table-pill gray">Belum Ada</span>`;
    if (m.forum_status === "MEMENUHI") {
      if (m.has_unanswered_topic) {
        forumBadge = `<div class="topic-breakdown-cell"><span class="badge-table-pill warning" title="Ada topik diskusi dosen yang belum diisi">Memenuhi (${m.forum_reply_count || 2}x) ⚠️</span>`;
        if (m.forum_topics_breakdown && m.forum_topics_breakdown.length > 1) {
          forumBadge += `<div class="topic-breakdown-sub">${m.forum_topics_breakdown.map((tb, i) => `T${i + 1}:${tb.count}x`).join(" ")}</div>`;
        }
        forumBadge += `</div>`;
      } else {
        forumBadge = `<div class="topic-breakdown-cell"><span class="badge-table-pill success">Lengkap (${m.forum_reply_count || 2}x)</span>`;
        if (m.forum_topics_breakdown && m.forum_topics_breakdown.length > 1) {
          forumBadge += `<div class="topic-breakdown-sub">${m.forum_topics_breakdown.map((tb, i) => `T${i + 1}:${tb.count}x`).join(" ")}</div>`;
        }
        forumBadge += `</div>`;
      }
    } else if (m.forum_status === "BELUM_MEMENUHI") {
      forumBadge = `<div class="topic-breakdown-cell"><span class="badge-table-pill warning">Kurang (${m.forum_reply_count || 1}x)</span>`;
      if (m.forum_topics_breakdown && m.forum_topics_breakdown.length > 1) {
        forumBadge += `<div class="topic-breakdown-sub">${m.forum_topics_breakdown.map((tb, i) => `T${i + 1}:${tb.count}x`).join(" ")}</div>`;
      }
      forumBadge += `</div>`;
    } else if (m.forum_status === "BELUM_MENGERJAKAN") {
      forumBadge = `<span class="badge-table-pill danger">Belum</span>`;
    }

    let asgBadge = `<span class="badge-table-pill gray">Belum Ada</span>`;
    if (m.assignment_status === "SUDAH_MENGUMPULKAN") asgBadge = `<span class="badge-table-pill success">Sudah</span>`;
    else if (m.assignment_status === "BELUM_MENGUMPULKAN") asgBadge = `<span class="badge-table-pill danger">Belum</span>`;
    else if (m.assignment_status === "PRIVAT_MENTARI") asgBadge = `<span class="badge-table-pill info" title="Privasi MENTARI (Cek portal masing-masing)">Privat</span>`;

    const userTag = isCurrentUser ? `<span class="tag-user-anda">Anda</span>` : "";
    const phoneSub = phone ? `<div style="font-size: 10px; color: #38bdf8; font-family: 'JetBrains Mono', monospace;">${phone}</div>` : "";

    const actionWa = phone
      ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" title="Chat WhatsApp" style="color: #34d399; margin-right: 6px;">
          <svg class="icon icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
         </a>`
      : `<span style="color: #4b5563; margin-right: 6px;">-</span>`;

    const revisiTag = m.is_revisi ? `<span class="tag-badge-revisi">Revisi</span>` : "";

    row.innerHTML = `
      <td>${startIdx + idx + 1}</td>
      <td style="font-family: 'JetBrains Mono', monospace; color: #94a3b8;">${m.nim}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <strong>${m.nama_mahasiswa}</strong>
          ${revisiTag}
          ${userTag}
        </div>
        ${phoneSub}
      </td>
      <td>${postBadge}</td>
      <td>${forumBadge}</td>
      <td>${asgBadge}</td>
      <td>${actionWa}</td>
    `;
    tableStudentsBody.appendChild(row);
  });
}

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
  if (!currentStudentsList || currentStudentsList.length === 0) {
    showToast("Belum ada data mahasiswa untuk diekspor.");
    return;
  }
  let csv = "No,NIM,Nama Mahasiswa,Tipe,Status Posttest,Status Forum,Reply Forum,Penugasan Terstruktur\n";
  currentStudentsList.forEach((m, idx) => {
    const tipe = m.is_revisi ? "Revisi" : "Utama";
    csv += `"${idx+1}","'${m.nim}'","${m.nama_mahasiswa}","${tipe}","${m.posttest_status}","${m.forum_status}","${m.forum_reply_count||0}","${m.assignment_status}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_TugasKu_${selectCourse.value}_Pekan${selectWeek.value}.csv`;
  a.click();
  showToast("File CSV berhasil diunduh.");
}

function copyForGoogleSheets() {
  if (!currentStudentsList || currentStudentsList.length === 0) {
    showToast("Belum ada data mahasiswa untuk disalin.");
    return;
  }
  let tsv = "No\tNIM\tNama Mahasiswa\tTipe\tStatus Posttest\tStatus Forum\tReply Forum\tPenugasan Terstruktur\n";
  currentStudentsList.forEach((m, idx) => {
    const tipe = m.is_revisi ? "Revisi" : "Utama";
    tsv += `${idx+1}\t${m.nim}\t${m.nama_mahasiswa}\t${tipe}\t${m.posttest_status}\t${m.forum_status}\t${m.forum_reply_count||0}\t${m.assignment_status}\n`;
  });
  navigator.clipboard.writeText(tsv);
  showToast("Data berhasil disalin! Silakan paste langsung di Google Sheets.");
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
      <td>${fordisBadge}</td>
      <td>
        ${!isPureLuring ? `<button class="btn btn-outline-primary btn-sm btn-middle-select-matkul" data-code="${res.kodeCourse}">Pilih Matkul</button>` : `<span style="color: #64748b;">-</span>`}
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
      <td>
        ${!isPureLuring ? `<button class="btn btn-ghost btn-sm btn-modal-select-matkul" data-code="${res.kodeCourse}">Pilih Matkul</button>` : `<span style="color: #64748b;">-</span>`}
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
let currentPersonalNim = "241011401354";
let currentPersonalName = "ATTHORIQ RHEVAL FAHLEVI";

function openPersonalSummaryModal() {
  const modal = document.getElementById("modalPersonalSummary");
  if (!modal) return;
  modal.classList.remove("hidden");
  populatePersonalStudentDropdown();
  populatePersonalWeekDropdown();
  renderPersonalSummaryTable();
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
      nama_mahasiswa: currentPersonalName || "ATTHORIQ RHEVAL FAHLEVI"
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

async function refreshPersonalSummary() {
  const btn = document.getElementById("btnRefreshPersonal");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width: 12px; height: 12px; display: inline-block;"></span> <span>Memindai...</span>`;
  }
  try {
    await performScanAll();
    populatePersonalStudentDropdown();
    await renderPersonalSummaryTable();
    showToast("Status tugas pribadi berhasil diperbarui.");
  } finally {
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
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center empty-cell" style="padding: 30px;">
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 6px;">Sedang memindai seluruh mata kuliah pekan ini...</div>
          <div style="font-size: 12px; color: #94a3b8;">Mohon tunggu sebentar selagi data diambil dari MENTARI.</div>
        </td>
      </tr>
    `;
    await performScanAll();
    populatePersonalStudentDropdown();
  }

  if (!scanAllResults || scanAllResults.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center empty-cell" style="padding: 30px;">
          Belum ada data pindaian mata kuliah. Klik tombol "Scan Ulang" di atas.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";
  let totalCoursesCount = 0;
  let doneCoursesCount = 0;
  let pendingCoursesCount = 0;
  let todayDeadlineCount = 0;

  const targetNim = currentPersonalNim;
  const isTargetMe = targetNim === currentPersonalNim;

  scanAllResults.forEach((res, idx) => {
    const cDead = getCourseDeadline(res.kodeCourse);
    if (cDead.isToday) todayDeadlineCount++;

    const hasActiveTasks = res.hasAnyActivity || (res.scannedMeetings || []).some(m => m.hasActivity || m.forum?.available || m.assignment?.available || m.posttest?.available);
    const hasDaring = res.isDaring || (res.daringMeetings && res.daringMeetings.length > 0) || hasActiveTasks;
    const isPureLuring = !hasActiveTasks && (!hasDaring || (res.isLuring && (!res.daringMeetings || res.daringMeetings.length === 0)));

    if (isPureLuring) {
      totalCoursesCount++;
      doneCoursesCount++;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #60a5fa; font-weight: 500;">🏫 TATAP MUKA (LURING) • ${res.sks || 2} SKS</div>
        </td>
        <td><span class="badge-table-pill gray">Jadwal Kelas</span></td>
        <td><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td><span class="badge-table-pill gray">Tatap Muka</span></td>
        <td><span class="badge-table-pill success">🟢 Tatap Muka</span></td>
        <td>-</td>
      `;
      tbody.appendChild(row);
      return;
    }

    const meetings = res.scannedMeetings || [];
    if (meetings.length === 0) {
      totalCoursesCount++;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #94a3b8;">${res.sks || 2} SKS</div>
        </td>
        <td><span class="badge-table-pill gray">${cDead.text}</span></td>
        <td colspan="4" class="text-center" style="color: #64748b;">Belum ada pertemuan daring aktif pekan ini</td>
        <td>-</td>
      `;
      tbody.appendChild(row);
      return;
    }

    meetings.forEach((m, mIdx) => {
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
            // Akun sendiri: Jika tidak tercatat di MENTARI, berarti belum submit tugas
            asgHtml = `<span class="badge-table-pill danger" title="Belum terdeteksi pengumpulan di portal MENTARI.">❌ Belum Submit</span>`;
            isAsgDone = false;
          } else {
            // Akun rekan lain: MENTARI membatasi hak akses file tugas
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

      // 4. Overall Status
      const isCourseActive = m.forum?.available || m.posttest?.available || m.assignment?.available;
      let overallHtml = `<span class="badge-table-pill gray">Belum Ada Tugas</span>`;
      if (isCourseActive) {
        if (isForumDone && isAsgDone && isPostDone) {
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
        <td>${idx + 1}</td>
        <td>
          <strong style="color: #f8fafc;">${res.mataKuliah || res.coursename}</strong>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 500;">Pertemuan ${pNum} • ${res.sks || 2} SKS</div>
        </td>
        <td>
          <div style="font-weight: 600; color: ${cDead.isToday ? '#f87171' : '#cbd5e1'}; font-size: 12px;">${cDead.text}</div>
          ${todayBadge}
        </td>
        <td>${forumHtml}</td>
        <td>${asgHtml}</td>
        <td>${postHtml}</td>
        <td>${overallHtml}</td>
        <td>
          <button class="btn btn-outline-primary btn-xs btn-personal-select" data-code="${res.kodeCourse}">Buka</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  });

  if (statTotal) statTotal.textContent = totalCoursesCount;
  if (statDone) statDone.textContent = doneCoursesCount;
  if (statPending) statPending.textContent = pendingCoursesCount;
  if (statToday) statToday.textContent = todayDeadlineCount;

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

    const meetings = res.scannedMeetings || [];
    const cDead = getCourseDeadline(res.kodeCourse);
    const todayBadge = cDead.isToday ? " 🚨 *[DEADLINE HARI INI]*" : "";

    meetings.forEach((m, mIdx) => {
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
  if (deadlineSub) deadlineSub.textContent = `Deadline: ${currentClassSettings.deadline_day || "Jumat"}, ${currentClassSettings.deadline_time || "23:59 WIB"}`;

  if (currentClassSettings.weeks) {
    WEEK_NAMES = { ...currentClassSettings.weeks };
    if (selectWeek) {
      const activeWeekKey = getCurrentSemesterWeek();
      Array.from(selectWeek.options).forEach(opt => {
        if (WEEK_NAMES[opt.value]) {
          const isCurrent = opt.value === activeWeekKey;
          opt.textContent = isCurrent ? `${WEEK_NAMES[opt.value]} • Pekan Sekarang` : WEEK_NAMES[opt.value];
        }
      });
    }
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

  Object.keys(weeks).forEach(wKey => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong style="color: #60a5fa;">${wKey === "UTS" || wKey === "UAS" ? wKey : 'Pekan ' + wKey}</strong></td>
      <td>
        <input type="text" class="form-control input-week-label" data-week="${wKey}" value="${weeks[wKey]}" style="padding: 4px 8px; font-size: 11px; font-family: 'JetBrains Mono', monospace;">
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

async function saveWeeksAndDeadline() {
  const deadlineDay = selectDeadlineDay?.value || "Jumat";
  const deadlineTime = inputDeadlineTime?.value.trim() || "23:59 WIB";

  const customWeeks = {};
  document.querySelectorAll(".input-week-label").forEach(input => {
    const wKey = input.dataset.week;
    if (wKey) customWeeks[wKey] = input.value.trim();
  });

  const courseDeadlines = {};
  document.querySelectorAll("#tableCourseDeadlinesBody tr").forEach(row => {
    const cCode = row.dataset.courseCode;
    const day = row.querySelector(".select-row-deadline-day")?.value;
    const time = row.querySelector(".input-row-deadline-time")?.value.trim() || deadlineTime;
    if (cCode && day) {
      courseDeadlines[cCode] = { day, time };
    }
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
        deadline_day: deadlineDay,
        deadline_time: deadlineTime,
        weeks: Object.keys(customWeeks).length > 0 ? customWeeks : currentClassSettings.weeks,
        course_deadlines: courseDeadlines
      })
    });
    const data = await res.json();
    if (data.success) {
      applyClassSettings(data.settings);
      startCountdown();
      updateWaPreview();
      showToast("✅ Pengaturan pekan & deadline berhasil disimpan!");
      closeSettings();
    } else {
      showToast(`Gagal menyimpan: ${data.error}`);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`);
  } finally {
    if (btnSaveWeeksSettings) {
      btnSaveWeeksSettings.disabled = false;
      btnSaveWeeksSettings.textContent = "Simpan Pengaturan Pekan & Deadline";
    }
  }
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
  modalSettings.classList.remove("hidden");
  switchSettingsTab(initialTab);
}

function closeSettings() {
  if (!modalSettings) return;
  modalSettings.classList.add("hidden");
}

function switchSettingsTab(tabKey) {
  const tabs = [
    { key: "class", btn: tabBtnClassSettings, panel: panelTabClassSettings },
    { key: "weeks", btn: tabBtnWeeksSettings, panel: panelTabWeeksSettings },
    { key: "templates", btn: tabBtnTemplates, panel: panelTabTemplates },
    { key: "bot", btn: tabBtnBot, panel: panelTabBot },
    { key: "contacts", btn: tabBtnContacts, panel: panelTabContacts },
    { key: "schedule", btn: tabBtnSchedule, panel: panelTabSchedule }
  ];

  tabs.forEach(t => {
    if (t.btn) t.btn.classList.toggle("active", t.key === tabKey);
    if (t.panel) t.panel.classList.toggle("active", t.key === tabKey);
  });

  if (tabKey === "contacts") renderContactsList();
  if (tabKey === "bot") loadBotStatus();
  if (tabKey === "templates") updateTemplateEditorView();
  if (tabKey === "weeks") renderCourseDeadlinesTable();
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
        delete currentClassSettings.course_deadlines[courseCode];
      } else {
        currentClassSettings.course_deadlines[courseCode] = {
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

  const defaultDay = currentClassSettings?.deadline_day || "Jumat";
  const defaultTime = currentClassSettings?.deadline_time || "23:59 WIB";

  coursesList.forEach(course => {
    if (course.kode_course?.includes("20252")) return;
    const courseCode = course.kode_course;
    const courseName = course.nama_mata_kuliah || course.coursename?.split('#')[0].replace(/^\[\d+\]\s*/, '') || courseCode;
    const dosen = course.nama_dosen || "Dosen Pengampu";
    const custom = currentClassSettings?.course_deadlines?.[courseCode];
    const isCustom = !!custom;

    const row = document.createElement("tr");
    row.dataset.courseCode = courseCode;
    row.innerHTML = `
      <td>
        <div style="font-weight: 600; color: #f8fafc; font-size: 12.5px;">${courseName}</div>
        <div style="font-size: 11px; color: #64748b;">${dosen}</div>
      </td>
      <td>
        <select class="form-control select-row-deadline-day" style="padding: 4px 8px; font-size: 12px; height: 30px;">
          <option value="">(Default: ${defaultDay})</option>
          <option value="Senin" ${custom?.day === "Senin" ? "selected" : ""}>Senin</option>
          <option value="Selasa" ${custom?.day === "Selasa" ? "selected" : ""}>Selasa</option>
          <option value="Rabu" ${custom?.day === "Rabu" ? "selected" : ""}>Rabu</option>
          <option value="Kamis" ${custom?.day === "Kamis" ? "selected" : ""}>Kamis</option>
          <option value="Jumat" ${custom?.day === "Jumat" ? "selected" : ""}>Jumat</option>
          <option value="Sabtu" ${custom?.day === "Sabtu" ? "selected" : ""}>Sabtu</option>
          <option value="Minggu" ${custom?.day === "Minggu" ? "selected" : ""}>Minggu</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-control input-row-deadline-time" placeholder="${defaultTime}" value="${custom?.time || ''}" style="padding: 4px 8px; font-size: 12px; height: 30px; font-family: 'JetBrains Mono', monospace;">
      </td>
      <td>
        ${isCustom 
          ? `<span class="badge-table-pill info btn-reset-row-deadline" style="font-size: 10px; cursor: pointer;" title="Klik untuk reset ke default kelas">Khusus ↺</span>` 
          : `<span class="badge-table-pill" style="font-size: 10px; opacity: 0.6;">Default</span>`}
      </td>
    `;

    const btnResetRow = row.querySelector(".btn-reset-row-deadline");
    if (btnResetRow) {
      btnResetRow.onclick = () => {
        row.querySelector(".select-row-deadline-day").value = "";
        row.querySelector(".input-row-deadline-time").value = "";
        saveRowDeadline(courseCode, null, null);
      };
    }

    const selectDay = row.querySelector(".select-row-deadline-day");
    const inputTime = row.querySelector(".input-row-deadline-time");

    const onRowChange = () => {
      const dayVal = selectDay.value;
      const timeVal = inputTime.value.trim() || defaultTime;
      if (dayVal) {
        saveRowDeadline(courseCode, dayVal, timeVal);
      } else {
        saveRowDeadline(courseCode, null, null);
      }
    };

    selectDay.onchange = onRowChange;
    inputTime.onchange = onRowChange;

    tableCourseDeadlinesBody.appendChild(row);
  });
}

async function saveRowDeadline(courseCode, day, time) {
  try {
    const payload = !day
      ? { kode_course: courseCode, reset: true }
      : { kode_course: courseCode, day, time };
    const res = await fetch("/api/settings/course-deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      if (!currentClassSettings.course_deadlines) currentClassSettings.course_deadlines = {};
      if (!day) {
        delete currentClassSettings.course_deadlines[courseCode];
      } else {
        currentClassSettings.course_deadlines[courseCode] = { day, time };
      }
      renderCourseDeadlinesTable();
      updateCourseDeadlinePill();
      updateWaPreview();
    }
  } catch (e) {}
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
    if (confirm("Kembalikan seluruh mata kuliah ke deadline default kelas?")) {
      try {
        const res = await fetch("/api/settings/course-deadlines/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_deadlines: {} })
        });
        const data = await res.json();
        if (data.success) {
          currentClassSettings.course_deadlines = {};
          renderCourseDeadlinesTable();
          updateCourseDeadlinePill();
          updateWaPreview();
          showToast("Semua deadline matkul di-reset ke default kelas.");
        }
      } catch (e) {
        showToast(`Error: ${e.message}`);
      }
    }
  };
}

// ── Start Application ──────────────────────────────────────────────────────
init();
