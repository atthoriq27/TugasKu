import { TugasKuCoreEngine } from '../src/lib/core-engine.js';

// Simulated Mentari Client untuk testing
class MockMentariClient {
  constructor(courseData, quizData, forumTopicsData, forumRepliesData) {
    this.courseData = courseData;
    this.quizData = quizData;
    this.forumTopicsData = forumTopicsData;
    this.forumRepliesData = forumRepliesData;
  }

  async getUserCourseDetail(kodeCourse) {
    return this.courseData;
  }

  async getQuizPeserta(quizId) {
    return this.quizData;
  }

  async getForumTopics(forumActivityId) {
    return this.forumTopicsData;
  }

  async getForumReply(forumTopicId) {
    return this.forumRepliesData;
  }
}

// Test data dari JSON evidence
const courseDetailEvidence = {
  kode_course: "20252-04TPLE003-22TIF0213",
  coursename: "[3] METODE NUMERIK # 04TPLE003 (Sabtu) [E-2]",
  peserta: [
    { nim: "241011401783", nama_mahasiswa: "AHMAD ZACKY ALAMSYAH", alamat_email: "a***6@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403166", nama_mahasiswa: "ALFRED RAHMAT SENTOSA HAREFA", alamat_email: "a****2@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400196", nama_mahasiswa: "ARYA ARESKA RAUZIAN", alamat_email: "a*****3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400202", nama_mahasiswa: "ARYO MAESO AJI", alamat_email: "a*****3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011401354", nama_mahasiswa: "ATTHORIQ RHEVAL FAHLEVI", alamat_email: "a*********7@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400872", nama_mahasiswa: "DENISE FEBRY SETIAWAN", alamat_email: "d*****5@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402218", nama_mahasiswa: "DESTIN FARISA SAMAKATUL MUSRIKAH", alamat_email: "d******a@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011401614", nama_mahasiswa: "FAHRI SAPUTRA", alamat_email: "f*****3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402102", nama_mahasiswa: "GILANG TRI SATRIA KURNIAWAN", alamat_email: "g*****4@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011401970", nama_mahasiswa: "GIWANG KATON SISWO PANGUDI", alamat_email: "g*****2@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402523", nama_mahasiswa: "HANGGA ADIT RHAMDANI", alamat_email: "h***1@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400221", nama_mahasiswa: "JOS VIKEN DARMASAH GUNAWAN", alamat_email: "j*****1@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403133", nama_mahasiswa: "KAYLA OLIVIA RAHMA KALESARAN", alamat_email: "K***A@G****.COM", no_hp_mahasiswa: "-" },
    { nim: "241011402956", nama_mahasiswa: "M. HAFIDZ AWALUDIN", alamat_email: "h*****9@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403160", nama_mahasiswa: "MOHAMAD ZAMANI PRASETYO", alamat_email: "a*****1@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400212", nama_mahasiswa: "MUHAMAD RIDWAN", alamat_email: "m*****5@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400191", nama_mahasiswa: "MUHAMAD RIZQY", alamat_email: "r*****6@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011401589", nama_mahasiswa: "MUHAMMAD QOWIY", alamat_email: "m*****3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011401350", nama_mahasiswa: "MUHAMMAD RIZKI ADI NUGRAHA", alamat_email: "r*****3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402550", nama_mahasiswa: "NUR ANISA FITRI", alamat_email: "i*****5@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402039", nama_mahasiswa: "NURUL IMAM", alamat_email: "i*****6@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400163", nama_mahasiswa: "NUZULULHAZ KHOFIFAH", alamat_email: "n*****i@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402111", nama_mahasiswa: "RAMBAYU RIMBAJATI", alamat_email: "r***3@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403168", nama_mahasiswa: "REFLY REZEKI ANGGARA SAGALA", alamat_email: "r*****6@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400166", nama_mahasiswa: "RIAN MAULANA", alamat_email: "m*****4@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403153", nama_mahasiswa: "RIZAL ARNANDA", alamat_email: "r*****1@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400408", nama_mahasiswa: "ROBBY FATKHUROZI", alamat_email: "e***i@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400164", nama_mahasiswa: "RONI SETYAWAN", alamat_email: "s*****2@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011402922", nama_mahasiswa: "SALSA AULIA KHOIRUNISA", alamat_email: "s*****0@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403080", nama_mahasiswa: "SAUSAN RIHHAADATUL 'AISY", alamat_email: "s*****9@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400188", nama_mahasiswa: "SEPTA ANUGRAH PERKASA", alamat_email: "s****t@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403141", nama_mahasiswa: "STANIS LAUS ABIES PARERA", alamat_email: "s*****a@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011403126", nama_mahasiswa: "TRI LAKSONO", alamat_email: "t*****2@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400220", nama_mahasiswa: "ZAIN FADHLURROMAN", alamat_email: "j*****0@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400234", nama_mahasiswa: "ZAKI AZIZ PRATAMA", alamat_email: "p*****9@g****.com", no_hp_mahasiswa: "-" },
    { nim: "241011400189", nama_mahasiswa: "ZIAN ALFAREL", alamat_email: "z*****l@g****.com", no_hp_mahasiswa: "-" }
  ],
  data: [
    {
      kode_section: "PERTEMUAN_1",
      sort: 2,
      nama_section: "Pertemuan 1",
      sub_section: [
        { id: "515bf34e-2508-4552-84d4-fe01fd58336b", tipe: "QUIZ", kode_template: "PRE_TEST" },
        { id: "cfd9e017-1bf6-4211-aa94-b1ec208bf40d", tipe: "LINK", kode_template: "BUKU_ISBN" },
        { id: "aad0ea42-a88e-419e-b9d3-310e7c9cf42d", tipe: "RESOURCE", kode_template: "POWER_POINT" },
        { id: "0bc62b2e-69a1-4c8c-868d-4d38b22f1e4d", tipe: "QUIZ", kode_template: "POST_TEST" },
        { id: "e3be1621-5c43-47df-bafc-08829b671d72", tipe: "FORUM", kode_template: "FORUM_DISKUSI" }
      ]
    }
  ]
};

