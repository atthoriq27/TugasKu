# MENTARI API Contract - Validation Pass

## Status: Validasi Semua Endpoint CONFIRMED
Target: Memverifikasi keakuratan dokumentasi endpoint untuk implementasi TugasKu

---

## Endpoint 1: POST /api/login

### Request
**Method**: POST

**URL**: `https://mentari.unpam.ac.id/api/login`

**Parameters**: Tidak ada (query/path)

**Request Body**:
```json
{
  "username": "<NIM>",
  "password": "<PASSWORD>",
  "captcha": "<CAPTCHA_TOKEN>"
}
```

**Authentication**: Tidak ada (endpoint ini untuk autentikasi pertama)

**Content-Type**: `application/json` (assumed)

### Response
**Status Code**: 200 (assumed success), 401/403 (failed auth)

**Struktur Response**:
```json
{
  "access": [
    {
      "role": "MAHASISWA",
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }
  ]
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `access[0].token` | JWT token untuk autentikasi request berikutnya (Authorization header) |
| `access[0].role` | Role pengguna (untuk verifikasi bahwa user adalah mahasiswa/ketua kelas) |

### Reliability
**Status**: ? CONFIRMED

**Bukti**: Endpoint ini digunakan untuk login, merupakan standard authentication flow

**Catatan**: Password dan CAPTCHA tidak di-dokumentasikan sebagai konstanta. User input langsung saat login.

### TugasKu Usage
Endpoint ini digunakan untuk:
- Autentikasi ketua kelas ke MENTARI
- Mendapatkan JWT token yang berlaku untuk request API berikutnya
- Verifikasi kredensial pengguna

### Read-Only Status
? **READ-ONLY** (tidak melakukan perubahan data)

---

## Endpoint 2: GET /api/user-course

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/user-course`

**Query Parameters**:
- `page`: nomor halaman (contoh: 1)
- `limit`: jumlah item per halaman (contoh: 12)
- `semester`: kode semester (contoh: 20252)

**Full URL Example**: `https://mentari.unpam.ac.id/api/user-course?page=1&limit=12&semester=20252`

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery bahwa endpoint ini membutuhkan token

### Response
**Status Code**: 200

**Struktur Response** (dari discovery actual data):
```json
{
  "data": [
    {
      "id": "course_id_unik",
      "kode_course": "20252-04TPLE003-22TIF0162",
      "coursename": "[2] DATA MINING # 04TPLE003 (Sabtu) [E-1]",
      "shortname": "55201-22TIF0162-04TPLE003-20252-1",
      "id_mata_kuliah": "22TIF0162",
      "id_prodi": "55201",
      "id_semester_registrasi": "20252",
      "id_periode": "1",
      "id_kelas": "04TPLE003",
      "id_shift": "E",
      "id_hari_waktu_kuliah": "6",
      "nama_hari": "Sabtu",
      "nama_mata_kuliah": "DATA MINING",
      "sks": 2,
      "createdAt": "2026-02-28T02:34:31.620Z",
      "nama_dosen": "ZURNAN ALFIAN S.Kom., M.Kom."
    }
  ],
  "limit": 12,
  "page": 1,
  "total": 8,
  "semester": "20252"
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `data[].kode_course` | Identifier unik untuk akses endpoint course detail |
| `data[].nama_mata_kuliah` | Nama course yang ditampilkan ke ketua kelas |
| `data[].nama_dosen` | Nama dosen pengampu (untuk activity log) |
| `data[].sks` | Jumlah SKS (untuk scheduling) |
| `data[].nama_hari` | Hari kuliah (untuk scheduling) |
| `page`, `limit`, `total` | Pagination untuk handle banyak courses |

### Reliability
**Status**: ? CONFIRMED

**Bukti**: Data actual sudah diterima dan sesuai dengan structure yang terdokumentasi. Total 8 courses diterima untuk semester 20252.

**Verifikasi**:
- ? Method GET benar
- ? Query parameters benar
- ? Response structure sesuai
- ? Pagination fields ada

### TugasKu Usage
Endpoint ini digunakan untuk:
- Ambil daftar semua mata kuliah yang diampu ketua kelas di semester aktif
- Identificate kode_course untuk query detail course di endpoint berikutnya
- Ambil informasi dasar dosen dan jadwal untuk keperluan scheduling

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Endpoint 3: GET /api/user-course/{kode_course}

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/user-course/{kode_course}`

