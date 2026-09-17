import { MentariClient } from "./mentari-client.js";
import { TugasKuCoreEngine } from "./core-engine.js";
import { ReminderEngine } from "./reminder-engine.js";
import { WhatsAppMessageRouter } from "./whatsapp-message-router.js";
import { MockWhatsAppAdapter } from "./adapters/mock-whatsapp-adapter.js";
import { PlaywrightWhatsAppAdapter } from "./adapters/playwright-whatsapp-adapter.js";

// Offline Mentari Client matching MENTARI API response schema
class OfflineMentariClient {
  constructor() {
    this.sampleStudents = [
      { nim: "241011401783", nama_mahasiswa: "AHMAD ZACKY ALAMSYAH", alamat_email: "ahmad@example.com", no_hp_mahasiswa: "-" },
      { nim: "241011403166", nama_mahasiswa: "ALFRED RAHMAT SENTOSA HAREFA", alamat_email: "alfred@example.com", no_hp_mahasiswa: "-" },
      { nim: "241011400196", nama_mahasiswa: "ARYA ARESKA RAUZIAN", alamat_email: "arya@example.com", no_hp_mahasiswa: "-" },
      { nim: "241011400202", nama_mahasiswa: "ARYO MAESO AJI", alamat_email: "aryo@example.com", no_hp_mahasiswa: "-" },
      { nim: "241011401354", nama_mahasiswa: "ATTHORIQ RHEVAL FAHLEVI", alamat_email: "atthoriq@example.com", no_hp_mahasiswa: "-" },
      { nim: "241011400872", nama_mahasiswa: "DENISE FEBRY SETIAWAN", alamat_email: "denise@example.com", no_hp_mahasiswa: "-" }
    ];
  }

  async getUserCourseDetail(kodeCourse) {
    const courseId = kodeCourse || "20252-04TPLE003-22TIF0213";
    return {
      kode_course: courseId,
      coursename: "[3] METODE NUMERIK # 04TPLE003 (Sabtu) [E-2]",
      peserta: this.sampleStudents,
      data: [
        {
          kode_section: "PERTEMUAN_1",
          sort: 1,
          nama_section: "Pertemuan 1",
          sub_section: [
            { id: "mock-quiz-p1", tipe: "QUIZ", kode_template: "POST_TEST" },
            { id: "mock-forum-p1", tipe: "FORUM", kode_template: "FORUM_DISKUSI" }
          ]
        },
        {
          kode_section: "PERTEMUAN_4",
          sort: 4,
          nama_section: "Pertemuan 4",
          sub_section: [
            { id: "mock-quiz-p4", tipe: "QUIZ", kode_template: "POST_TEST" },
            { id: "mock-forum-p4", tipe: "FORUM", kode_template: "FORUM_DISKUSI" }
          ]
        }
      ]
    };
  }

  async getQuizPeserta(quizId) {
    return {
      data: [
        { nim: "241011401783", quiz: true },  // Sudah
        { nim: "241011403166", quiz: true },  // Sudah
        { nim: "241011400196", quiz: false }, // Belum
        { nim: "241011400202", quiz: false }, // Belum
        { nim: "241011401354", quiz: true },  // Sudah
        { nim: "241011400872", quiz: false }  // Belum
      ]
    };
  }

  async getForumTopics(forumActivityId) {
    return {
      topics: [
        { id: "mock-topic-1", post_type: "TOPIC", title: "Topik Diskusi Pertemuan" }
      ]
    };
  }

  async getForumReply(forumTopicId) {
    return {
      data: [
        { nim: "241011401783", post_type: "REPLY" },
        { nim: "241011401783", post_type: "REPLY" }, // 2x -> MEMENUHI
        { nim: "241011403166", post_type: "REPLY" }, // 1x -> BELUM_MEMENUHI
        { nim: "241011400196", post_type: "REPLY" },
        { nim: "241011400196", post_type: "REPLY" }, // 2x -> MEMENUHI
        { nim: "241011401354", post_type: "REPLY" },
        { nim: "241011401354", post_type: "REPLY" }  // 2x -> MEMENUHI
        // 241011400202 & 241011400872: 0x -> BELUM_MENGERJAKAN
      ]
    };
  }
}

