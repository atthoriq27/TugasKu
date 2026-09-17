# TugasKu - Spesifikasi Produk

## 1. Deskripsi Umum

TugasKu adalah aplikasi manajemen tugas untuk ketua kelas yang terintegrasi dengan LMS MENTARI UNPAM. Aplikasi ini membantu ketua kelas dalam:
- Memantau aktivitas pembelajaran mahasiswa per mata kuliah
- Mendeteksi mahasiswa yang belum mengerjakan posttest
- Membuat reminder otomatis untuk grup WhatsApp
- Membuat update tugas dan recap aktivitas per mata kuliah
- Mencatat aktivitas dosen (lecturer activity log)
- Mendukung multiple SKS (2, 3, dan 4 SKS)
- Mendukung kelompok mata kuliah (grup 1 dan 2)
- Mendukung periode pembelajaran online/offline dan double meeting
- Menggunakan sinkronisasi waktu menggunakan world clock

## 2. Fitur Utama

### 2.1 Integrasi MENTARI LMS
- Terhubung ke API MENTARI UNPAM
- Mengambil daftar mata kuliah per semester
- Mengambil detail pertemuan dan aktivitas pembelajaran
- Mengambil data mahasiswa per mata kuliah
- Mengambil status penyelesaian tugas mahasiswa

### 2.2 Deteksi dan Monitoring
- Mendeteksi pertemuan dan aktivitas baru
- Mendeteksi mahasiswa yang belum mengerjakan posttest
- Mendeteksi penugasan terstruktur baru
- Mendeteksi forum diskusi baru
- Membuat list mahasiswa yang belum mengerjakan per aktivitas

### 2.3 Reminder dan Notifikasi
- Membuat reminder untuk grup WhatsApp mata kuliah
- Membuat update tugas per mata kuliah untuk grup mata kuliah
- Membuat recap berbagai mata kuliah untuk grup utama
- Menjadwalkan pengiriman reminder sesuai schedule

### 2.4 Logging dan Tracking
- Mencatat lecturer activity log (aktivitas dosen)
- Tracking perubahan status aktivitas
- Audit trail untuk setiap aksi penting

### 2.5 Manajemen Jadwal
- Schedule engine untuk konfigurasi 2 SKS, 3 SKS, dan 4 SKS
- Support untuk periode online/offline
- Support untuk double meeting (pertemuan ganda)
- Sinkronisasi waktu menggunakan world clock
- Time zone aware scheduling

## 3. Model Data

### 3.1 Entity Utama

#### Course (Mata Kuliah)
- id
- kode_course (unique identifier seperti "20252-04TPLE003-22TIF0162")
- coursename
- shortname
- id_mata_kuliah
- id_prodi
- id_semester_registrasi
- id_periode
- id_kelas
- id_shift
- id_hari_waktu_kuliah
- nama_hari
- nama_mata_kuliah
- sks (2, 3, atau 4)
- createdAt
- nama_dosen

#### Mahasiswa (Student)
- id
- nama
- npm/nim
- email
- status_penyelesaian (pending/completed)
- course_id (foreign key)

#### Aktivitas (Activity)
- id
- tipe (pertemuan, posttest, pretest, forum_diskusi, penugasan_terstruktur, questionnaire)
- judul
- deskripsi
- due_date
- course_id
- status (pending/completed/overdue)
- created_at

#### Submission/Attempt
- id
- student_id
- activity_id
- status_pengerjaan (belum_dikerjakan, sedang_dikerjakan, sudah_dikerjakan)
- submitted_at
- score

#### Reminder
- id
- course_id
- tipe_reminder (tugas_baru, mahasiswa_belum_mengerjakan, recap)
- grup_target (grup_mata_kuliah, grup_utama)
- pesan
- scheduled_time
- status (pending, sent, failed)

### 3.2 Relationship
- Course memiliki banyak Mahasiswa
- Course memiliki banyak Aktivitas
- Aktivitas memiliki banyak Submission
- Mahasiswa memiliki banyak Submission

## 4. Endpoint MENTARI yang Digunakan

### Confirmed Endpoints
- `POST /api/login` - Login ke MENTARI
- `GET /api/user-course?page=1&limit=12&semester=20252` - Ambil daftar mata kuliah

### Endpoints Sedang Discovery
- Course detail
- Pertemuan
- Activity
- Pretest
- Forum diskusi
- Posttest
- Questionnaire
- Penugasan terstruktur
- Daftar mahasiswa
- Submission/attempt
- Completion/status pengerjaan

## 5. Workflow Utama