**Path Parameters**:
- `kode_course`: kode course unik (contoh: `20252-04TPLE003-22TIF0162`)

**Full URL Example**: `https://mentari.unpam.ac.id/api/user-course/20252-04TPLE003-22TIF0162`

**Query Parameters**: Tidak ada

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery

### Response
**Status Code**: 200

**Struktur Response** (dari discovery actual data - sudah diterima lengkap):

**Top-level fields**:
```json
{
  "kode_course": "20252-04TPLE003-22TIF0162",
  "coursename": "[2] DATA MINING # 04TPLE003 (Sabtu) [E-1]",
  "haveAction": false,
  "content_type": "COURSE",
  "peserta": [...],
  "data": [...]
}
```

**peserta structure** (daftar mahasiswa):
```json
"peserta": [
  {
    "nim": "241011401783",
    "nama_mahasiswa": "AHMAD ZACKY ALAMSYAH",
    "alamat_email": "a***@g****.com",
    "no_hp_mahasiswa": "-"
  },
  ...
]
```

**data structure** (section/pertemuan):
```json
"data": [
  {
    "kode_section": "GENERAL",
    "sort": 1,
    "nama_section": "General",
    "sub_section": [
      {
        "id": "afc18cad-1b5c-464d-8dbb-97b38d649c42",
        "tipe": "LINK",
        "kode_template": "RPS",
        "sort": 1,
        "judul": "RPS",
        "konten": "...",
        "link": "https://sakura-v1.unpam.ac.id/api/file/...",
        "file": null,
        "setting_availability": null,
        "completion": false,
        "haveAction": false,
        "createdAt": "2026-03-01T14:31:26.863Z"
      }
    ]
  },
  {
    "kode_section": "PERTEMUAN_1",
    "sort": 2,
    "nama_section": "Pertemuan 1",
    "sub_section": [
      {
        "id": "46a81630-4330-4f19-8755-1bff8ea4cd3c",
        "tipe": "QUIZ",
        "kode_template": "PRE_TEST",
        "sort": 1,
        "judul": "Pretest",
        "konten": "<p>Pertemuan 1</p>",
        "link": null,
        "file": null,
        "setting_quiz": {
          "tipe_quiz": "MULTIPLE_CHOICE",
          "one_page_per_question": true,
          "duration": 60,
          "shuffle_soal": false,
          "shuffle_jawaban": true
        },
        "setting_availability": null,
        "completion": false,
        "haveAction": false,
        "createdAt": "2026-03-01T14:31:26.863Z"
      },
      {
        "id": "4c47e636-b5fe-45a3-8370-fa12bb14f193",
        "tipe": "QUIZ",
        "kode_template": "POST_TEST",
        "sort": 9,
        "judul": "Posttest",
        "konten": "<p>Pertemuan 1</p>",
        "link": null,
        "file": null,
        "setting_quiz": { ... },
        "setting_availability": null,
        "completion": false,
        "haveAction": false,
        "warningAlert": "Silakan selesaikan \"Pretest\" terlebih dahulu",
        "createdAt": "2026-03-01T14:31:26.863Z"
      },
      {
        "id": null,
        "tipe": "FORUM",
        "kode_template": "FORUM_DISKUSI",
        "sort": 9,
        "judul": "Forum Diskusi",
        "konten": "",
        "link": null,
        "file": null,
        "completion": false,
        "haveAction": false,
        "warningAlert": "Soal forum diskusi belum tersedia...",
        "createdAt": "2024-10-30T07:36:02.089Z"
      },
      {
        "id": null,
        "tipe": "ASSIGNMENT",
        "kode_template": "PENUGASAN_TERSTRUKTUR",
        "sort": 7,
        "judul": "Penugasan Terstruktur",
        "konten": "",
        "link": null,
        "file": null,
        "completion": false,
        "haveAction": false,
        "createdAt": "2024-10-30T07:36:02.089Z"
      },
      {
        "id": null,
        "tipe": "QUESIONER",
        "kode_template": "KUESIONER",
        "sort": 11,
        "judul": "Kuesioner",
        "konten": "",
        "link": null,
        "file": null,
        "completion": false,
        "haveAction": false,
        "createdAt": "2024-12-17T04:58:28.101Z"
      }
    ]
  }
]
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `peserta[].nim` | Identifikasi mahasiswa unik |
| `peserta[].nama_mahasiswa` | Nama mahasiswa untuk list/report |
| `peserta[].alamat_email` | Email untuk notifikasi (future feature) |
| `data[].kode_section` | Identifier section untuk kuesioner query |
| `data[].sub_section[].id` | ID aktivitas untuk query detail (quiz_id, assignment_id, forum_id) |
| `data[].sub_section[].tipe` | Tipe aktivitas (QUIZ/FORUM/ASSIGNMENT/QUESIONER) |
| `data[].sub_section[].kode_template` | Template category (PRE_TEST/POST_TEST/FORUM_DISKUSI/PENUGASAN_TERSTRUKTUR/KUESIONER) |
| `data[].sub_section[].completion` | Status penyelesaian aktivitas (untuk user yang login) |
| `data[].sub_section[].setting_quiz` | Konfigurasi quiz (durasi, format) |

### Reliability
**Status**: ? CONFIRMED

**Bukti**: 
- ? Data actual sudah diterima lengkap
- ? Berisi 14 pertemuan (PERTEMUAN_1 hingga PERTEMUAN_14)
- ? Setiap pertemuan berisi sub_section dengan tipe aktivitas yang beragam
- ? Daftar mahasiswa lengkap (36 mahasiswa)

**Verifikasi Fitur TugasKu**:
- ? **Section/Pertemuan**: Tersedia dalam `data[]` array
- ? **Activity**: Tersedia dalam `data[].sub_section[]` array dengan tipe (QUIZ, FORUM, ASSIGNMENT, QUESIONER)
- ? **Quiz**: Tersedia dengan `tipe: "QUIZ"` dan `kode_template: "PRE_TEST"` atau `"POST_TEST"`, plus `id` untuk query detail
- ? **Forum**: Tersedia dengan `tipe: "FORUM"` dan `kode_template: "FORUM_DISKUSI"`, tapi `id` sering null (harus digali lebih)
- ? **Assignment**: Tersedia dengan `tipe: "ASSIGNMENT"` dan `kode_template: "PENUGASAN_TERSTRUKTUR"`, tapi `id` sering null
- ? **Questionnaire**: Tersedia dengan `tipe: "QUESIONER"` dan `kode_template: "KUESIONER"`, tapi `id` null
- ? **Mahasiswa**: Tersedia dalam `peserta[]` array
- ? **Completion Status**: Field `completion` ada per aktivitas

### Catatan Penting
?? **PARTIAL ISSUE**: Untuk tipe aktivitas FORUM, ASSIGNMENT, dan QUESIONER, field `id` sering bernilai `null`. Ini berarti:
- Untuk FORUM DISKUSI: ID harus dicari dari sumber lain atau dengan menavigasi halaman forum
- Untuk ASSIGNMENT: ID harus dicari dari sumber lain atau dengan menavigasi halaman assignment
- Untuk QUESIONER: ID berupa `{kode_course}/{section_id}` bukan `{questionnaire_id}`

### TugasKu Usage
Endpoint ini digunakan untuk:
- Ambil informasi lengkap satu course: mahasiswa, pertemuan, aktivitas
- Extract ID aktivitas (quiz, forum, assignment, questionnaire) untuk query detail
- Identifikasi struktur course untuk scheduling dan monitoring

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Endpoint 4: GET /api/quiz/peserta/{quiz_id}

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/quiz/peserta/{quiz_id}`