export class TugasKuPipelineOrchestrator {
  constructor({
    mentariToken = process.env.MENTARI_TOKEN,
    mentariCookie = process.env.MENTARI_COOKIE,
    mentariBaseUrl = process.env.MENTARI_BASE_URL,
    forceOffline = false,
    groupsConfigPath = null,
    studentsConfigPath = null
  } = {}) {
    this.forceOffline = forceOffline;
    this.isOfflineMode = forceOffline || !mentariToken;

    if (this.isOfflineMode) {
      this.mentariClient = new OfflineMentariClient();
    } else {
      this.mentariClient = new MentariClient({
        token: mentariToken,
        cookie: mentariCookie,
        baseUrl: mentariBaseUrl
      });
    }

    this.coreEngine = new TugasKuCoreEngine({ mentariClient: this.mentariClient });
    this.reminderEngine = new ReminderEngine();
    this.router = new WhatsAppMessageRouter(groupsConfigPath, studentsConfigPath);
  }

  /**
   * Execute full pipeline for a single course meeting
   */
  async processCourseMeeting({
    kodeCourse = "20252-04TPLE003-22TIF0213",
    kodeSection = "PERTEMUAN_1",
    week = 1,
    meetingNumber = null,
    mode = "preview" // "preview" | "dry-run" | "live"
  } = {}) {
    const meetingNum = meetingNumber || parseInt(kodeSection.replace(/\D+/g, ""), 10) || 1;

    const result = {
      timestamp: new Date().toISOString(),
      mode,
      dataSource: this.isOfflineMode ? "OFFLINE_MOCK" : "LIVE_MENTARI",
      kodeCourse,
      kodeSection,
      week,
      meeting: meetingNum,
      report: null,
      candidates: [],
      routedMessage: null,
      deliveryStatus: null
    };

    // Step 1: Scan & Analisis via Core Engine
    const report = await this.coreEngine.generatePertemuanReport({
      kodeCourse,
      kodeSection
    });
    result.report = report;

    // Step 2: Deteksi Mahasiswa Belum Mengerjakan (Posttest & Forum)
    const candidates = this.reminderEngine.getReminderCandidates(report.mahasiswa_detail);
    result.candidates = candidates;

    // Step 3: Route & Format Pesan WhatsApp
    const courseName = report.mata_kuliah || kodeCourse;
    const reminderPayload = {
      course_id: kodeCourse,
      course_name: courseName,
      week,
      meeting: meetingNum,
      candidates
    };

    const routed = this.router.routeReminder(reminderPayload);
    result.routedMessage = routed;

    // Step 4: Dispatch ke WhatsApp Adapter sesuai mode
    if (mode === "preview") {
      result.deliveryStatus = {
        sent: false,
        method: "PREVIEW_ONLY",
        info: "Pesan diformat tetapi tidak dikirim."
      };
      return result;
    }

    let adapter;
    if (mode === "dry-run") {
      adapter = new MockWhatsAppAdapter();
    } else if (mode === "live") {
      adapter = new PlaywrightWhatsAppAdapter();
    } else {
      throw new Error(`Mode tidak valid: ${mode}. Gunakan 'preview', 'dry-run', atau 'live'.`);
    }

    try {
      await adapter.connect();

      if (!routed.group_id) {
        result.deliveryStatus = {
          sent: false,
          method: mode.toUpperCase(),
          warning: "Target Group ID WhatsApp belum dikonfigurasi di config/whatsapp-groups.json (Safety Mode)."
        };
      } else {
        const sendRes = await adapter.sendMessageWithMentions(
          routed.group_id,
          routed.message,
          routed.mentions
        );
        result.deliveryStatus = {
          sent: true,
          method: mode.toUpperCase(),
          sendResult: sendRes
        };
      }
    } finally {
      if (adapter.isConnected()) {
        await adapter.disconnect();
      }
    }

    return result;
  }
}

export default TugasKuPipelineOrchestrator;