### 5.1 Inisialisasi
1. Ketua kelas login dengan kredensial MENTARI
2. Aplikasi mengambil daftar mata kuliah untuk semester aktif
3. Aplikasi melakukan sinkronisasi data awal

### 5.2 Monitoring Aktivitas
1. Aplikasi secara berkala polling MENTARI untuk aktivitas baru
2. Saat aktivitas baru terdeteksi:
   - Aplikasi mengambil detail aktivitas
   - Aplikasi mengambil daftar mahasiswa
   - Aplikasi mengambil status penyelesaian mahasiswa
3. Aplikasi mencatat perubahan dalam activity log

### 5.3 Deteksi Mahasiswa Belum Mengerjakan
1. Aplikasi mengidentifikasi posttest/tugas dengan due date
2. Aplikasi membandingkan daftar mahasiswa dengan completion status
3. Aplikasi membuat list mahasiswa yang belum mengerjakan
4. Aplikasi membuat reminder untuk dikirim ke grup WhatsApp

### 5.4 Pengiriman Reminder
1. Aplikasi menjadwalkan reminder berdasarkan schedule engine
2. Pada waktu yang dijadwalkan, aplikasi membuat pesan reminder
3. Pesan dikirim ke grup WhatsApp yang ditentukan
4. Aplikasi mencatat status pengiriman reminder

## 6. Business Rules

### 6.1 Absensi dan Forum Diskusi

#### Definisi Syarat Forum Diskusi
Mahasiswa dianggap **MEMENUHI syarat Forum Diskusi** untuk suatu pertemuan apabila melakukan minimal **2 (dua) aktivitas/reply Forum Diskusi** pada pertemuan tersebut.

#### Ketentuan Forum Diskusi
- **Minimum Forum Diskusi**: 2 kali/reply per mahasiswa per pertemuan
- Jumlah reply harus dihitung dari data submission/reply yang tersedia dari API MENTARI
- Status harus berdasarkan aktivitas/reply mahasiswa pada forum yang terkait dengan pertemuan, bukan hanya membuka forum

#### Status Forum Diskusi per Mahasiswa per Pertemuan

| Reply Count | Status | Keterangan |
|-------------|--------|-----------|
| 0 | BELUM_MENGERJAKAN | Mahasiswa tidak pernah memberi reply di forum |
| 1 | BELUM_MEMENUHI | Mahasiswa hanya 1 kali memberi reply (belum mencapai minimum 2) |
| >= 2 | MEMENUHI | Mahasiswa telah memberi reply minimal 2 kali (memenuhi syarat) |

#### Catatan Penting
- Status forum diskusi **dipisahkan dari status posttest**
- Penilaian berbasis jumlah aktivitas/reply, bukan kehadiran atau pembukaan forum
- Setiap reply/submission dihitung sebagai 1 aktivitas
- Status ini independen dari aktivitas lainnya (pretest, posttest, questionnaire)

#### Dependency Status Kesiapan Absensi per Pertemuan

Urutan dependency untuk menentukan kesiapan absensi:

```
1. Pretest
        ?
2. Forum Diskusi (>= 2 aktivitas/reply)
        ?
3. Posttest
        ?
4. Questionnaire
        ?
5. Absensi (siap/selesai)
```

Mahasiswa dianggap siap untuk absensi suatu pertemuan apabila telah menyelesaikan semua aktivitas sesuai urutan dependency di atas.

## 7. Batasan dan Asumsi

- Aplikasi read-only terhadap MENTARI (tidak melakukan modifikasi data)
- Polling interval disesuaikan dengan beban server MENTARI
- Tidak ada bypass terhadap mekanisme keamanan MENTARI (CAPTCHA, rate limiting, dll)
- Integrasi WhatsApp menggunakan API pihak ketiga (bukan bot manual)
- Ketua kelas bertanggung jawab mengelola kredensial login mereka sendiri

## 8. Persyaratan Non-Fungsional

### 8.1 Keamanan
- Tidak menyimpan password MENTARI dalam plaintext
- Menggunakan session token yang aman
- Implementasi CSRF protection
- SQL injection prevention

### 8.2 Reliability
- Graceful handling terhadap API MENTARI error
- Retry mechanism dengan exponential backoff
- Data persistence untuk audit trail

### 8.3 Usability
- Interface sederhana yang mudah digunakan ketua kelas
- Error message yang jelas dan actionable
- Dashboard overview status aktivitas mata kuliah

## 9. Multi-Workspace Support

- Setiap ketua kelas dapat memiliki workspace tersendiri
- Isolasi data antar workspace
- Konfigurasi schedule dan reminder per workspace
- Support untuk ketua kelas yang mengelola multiple mata kuliah