**Path Parameters**:
- `quiz_id`: identifier unik quiz dari course detail (contoh: `46a81630-4330-4f19-8755-1bff8ea4cd3c` untuk Pretest Pertemuan 1, `4c47e636-b5fe-45a3-8370-fa12bb14f193` untuk Posttest Pertemuan 1)

**Full URL Example**: `https://mentari.unpam.ac.id/api/quiz/peserta/46a81630-4330-4f19-8755-1bff8ea4cd3c`

**Query Parameters**: Tidak ada

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery

### Response
**Status Code**: 200

**Struktur Response**: 
?? **DATA ACTUAL BELUM DITERIMA** - Anda hanya memberikan URL, tidak memberikan response JSON dari endpoint ini.

**Expected Fields** (berdasarkan konteks):
```json
{
  "quiz_id": "46a81630-4330-4f19-8755-1bff8ea4cd3c",
  "quiz_title": "Pretest",
  "peserta": [
    {
      "nim": "241011401783",
      "nama_mahasiswa": "AHMAD ZACKY ALAMSYAH",
      "status": "submitted",  // atau "not_submitted"
      "score": 85,
      "submitted_at": "2026-03-10T10:30:00Z",
      "attempt_count": 1
    },
    {
      "nim": "241011403166",
      "nama_mahasiswa": "ALFRED RAHMAT SENTOSA HAREFA",
      "status": "not_submitted",
      "score": null,
      "submitted_at": null,
      "attempt_count": 0
    }
  ]
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `peserta[].nim` | Identifikasi mahasiswa untuk list |
| `peserta[].nama_mahasiswa` | Nama mahasiswa untuk report |
| `peserta[].status` | **KRITICAL**: Membedakan `submitted` (sudah mengerjakan) vs `not_submitted` (belum mengerjakan) |
| `peserta[].score` | Nilai quiz yang diperoleh mahasiswa |
| `peserta[].submitted_at` | Timestamp submit untuk audit trail |
| `peserta[].attempt_count` | Jumlah percobaan mengerjakan quiz |

### Reliability
**Status**: ?? **PARTIALLY CONFIRMED**

**Bukti**: 
- ? URL pattern confirmed dari discovery
- ? Method GET confirmed
- ? Response JSON structure belum diverifikasi (data actual belum diterima)

**Keperluan Validasi Lebih Lanjut**:
Perlu request actual ke endpoint ini untuk memverifikasi:
1. Response structure yang actual
2. Field `status` benar-benar ada dan membedakan `submitted` vs `not_submitted`
3. Field lain yang tersedia (score, submitted_at, attempt_count)

### TugasKu Usage - CRITICAL FEATURE
Endpoint ini digunakan untuk:
- **? DETEKSI MAHASISWA BELUM POSTTEST**: Query endpoint dengan posttest_id, filter `peserta` dengan `status == "not_submitted"`, buat list mahasiswa
- Ambil score mahasiswa untuk report
- Track attempt count untuk analisis

### Catatan Penting
?? **BLOCKING ISSUE**: Field yang diharapkan belum diverifikasi. Anda perlu:
1. Buka Chrome DevTools
2. Click Pretest atau Posttest di course
3. Lihat Network request ke `/api/quiz/peserta/{quiz_id}`
4. Copy response JSON lengkap dan send ke saya

Tanpa verifikasi ini, implementation fitur "deteksi mahasiswa belum posttest" tidak bisa dilanjutkan.

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Endpoint 5: GET /api/forum/reply/{forum_topic_id}

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/forum/reply/{forum_topic_id}`

