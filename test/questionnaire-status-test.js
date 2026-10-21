import assert from "assert";
import { findQuestionnaireActivity } from "../src/lib/course-parser.js";
import { TugasKuCoreEngine } from "../src/lib/core-engine.js";

console.log("Starting Questionnaire Status Tests...");

// Test 1: Parser should find questionnaire with null ID in sub_section
const mockMeetingWithQues = {
  kode_section: "PERTEMUAN_1",
  sub_section: [
    {
      id: "quiz-123",
      tipe: "QUIZ",
      kode_template: "POST_TEST"
    },
    {
      id: null,
      tipe: "QUESIONER",
      kode_template: "KUESIONER",
      completion: true,
      judul: "Kuesioner Pembelajaran"
    }
  ]
};

const quesActivity = findQuestionnaireActivity(mockMeetingWithQues);
assert(quesActivity !== null, "Kuesioner harus ditemukan meskipun ID null");
assert.strictEqual(quesActivity.tipe, "QUESIONER");
assert.strictEqual(quesActivity.completion, true);

// Test 2: Parser should return null when meeting has no questionnaire
const mockMeetingWithoutQues = {
  kode_section: "PERTEMUAN_2",
  sub_section: [
    {
      id: "quiz-123",
      tipe: "QUIZ",
      kode_template: "POST_TEST"
    }
  ]
};

assert.strictEqual(findQuestionnaireActivity(mockMeetingWithoutQues), null, "Harus null jika tidak ada kuesioner");

// Test 3: CoreEngine report generation with questionnaire completed
const mockMentariClient = {
  getUserCourseDetail: async () => ({
    kode_course: "TEST101",
    coursename: "Algoritma & Pemrograman",
    peserta: [
      { nim: "221011400001", nama_mahasiswa: "Mahasiswa A" }
    ],
    data: [
      mockMeetingWithQues
    ]
  }),
  getQuizPeserta: async () => ({ data: [] })
};

const engine = new TugasKuCoreEngine({ mentariClient: mockMentariClient });
const report = await engine.generatePertemuanReport({
  kodeCourse: "TEST101",
  kodeSection: "PERTEMUAN_1"
});

assert.strictEqual(report.aktivitas.questionnaire.available, true);
assert.strictEqual(report.aktivitas.questionnaire.is_done, true);
assert.strictEqual(report.mahasiswa_detail[0].questionnaire_status, "SUDAH_MENGISI");

console.log("All Questionnaire Status Tests Passed!");
