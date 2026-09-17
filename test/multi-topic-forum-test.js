import { TugasKuCoreEngine } from '../src/lib/core-engine.js';
import { FORUM_STATUS } from '../src/lib/status-rules.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    passed++;
  }
}

async function runMultiTopicTest() {
  console.log("=== MULTI-TOPIC FORUM SCANNING TEST ===\n");

  const mockCourseDetail = {
    kode_course: '20261-05TPLE003-22TIF0283',
    coursename: '[3] PEMROGRAMAN WEB I # 05TPLE003 (Sabtu) [E-2]',
    peserta: [
      { nim: '241011401354', nama_mahasiswa: 'ATTHORIQ RHEVAL FAHLEVI' },
      { nim: '241011409999', nama_mahasiswa: 'STUDENT B' },
      { nim: '241011408888', nama_mahasiswa: 'STUDENT C' }
    ],
    data: [
      {
        kode_section: 'PERTEMUAN_1',
        sub_section: [
          {
            id: 'sub-forum-1',
            tipe: 'FORUM',
            kode_template: 'FORUM_DISKUSI',
            judul: 'Forum Diskusi - Pertemuan 1'
          }
        ]
      }
    ]
  };

  const mockForumTopics = {
    topics: [
      { id: 'topic-rangkuman-1', post_type: 'TOPIC', judul: 'Rangkuman 1' },
      { id: 'topic-diskusi-1', post_type: 'TOPIC', judul: 'Diskusi 1' }
    ]
  };

  const mockRepliesRangkuman = {
    data: [
      { id: 'r1', nim: '241011401354', post_type: 'REPLY' }, // Atthoriq 1x
      { id: 'r2', nim: '241011408888', post_type: 'REPLY' }  // Student C 1x
    ]
  };

  const mockRepliesDiskusi = {
    data: [
      { id: 'r3', nim: '241011401354', post_type: 'REPLY' }, // Atthoriq 1x
      { id: 'r4', nim: '241011401354', post_type: 'REPLY' }, // Atthoriq 2x -> total 3x
      { id: 'r5', nim: '241011409999', post_type: 'REPLY' }, // Student B 1x
      { id: 'r6', nim: '241011409999', post_type: 'REPLY' }  // Student B 2x -> total 2x
    ]
  };

  const mockClient = {
    getUserCourseDetail: async () => mockCourseDetail,
    getQuizPeserta: async () => ({ data: [] }),
    getAssignment: async () => ({ data: [] }),
    getForumTopics: async (forumId) => {
      if (forumId === 'sub-forum-1') return mockForumTopics;
      return { topics: [] };
    },
    getForumReply: async (topicId) => {
      if (topicId === 'topic-rangkuman-1') return mockRepliesRangkuman;
      if (topicId === 'topic-diskusi-1') return mockRepliesDiskusi;
      return { data: [] };
    }
  };

  const engine = new TugasKuCoreEngine({ mentariClient: mockClient });
  const report = await engine.generatePertemuanReport({
    kodeCourse: '20261-05TPLE003-22TIF0283',
    kodeSection: 'PERTEMUAN_1'
  });

  const atthoriq = report.mahasiswa_detail.find(m => m.nim === '241011401354');
  const studentB = report.mahasiswa_detail.find(m => m.nim === '241011409999');
  const studentC = report.mahasiswa_detail.find(m => m.nim === '241011408888');

  assert(atthoriq.forum_reply_count === 3, `ATTHORIQ harus punya 3 reply (terdeteksi: ${atthoriq.forum_reply_count})`);
  assert(atthoriq.forum_status === FORUM_STATUS.MEMENUHI, `ATTHORIQ forum status harus MEMENUHI (terdeteksi: ${atthoriq.forum_status})`);
  assert(atthoriq.has_unanswered_topic === false, `ATTHORIQ harus mengisi semua topik (terdeteksi: ${atthoriq.has_unanswered_topic})`);
  assert(atthoriq.forum_topic_status === 'LENGKAP', `ATTHORIQ forum topic status harus LENGKAP (terdeteksi: ${atthoriq.forum_topic_status})`);

  assert(studentB.forum_reply_count === 2, `Student B harus punya 2 reply (terdeteksi: ${studentB.forum_reply_count})`);
  assert(studentB.forum_status === FORUM_STATUS.MEMENUHI, `Student B forum status harus MEMENUHI (terdeteksi: ${studentB.forum_status})`);
  assert(studentB.has_unanswered_topic === true, `Student B harus terdeteksi ada topik kosong (terdeteksi: ${studentB.has_unanswered_topic})`);
  assert(studentB.forum_topic_status === 'PERLU_JAWAB_TOPIK_LAIN', `Student B topic status harus PERLU_JAWAB_TOPIK_LAIN (terdeteksi: ${studentB.forum_topic_status})`);
  assert(studentB.missing_topics?.length === 1, `Student B harus punya 1 missing topic`);

  assert(studentC.forum_reply_count === 1, `Student C harus punya 1 reply (terdeteksi: ${studentC.forum_reply_count})`);
  assert(studentC.forum_status === FORUM_STATUS.BELUM_MEMENUHI, `Student C forum status harus BELUM_MEMENUHI (terdeteksi: ${studentC.forum_status})`);
  assert(studentC.has_unanswered_topic === true, `Student C harus terdeteksi ada topik kosong`);

  assert(report.aktivitas.forum.has_multiple_topics === true, `Report harus menandai has_multiple_topics === true`);
  assert(report.aktivitas.forum.topics?.length === 2, `Report harus menyertakan 2 topik`);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runMultiTopicTest();