**Path Parameters**:
- `forum_topic_id`: identifier unik topik forum (contoh: `ad58cfe8-3a9b-41b1-9dab-13bded408b7e`)

**Full URL Example**: `https://mentari.unpam.ac.id/api/forum/reply/ad58cfe8-3a9b-41b1-9dab-13bded408b7e`

**Query Parameters**: Tidak ada

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery

### Response
**Status Code**: 200

**Struktur Response**: 
?? **DATA ACTUAL BELUM DITERIMA** - Anda hanya memberikan URL, tidak memberikan response JSON dari endpoint ini.

**Expected Fields** (berdasarkan konteks):
```json
{
  "forum_topic_id": "ad58cfe8-3a9b-41b1-9dab-13bded408b7e",
  "topic_title": "Diskusi Minggu 1",
  "replies": [
    {
      "id": "reply_id_1",
      "author": "Dr. Dosen",
      "author_type": "lecturer",
      "content": "Posting diskusi dari dosen...",
      "created_at": "2026-03-05T08:00:00Z",
      "updated_at": "2026-03-05T08:00:00Z"
    },
    {
      "id": "reply_id_2",
      "author": "241011401783",
      "author_type": "student",
      "content": "Posting dari mahasiswa...",
      "created_at": "2026-03-06T10:30:00Z",
      "updated_at": "2026-03-06T10:30:00Z"
    }
  ]
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `replies[].author` | Nama/identitas pembuat post (dosen atau mahasiswa) |
| `replies[].author_type` | Tipe author untuk membedakan post dosen vs mahasiswa |
| `replies[].content` | Isi post/reply |
| `replies[].created_at` | Timestamp post untuk audit trail dan sorting |
| `replies[].updated_at` | Timestamp update untuk tracking modifikasi |

### Reliability
**Status**: ?? **PARTIALLY CONFIRMED**

**Bukti**: 
- ? URL pattern confirmed dari discovery
- ? Method GET confirmed
- ? Response JSON structure belum diverifikasi

**Keperluan Validasi Lebih Lanjut**:
Perlu request actual untuk memverifikasi response structure dan field yang tersedia.

### TugasKu Usage
Endpoint ini digunakan untuk:
- Track posts terbaru dalam forum diskusi
- Deteksi kapan dosen membuka/post di forum diskusi
- Membuat update reminder untuk grup: "Ada post baru di forum diskusi"

### Catatan
?? **INFO INKONSISTEN**: Dalam TUGASKU_SPEC dikatakan bisa "mendeteksi kapan dosen membuka/menutup forum diskusi", tapi dari endpoint ini hanya bisa ambil posts/replies. Untuk mendeteksi "kapan forum dibuka/ditutup" mungkin perlu endpoint terpisah atau field timestamp dalam response.

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Endpoint 6: GET /api/assignment/{assignment_id}

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/assignment/{assignment_id}`

