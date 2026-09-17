import assert from 'node:assert';
import { TugasKuCoreEngine } from '../src/lib/core-engine.js';
import { ASSIGNMENT_STATUS } from '../src/lib/status-rules.js';

console.log('Testing Assignment Privacy in Core Engine...');

const mockStudents = [
  { nim: '241011401354', nama_mahasiswa: 'ATTHORIQ RHEVAL FAHLEVI' },
  { nim: '241011401614', nama_mahasiswa: 'FAHRI SAPUTRA' },
  { nim: '241011409999', nama_mahasiswa: 'MAHASISWA LAIN' }
];

const mockCourseDetail = {
  kode_course: '20261-05TPLE003-22TIF0272',
  coursename: 'TEKNIK RISET OPERASIONAL',
  peserta: mockStudents,
  data: [
    {
      kode_section: 'PERTEMUAN_1',
      sub_section: [
        {
          id: 'asg-tro-1',
          tipe: 'ASSIGNMENT',
          kode_template: 'PENUGASAN_TERSTRUKTUR',
          judul: 'Penugasan Terstruktur Pertemuan 1'
        }
      ]
    }
  ]
};

// MENTARI hanya mengembalikan 1 submission milik user yang login (Atthoriq)
const mockMentariClient = {
  getUserCourseDetail: async () => mockCourseDetail,
  getQuizPeserta: async () => ({ data: [] }),
  getForumTopics: async () => ({ topics: [] }),
  getAssignment: async (id) => ({
    judul: 'Penugasan Terstruktur Pertemuan 1',
    data: [
      {
        nim: '241011401354',
        assignment: {
          id: 'sub-1',
          files: ['tugas.pdf']
        }
      }
    ]
  })
};

const engine = new TugasKuCoreEngine({ mentariClient: mockMentariClient });
const report = await engine.generatePertemuanReport({
  kodeCourse: '20261-05TPLE003-22TIF0272',
  kodeSection: 'PERTEMUAN_1'
});

console.log('1. Checking is_private flag...');
assert.strictEqual(report.aktivitas.assignment.is_private, true, 'is_private must be true');

console.log('2. Checking Atthoriq status (logged in user)...');
const atthoriq = report.mahasiswa_detail.find(m => m.nim === '241011401354');
assert.strictEqual(atthoriq.assignment_status, ASSIGNMENT_STATUS.SUDAH_MENGUMPULKAN, 'Atthoriq status must be SUDAH_MENGUMPULKAN');

console.log('3. Checking Fahri Saputra status (other student)...');
const fahri = report.mahasiswa_detail.find(m => m.nim === '241011401614');
assert.strictEqual(fahri.assignment_status, ASSIGNMENT_STATUS.PRIVAT_MENTARI, 'Fahri status must be PRIVAT_MENTARI (not falsely accused of BELUM_MENGUMPULKAN)');

console.log('4. Checking status_per_mahasiswa map...');
assert.strictEqual(report.aktivitas.assignment.status_per_mahasiswa['241011401614'], ASSIGNMENT_STATUS.PRIVAT_MENTARI);

console.log('All Assignment Privacy tests PASSED successfully! ✅');