// Mock quiz peserta response (Pertemuan 1) - 30 sudah, 6 belum
const quizPesertaResponsePertemuan1 = {
  data: [
    { nim: "241011401783", quiz: true },
    { nim: "241011403166", quiz: true },
    { nim: "241011400196", quiz: true },
    { nim: "241011400202", quiz: true },
    { nim: "241011401354", quiz: true },
    { nim: "241011400872", quiz: true },
    { nim: "241011402218", quiz: true },
    { nim: "241011401614", quiz: true },
    { nim: "241011402102", quiz: true },
    { nim: "241011401970", quiz: true },
    { nim: "241011402523", quiz: true },
    { nim: "241011400221", quiz: true },
    { nim: "241011403133", quiz: true },
    { nim: "241011402956", quiz: true },
    { nim: "241011403160", quiz: true },
    { nim: "241011400212", quiz: true },
    { nim: "241011400191", quiz: true },
    { nim: "241011401589", quiz: true },
    { nim: "241011401350", quiz: true },
    { nim: "241011402550", quiz: true },
    { nim: "241011402039", quiz: true },
    { nim: "241011400163", quiz: true },
    { nim: "241011402111", quiz: true },
    { nim: "241011403168", quiz: true },
    { nim: "241011400166", quiz: true },
    { nim: "241011403153", quiz: true },
    { nim: "241011400408", quiz: true },
    { nim: "241011400164", quiz: true },
    { nim: "241011402922", quiz: true },
    { nim: "241011403080", quiz: true },
    { nim: "241011400188", quiz: false },
    { nim: "241011403141", quiz: false },
    { nim: "241011403126", quiz: false },
    { nim: "241011400220", quiz: false },
    { nim: "241011400234", quiz: false },
    { nim: "241011400189", quiz: false }
  ]
};