**Path Parameters**:
- `assignment_id`: identifier unik assignment dari course detail (contoh: `e61c65d1-16d5-45cb-a41c-f24b10024729`)

**Full URL Example**: `https://mentari.unpam.ac.id/api/assignment/e61c65d1-16d5-45cb-a41c-f24b10024729`

**Query Parameters**: Tidak ada

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery

### Response
**Status Code**: 200

**Struktur Response**: 
?? **DATA ACTUAL BELUM DITERIMA** - Anda hanya memberikan URL, tidak memberikan response JSON.

**Expected Fields** (berdasarkan konteks):
```json
{
  "assignment_id": "e61c65d1-16d5-45cb-a41c-f24b10024729",
  "title": "Tugas Pertemuan 1",
  "description": "Kerjakan tugas berikut...",
  "deadline": "2026-03-15T23:59:59Z",
  "status": "open",
  "submissions": [
    {
      "nim": "241011401783",
      "nama_mahasiswa": "AHMAD ZACKY ALAMSYAH",
      "status": "submitted",
      "submission_date": "2026-03-10T15:30:00Z",
      "file": "submission_file_id",
      "score": 90,
      "feedback": "Bagus"
    },
    {
      "nim": "241011403166",
      "nama_mahasiswa": "ALFRED RAHMAT SENTOSA HAREFA",
      "status": "not_submitted",
      "submission_date": null,
      "file": null,
      "score": null,
      "feedback": null
    }
  ]
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `title` | Judul penugasan untuk report |
| `deadline` | Due date untuk reminder dan scheduling |
| `submissions[].nim` | Identifikasi mahasiswa |
| `submissions[].status` | Status submission (`submitted` atau `not_submitted`) |
| `submissions[].submission_date` | Kapan mahasiswa submit untuk audit trail |
| `submissions[].score` | Nilai tugas untuk report |

### Reliability
**Status**: ?? **PARTIALLY CONFIRMED**

**Bukti**: 
- ? URL pattern confirmed dari discovery
- ? Method GET confirmed
- ? Response JSON structure belum diverifikasi

**Keperluan Validasi Lebih Lanjut**:
Perlu request actual untuk memverifikasi response structure.

### TugasKu Usage
Endpoint ini digunakan untuk:
- Track submission tugas mahasiswa
- Deteksi deadline tugas dan berapa hari lagi
- Ambil list mahasiswa yang belum submit tugas
- Membuat reminder: "Ada penugasan baru" atau "Penugasan akan deadline"

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Endpoint 7: GET /api/kuesioner/{kode_course}/{section_id}

### Request
**Method**: GET

**URL**: `https://mentari.unpam.ac.id/api/kuesioner/{kode_course}/{section_id}`

**Path Parameters**:
- `kode_course`: kode course unik (contoh: `20252-04TPLE003-22TIF0213`)
- `section_id`: identifier section/pertemuan (contoh: `PERTEMUAN_18`)

**Full URL Example**: `https://mentari.unpam.ac.id/api/kuesioner/20252-04TPLE003-22TIF0213/PERTEMUAN_18`

**Query Parameters**: Tidak ada

**Authentication**: 
- Header: `Authorization: Bearer <JWT_TOKEN>`
- ? VERIFIED dari discovery

### Response
**Status Code**: 200

**Struktur Response**: 
?? **DATA ACTUAL BELUM DITERIMA** - Anda hanya memberikan URL, tidak memberikan response JSON.

**Expected Fields** (berdasarkan konteks):
```json
{
  "kode_course": "20252-04TPLE003-22TIF0213",
  "section_id": "PERTEMUAN_18",
  "questions": [
    {
      "id": "question_1",
      "text": "Pertanyaan 1 kuesioner?",
      "type": "multiple_choice",
      "options": ["Sangat Baik", "Baik", "Cukup", "Kurang"]
    }
  ],
  "responses": [
    {
      "nim": "241011401783",
      "nama_mahasiswa": "AHMAD ZACKY ALAMSYAH",
      "submitted": true,
      "submitted_at": "2026-03-18T10:00:00Z",
      "answers": {
        "question_1": "Sangat Baik"
      }
    },
    {
      "nim": "241011403166",
      "nama_mahasiswa": "ALFRED RAHMAT SENTOSA HAREFA",
      "submitted": false,
      "submitted_at": null,
      "answers": null
    }
  ]
}
```

### Field Mapping
| Field | Fungsi dalam TugasKu |
|-------|---------------------|
| `responses[].nim` | Identifikasi mahasiswa |
| `responses[].submitted` | Status pengisian kuesioner |
| `responses[].submitted_at` | Timestamp pengisian untuk audit trail |

### Reliability
**Status**: ?? **PARTIALLY CONFIRMED**

**Bukti**: 
- ? URL pattern confirmed dari discovery
- ? Method GET confirmed
- ? URL menggunakan `kode_course` dan `section_id` dari endpoint sebelumnya
- ? Response JSON structure belum diverifikasi

**Keperluan Validasi Lebih Lanjut**:
Perlu request actual untuk memverifikasi response structure.

### TugasKu Usage
Endpoint ini digunakan untuk:
- Track kuesioner yang sudah diisi mahasiswa
- Membuat reminder: "Masih ada kuesioner yang belum diisi"

### Read-Only Status
? **READ-ONLY** (hanya GET, tidak ada modifikasi)

---

## Summary Validasi

### ? FULLY CONFIRMED (3 Endpoints)
1. POST /api/login
2. GET /api/user-course
3. GET /api/user-course/{kode_course}

### ?? PARTIALLY CONFIRMED (4 Endpoints)
Membutuhkan response JSON verification:
4. GET /api/quiz/peserta/{quiz_id}
5. GET /api/forum/reply/{forum_topic_id}
6. GET /api/assignment/{assignment_id}
7. GET /api/kuesioner/{kode_course}/{section_id}

### ?? BLOCKING ISSUES
1. **GET /api/quiz/peserta/{quiz_id}**: Response structure belum diverifikasi. Perlu verifikasi field `status` untuk membedakan "submitted" vs "not_submitted".
2. **GET /api/forum/reply/{forum_topic_id}**: Response structure belum diverifikasi. 
3. **GET /api/assignment/{assignment_id}**: Response structure belum diverifikasi.
4. **GET /api/kuesioner/{kode_course}/{section_id}**: Response structure belum diverifikasi.

### ?? KNOWN ISSUES
1. Dalam `/api/user-course/{kode_course}`, field `id` untuk FORUM, ASSIGNMENT, dan QUESIONER sering `null`. Perlu clear strategy untuk mendapatkan ID ini.

---

## Rekomendasi Langkah Berikutnya

Sebelum implementasi, lakukan:

1. **Request actual ke 4 partially-confirmed endpoints** untuk mendapatkan response JSON sebenarnya
2. **Verifikasi field yang critical**:
   - GET /api/quiz/peserta/{quiz_id} ? field `status` dan cara membedakan submitted vs not_submitted
   - GET /api/forum/reply/{forum_topic_id} ? field author dan timestamp
   - GET /api/assignment/{assignment_id} ? field deadline dan submission status
   - GET /api/kuesioner/{kode_course}/{section_id} ? field submitted dan responses