// Mock forum topics response - struktur sesuai API
const forumTopicsResponsePertemuan1 = {
  topics: [
    { id: "forum-topic-p1", post_type: "TOPIC", title: "Topik Pertemuan 1" }
  ]
};

// Mock forum replies - semua 30 peserta quiz + 6 tidak = 30 dengan >=2 reply, 6 dengan 0 reply
const forumRepliesResponsePertemuan1 = {
  data: [
    { nim: "241011401783", post_type: "REPLY" },
    { nim: "241011401783", post_type: "REPLY" },
    { nim: "241011403166", post_type: "REPLY" },
    { nim: "241011403166", post_type: "REPLY" },
    { nim: "241011400196", post_type: "REPLY" },
    { nim: "241011400196", post_type: "REPLY" },
    { nim: "241011400202", post_type: "REPLY" },
    { nim: "241011400202", post_type: "REPLY" },
    { nim: "241011401354", post_type: "REPLY" },
    { nim: "241011401354", post_type: "REPLY" },
    { nim: "241011400872", post_type: "REPLY" },
    { nim: "241011400872", post_type: "REPLY" },
    { nim: "241011402218", post_type: "REPLY" },
    { nim: "241011402218", post_type: "REPLY" },
    { nim: "241011401614", post_type: "REPLY" },
    { nim: "241011401614", post_type: "REPLY" },
    { nim: "241011402102", post_type: "REPLY" },
    { nim: "241011402102", post_type: "REPLY" },
    { nim: "241011401970", post_type: "REPLY" },
    { nim: "241011401970", post_type: "REPLY" },
    { nim: "241011402523", post_type: "REPLY" },
    { nim: "241011402523", post_type: "REPLY" },
    { nim: "241011400221", post_type: "REPLY" },
    { nim: "241011400221", post_type: "REPLY" },
    { nim: "241011403133", post_type: "REPLY" },
    { nim: "241011403133", post_type: "REPLY" },
    { nim: "241011402956", post_type: "REPLY" },
    { nim: "241011402956", post_type: "REPLY" },
    { nim: "241011403160", post_type: "REPLY" },
    { nim: "241011403160", post_type: "REPLY" },
    { nim: "241011400212", post_type: "REPLY" },
    { nim: "241011400212", post_type: "REPLY" },
    { nim: "241011400191", post_type: "REPLY" },
    { nim: "241011400191", post_type: "REPLY" },
    { nim: "241011401589", post_type: "REPLY" },
    { nim: "241011401589", post_type: "REPLY" },
    { nim: "241011401350", post_type: "REPLY" },
    { nim: "241011401350", post_type: "REPLY" },
    { nim: "241011402550", post_type: "REPLY" },
    { nim: "241011402550", post_type: "REPLY" },
    { nim: "241011402039", post_type: "REPLY" },
    { nim: "241011402039", post_type: "REPLY" },
    { nim: "241011400163", post_type: "REPLY" },
    { nim: "241011400163", post_type: "REPLY" },
    { nim: "241011402111", post_type: "REPLY" },
    { nim: "241011402111", post_type: "REPLY" },
    { nim: "241011403168", post_type: "REPLY" },
    { nim: "241011403168", post_type: "REPLY" },
    { nim: "241011400166", post_type: "REPLY" },
    { nim: "241011400166", post_type: "REPLY" },
    { nim: "241011403153", post_type: "REPLY" },
    { nim: "241011403153", post_type: "REPLY" },
    { nim: "241011400408", post_type: "REPLY" },
    { nim: "241011400408", post_type: "REPLY" },
    { nim: "241011400164", post_type: "REPLY" },
    { nim: "241011400164", post_type: "REPLY" },
    { nim: "241011402922", post_type: "REPLY" },
    { nim: "241011402922", post_type: "REPLY" },
    { nim: "241011403080", post_type: "REPLY" },
    { nim: "241011403080", post_type: "REPLY" }
  ]
};