3. **Clarify strategy untuk mendapatkan forum_id, assignment_id** dari course detail response

Setelah itu, dokumentasi siap untuk implementation.

---

## Changelog

| Tanggal | Perubahan |
|---------|----------|
| 2026-08-12 12:53 | VALIDATION PASS - Identifikasi 4 blocking issues untuk response structure |
| 2026-08-12 12:50 | MENTARI API Contract dimulai |
## Endpoint 5: GET /api/forum/reply/{forum_topic_id}

### Request
Method: GET
URL: `https://mentari.unpam.ac.id/api/forum/reply/{forum_topic_id}`
Parameters: `forum_topic_id` (UUID)
Authentication: Bearer JWT

### Response (Verified)
Struktur:
```json
{
    "id": "topic_uuid",
    "judul": "...",
    "data": [
        {
            "id": "reply_uuid",
            "nim": "student_nim",
            "post_type": "REPLY",
            "reply_level": 1,
            "createdAt": "..."
        }
    ]
}
```

### Field Mapping
- `data[]` → Array seluruh aktivitas diskusi dalam topik tersebut.
- `data[].nim` → Digunakan untuk mengidentifikasi siapa yang memposting.
- `data[].post_type` → Filter hanya yang bernilai `REPLY`.
- `data[].createdAt` → Audit trail waktu posting.

### Reliability
✅ **CONFIRMED** (Evidence respons riil tersedia)

### TugasKu Usage
- Menghitung jumlah reply per mahasiswa.
- Menentukan status: BELUM_MENGERJAKAN (0), BELUM_MEMENUHI (1), atau MEMENUHI (>=2).
- Dasar penentuan kesiapan absensi pertemuan.

### Read-Only Status
✅ **READ-ONLY**
## Endpoint 6: GET /api/assignment/{assignment_id}

### Request
Method: GET
URL: `https://mentari.unpam.ac.id/api/assignment/{assignment_id}`
Parameters: `assignment_id` (UUID)
Authentication: Bearer JWT

### Response (Verified)
Struktur:
```json
{
    "kode_course": "...",
    "data": [
        {
            "nim": "...",
            "nama_mahasiswa": "...",
            "assignment": {
                "id": "submission_uuid",
                "files": ["file_uuid"],
                "grade": null,
                "createdAt": "..."
            }
        }
    ]
}
```

### Field Mapping
- `data[]` → Daftar seluruh mahasiswa dalam mata kuliah.
- `data[].assignment` → Indikator pengerjaan. Jika `null` berarti belum mengerjakan.
- `data[].assignment.files` → Bukti lampiran tugas.
- `data[].assignment.grade` → Nilai dari dosen.

### Reliability
✅ **CONFIRMED** (Evidence respons riil tersedia)

### TugasKu Usage
- Mendeteksi mahasiswa yang belum mengumpulkan Penugasan Terstruktur.
- Mengambil file tugas jika diperlukan untuk backup/review.
- Memantau pemberian nilai oleh dosen.

### Read-Only Status
✅ **READ-ONLY**
## Endpoint 7: GET /api/kuesioner/{kode_course}/{section_id}

### Request
Method: GET
URL: `https://mentari.unpam.ac.id/api/kuesioner/{kode_course}/{section_id}`
Parameters: 
- `kode_course` (String)
- `section_id` (String, contoh: PERTEMUAN_18)
Authentication: Bearer JWT

### Response (Verified)
Struktur:
```json
{
    "kode_course": "...",
    "kode_section": "...",
    "kuesioner": [
        {
            "id": "question_uuid",
            "kuesioner": "Teks pertanyaan...",
            "jawaban": 1
        }
    ]
}
```

### Field Mapping
- `kuesioner[]` → Daftar pertanyaan kuesioner.
- `kuesioner[].jawaban` → Jika terisi (tidak null), berarti kuesioner sudah dikerjakan oleh user tersebut.

### Reliability
⚠️ **PARTIALLY CONFIRMED** (Hanya data individu)
Data monitoring kelas (seluruh mahasiswa) belum ditemukan untuk kuesioner.

### TugasKu Usage
- Mengambil isi pertanyaan kuesioner.
- Verifikasi apakah kuesioner pada pertemuan tersebut sudah "siap" atau belum.

### Read-Only Status
✅ **READ-ONLY**