export async function runRegressionTest() {
  console.log("=== REGRESSION TEST: POSTTEST + FORUM REAL DATA PIPELINE ===\n");
  
  const mockClient = new MockMentariClient(
    courseDetailEvidence,
    quizPesertaResponsePertemuan1,
    forumTopicsResponsePertemuan1,
    forumRepliesResponsePertemuan1
  );

  const engine = new TugasKuCoreEngine({ mentariClient: mockClient });

  try {
    const report = await engine.generatePertemuanReport({
      kodeCourse: "20252-04TPLE003-22TIF0213",
      kodeSection: "PERTEMUAN_1"
    });

    console.log("✓ Report generated successfully\n");
    console.log("Course Info:");
    console.log(`  Mata Kuliah: ${report.mata_kuliah}`);
    console.log(`  Kode Course: ${report.kode_course}`);
    console.log(`  Pertemuan: ${report.pertemuan}`);
    console.log(`  Total Mahasiswa: ${report.total_mahasiswa}\n`);

    console.log("Aktivitas Availability:");
    console.log(`  Posttest: ${report.aktivitas.posttest.available ? "AVAILABLE" : "NOT_AVAILABLE"}`);
    console.log(`  Forum: ${report.aktivitas.forum.available ? "AVAILABLE" : "NOT_AVAILABLE"}`);
    console.log(`  Assignment: ${report.aktivitas.assignment.available ? "AVAILABLE" : "NOT_AVAILABLE"}`);
    console.log(`  Questionnaire: ${report.aktivitas.questionnaire.available ? "AVAILABLE" : "NOT_AVAILABLE"}\n`);

    // Regression Test Baseline
    const posttestSudah = report.mahasiswa_detail.filter(m => m.posttest_status === "SUDAH_MENGERJAKAN").length;
    const posttestBelum = report.mahasiswa_detail.filter(m => m.posttest_status === "BELUM_MENGERJAKAN").length;
    const forumMemenuhi = report.mahasiswa_detail.filter(m => m.forum_status === "MEMENUHI").length;
    const forumBelumMemenuhi = report.mahasiswa_detail.filter(m => m.forum_status === "BELUM_MEMENUHI").length;
    const forumBelum = report.mahasiswa_detail.filter(m => m.forum_status === "BELUM_MENGERJAKAN").length;

    console.log("Regression Test Results:");
    console.log(`  Total Mahasiswa: ${report.total_mahasiswa} (Expected: 36)`);
    console.log(`  Sudah Posttest: ${posttestSudah} (Expected: 30)`);
    console.log(`  Belum Posttest: ${posttestBelum} (Expected: 6)`);
    console.log(`  Forum >=2 (MEMENUHI): ${forumMemenuhi} (Expected: 30)`);
    console.log(`  Forum 1x (BELUM_MEMENUHI): ${forumBelumMemenuhi} (Expected: 0)`);
    console.log(`  Forum 0x (BELUM_MENGERJAKAN): ${forumBelum} (Expected: 6)\n`);

    // Validate baseline
    const baselineValid = 
      report.total_mahasiswa === 36 &&
      posttestSudah === 30 &&
      posttestBelum === 6 &&
      forumMemenuhi === 30 &&
      forumBelumMemenuhi === 0 &&
      forumBelum === 6;

    if (baselineValid) {
      console.log("✓✓✓ REGRESSION TEST PASSED ✓✓✓\n");
    } else {
      console.log("✗✗✗ REGRESSION TEST FAILED ✗✗✗\n");
      process.exit(1);
    }

    console.log("=== Sampel Detail Mahasiswa ===\n");
    report.mahasiswa_detail.slice(0, 3).forEach(m => {
      console.log(`${m.nim} - ${m.nama_mahasiswa}`);
      console.log(`  Posttest: ${m.posttest_status}`);
      console.log(`  Forum Reply Count: ${m.forum_reply_count}`);
      console.log(`  Forum Status: ${m.forum_status}\n`);
    });

  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
}

runRegressionTest();
