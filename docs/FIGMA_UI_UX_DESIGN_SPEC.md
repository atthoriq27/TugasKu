# 🎨 TugasKu — UI/UX Design System & Figma Specification

Dokumen spesifikasi desain antarmuka (*UI/UX Design System Specification*) untuk aplikasi **TugasKu** (Sistem Otomasi, Pemantauan LMS MENTARI UNPAM, dan Generator Pengingat Kelas). Dokumen ini dirancang agar siap digunakan sebagai **Design Brief**, acuan pembuatan komponen di **Figma**, maupun prompt langsung untuk **Figma Make / Figma AI**.

---

## 📌 1. Prompt Siap Pakai (Figma Make / Figma AI)

Salin (*copy-paste*) prompt bahasa Inggris berikut ke fitur prompt **Figma Make / Figma AI**:

```text
Design a professional, modern, and high-density Web Application Dashboard called "TugasKu" — an academic task tracker and attendance compliance monitoring system for college class leaders (Komti/Admin).

Theme & Aesthetic:
- Sleek Modern Dark Mode (Canvas background: #0B0F19, Surface Cards: #1E293B, Glassmorphic border: rgba(255,255,255,0.08), Glow accents).
- Accent Colors: Electric Cyan (#38BDF8) for primary, Emerald Green (#10B981) for completed status, Amber/Orange (#F59E0B) for in-progress/warning, Rose Red (#EF4444) for urgent deadlines.
- Typography: Plus Jakarta Sans for UI text and headings, JetBrains Mono for student IDs (NIM), numbers, and countdown timers.
- Desktop Frame: 1440 x 900px, 12-column grid, responsive cards with Auto-Layout (gap: 16px, radius: 14px).

Key Sections & Components:
1. Top Navigation Bar (Height: 64px):
   - Left: Logo icon + "TugasKu" title, Class Badge ("05TPLE003"), Subtitle "Pemantau MENTARI UNPAM".
   - Right: Countdown timer pill widget ("Batas Pekan 3 • 2 Hari 04h:12m", glowing red/amber border), LMS API Status Indicator (Green dot "MENTARI Online"), and Profile Pill ("ATTHORIQ").
2. Smart Filter & Control Toolbar:
   - Course Selector Dropdown (showing course name, SKS pill, and mode: Daring/Luring), Meeting/Pertemuan Selector (Pekan 1-16, UTS, UAS), Single Scan Button ("Cek Status"), and Bulk Scan Button ("Scan Seluruh Matkul").
3. Metric Summary Cards (4 Cards in a row):
   - Card 1: Total Mahasiswa (37 Mahasiswa Utama + 2 Mahasiswa Revisi).
   - Card 2: Sudah Posttest & Fordis (24 Mahasiswa - Green gradient badge).
   - Card 3: Belum Selesai / Perlu Tindakan (13 Mahasiswa - Red/Amber gradient badge).
   - Card 4: Status Dosen Pekan Ini (2 Matkul Aktif, 3 Fordis Belum Dibuka).
4. Main Content Area (Two-Column Layout / Split View):
   - Left/Center (65% width): Tabbed Data Table with tabs: [Semua], [Belum Posttest], [Forum Diskusi Kurang (<2x)], [Penugasan Terstruktur], [Rangkuman Pribadi]. Table rows have NIM (monospace), Student Name, WA reminder direct action button, and detailed forum topic pills (e.g., "Topik 1: 2x reply ✅", "Topik 2: 0x reply ❌").
   - Right (35% width): WhatsApp & Telegram Reminder Studio (Simulator Card): Tab switcher [Grup Matkul] vs [Grup Utama (Semua)] vs [Deadline Hari Ini], toggle switch "Sertakan Nama Mahasiswa", formatted chat bubble preview with markdown typography (*bold*, > quotes, emojis), and primary action buttons: [Salin Draft], [Buka WhatsApp], [Kirim ke Telegram].
5. Overlay Modal (Separate Frame 800 x 580px):
   - "Status Fordis Semua Matkul": Matrix table listing all semester courses, indicating whether class is Daring, Luring (Tatap Muka), or Luring with MENTARI Tasks (Cyan badge), with Fordis status (Sudah Dibuka vs Belum Dibuka Dosen).
```

---

## 🎨 2. Design System Tokens

### A. Palet Warna (Color Palette)

| Token Name | Hex Code | RGB | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| `bg-app-dark` | `#0B0F19` | `11, 15, 25` | Background canvas kanvas aplikasi |
| `bg-surface-dark` | `#1E293B` | `30, 41, 59` | Background kartu, container tabel, sidebar |
| `bg-surface-elevated` | `#334155` | `51, 65, 85` | Hover state, dropdown menu, modal header |
| `border-glass` | `rgba(255, 255, 255, 0.08)` | - | Border pembatas kartu (efek glassmorphism) |
| `primary-500` | `#0284C7` | `2, 132, 199` | Tombol CTA utama, tab aktif |
| `primary-accent` | `#38BDF8` | `56, 189, 248` | Glow effect, link, status khusus Luring+Tugas |
| `success-500` | `#10B981` | `16, 185, 129` | Status Selesai, Online, 2x reply fordis |
| `warning-500` | `#F59E0B` | `245, 158, 11` | Fordis belum dibuka, deadline mendekat |
| `danger-500` | `#EF4444` | `239, 68, 68` | Mahasiswa belum posttest, deadline hari ini |
| `text-primary` | `#F8FAFC` | `248, 250, 252` | Judul, nama mahasiswa, metrik utama |
| `text-secondary` | `#94A3B8` | `148, 163, 184` | Subtitle, label tanggal, header kolom tabel |
| `text-muted` | `#64748B` | `100, 116, 139` | Placeholder, keterangan nonaktif |
| `wa-chat-bg` | `#111B21` | `17, 27, 33` | Background simulator preview WhatsApp |
| `wa-bubble-bg` | `#005C4B` | `0, 92, 75` | Balon pesan terkirim WhatsApp |

### B. Tipografi (Typography Hierarchy)

| Level / Kegunaan | Font Family | Weight | Size | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Heading 1 (Brand / Modal Title)** | Plus Jakarta Sans | Bold (700) | 20px | 28px |
| **Heading 2 (Card Header)** | Plus Jakarta Sans | SemiBold (600) | 16px | 24px |
| **KPI Numbers (Metrics)** | Plus Jakarta Sans / Inter | ExtraBold (800) | 28px | 34px |
| **Body Regular** | Plus Jakarta Sans | Regular (400) | 13px | 20px |
| **Body SemiBold / Label** | Plus Jakarta Sans | SemiBold (600) | 13px | 18px |
| **Code / NIM / Timer / Tabular** | **JetBrains Mono** | Medium (500) | 12px | 16px |
| **Chat Preview Text** | Consolas / JetBrains Mono | Regular (400) | 12px | 18px |

### C. Efek & Elevation (Shadows & Glassmorphism)

- **Card Radius**: `14px` (Small: `8px`, Pills: `9999px`)
- **Card Shadow**: `0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Backdrop Blur**: `12px` (pada modal overlay dan topbar)
- **Pulse Glow (Deadline Hari Ini)**: `box-shadow: 0 0 16px rgba(239, 68, 68, 0.4)`

---

## 📐 3. Arsitektur Layout & Rincian Frame di Figma

### Frame 1: Desktop Main Dashboard (`1440 × 900 px`)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (Height 64px)                                                                   │
│ [Logo] TugasKu [05TPLE003]    | ⏳ Batas Pekan 3 (2d 04h) | 🟢 MENTARI Online | [User] │
├─────────────────┬──────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (240px) │ KPI METRICS ROW (4 Cards, Height 110px)                              │
│ • Dashboard     │ [37 Mhs Utama]   [24 Lengkap ✅]   [13 Belum ❌]   [2 Daring Aktif]   │
│ • Jadwal Kelas  ├──────────────────────────────────────────────────────────────────────┤
│ • Monitoring    │ CONTROL & FILTER BAR                                                 │
│ • Draft WA      │ [Matkul Dropdown v] [Pertemuan 3 v] [Pekan 3 v] [Cek] [Scan Seluruh] │
│ • Status Dosen  ├───────────────────────────────────┬──────────────────────────────────┤
│ • Status Pribadi│ TABEL STATUS MAHASISWA (65%)      │ STUDIO DRAF PENGINGAT (35%)      │
│                 │ Tabs: [Posttest] [Fordis] [Tugas] │ [Tab: Grup Utama | Grup Matkul]  │
│ [INFO DOSEN]    │ Search: [Cari nama / NIM...     ] │ [Toggle: Nama Mahasiswa [ON|OFF]]│
│ DIMAS LENDENSI  │ 1. 24101140... ATTHORIQ [WA] [OK] │ ┌──────────────────────────────┐ │
│ Sabtu • V.619   │ 2. 24101140... BIMA     [WA] [X]  │ │ 📢 REKAP TUGAS MENTARI       │ │
│                 │ 3. 24101140... DINA     [WA] [X]  │ │ > PENGOLAHAN CITRA DIGITAL   │ │
│                 │                                   │ │ - Fordis: 38 Mhs belum       │ │
│                 │                                   │ └──────────────────────────────┘ │
│                 │                                   │ [Salin Draft] [Kirim Telegram]   │
└─────────────────┴───────────────────────────────────┴──────────────────────────────────┘
```

#### Komponen Utama Frame 1:
1. **Top Navigation Bar**:
   - Branding dengan badge kelas `05TPLE003`.
   - **Deadline Pill**: Menampilkan hitung mundur waktu nyata (*countdown*) ke deadline mingguan (Jumat/Sabtu 23:59 WIB).
   - **Status Sesi MENTARI**: Indikator dot hijau (*Online*) atau merah (*Sesi Terputus*).
   - **User Profile Pill**: Menampilkan nama akun login (klik untuk langsung ke Rangkuman Pribadi).
2. **Filter & Control Bar**:
   - Dropdown mata kuliah dengan indikator jumlah SKS dan mode (Daring/Luring).
   - Dropdown Pertemuan (Pertemuan 1–16).
   - Dropdown Pekan (Pekan 1–16, UTS, UAS).
   - Tombol utama: `Cek Status` (single) dan `Scan Seluruh Matkul Daring` (bulk scan).
3. **Metric Summary Cards**:
   - Total Mahasiswa Kelas (Utama + Mengulang/Revisi).
   - Mahasiswa Selesai (Hijau).
   - Mahasiswa Belum Selesai (Merah).
   - Ringkasan Status Dosen Pekan Ini.
4. **Interactive Data Table**:
   - Segmented Tabs: `[Semua]`, `[Belum Posttest]`, `[Forum Kurang (<2x)]`, `[Belum Tugas]`, `[Rangkuman Pribadi]`.
   - Kolom: No, NIM, Nama Mahasiswa (+ Badge Revisi jika mengulang), Aksi Chat WA, Status Detail.
   - Kolom status mendukung pill per topik diskusi dosen (misal: *Topik 1: 2x reply ✅*, *Topik 2: 0x reply ❌*).
5. **WhatsApp & Telegram Reminder Studio**:
   - Switcher tab: `[Grup Matkul]` vs `[Grup Utama (Semua)]` vs `[Deadline Hari Ini]`.
   - Toggle switch interaktif: `Sertakan Nama Mahasiswa: ON / OFF`.
   - Preview bubble chat dengan styling WhatsApp dark theme.
   - Tombol aksi: `Salin Draft`, `Buka WhatsApp Web`, `Kirim via Bot Telegram`.

---

### Frame 2: Modal Status Fordis Semua Matkul (`800 × 580 px`)

- **Tujuan**: Memberikan visibilitas 100% apakah dosen pekan ini sudah membuka fordis atau belum di seluruh mata kuliah.
- **Tabel Matrix**:
  - Kolom 1: No.
  - Kolom 2: Kode & Nama Mata Kuliah.
  - Kolom 3: Bobot SKS.
  - Kolom 4: Mode Kuliah (`DARING`, `LURING`, atau `LURING + TUGAS MENTARI`).
  - Kolom 5: Status Fordis (`🟢 Sudah Dibuka` vs `🟡 Belum Dibuka Dosen`).
  - Kolom 6: Status Posttest (`🟢 Sudah Dibuka` vs `⚪ Belum Dibuka`).
  - Kolom 7: Tombol Aksi "Pilih & Cek Matkul".

---

### Frame 3: Modal Rangkuman Pribadi / "Status Saya" (`860 × 600 px`)

- **Tujuan**: Mahasiswa/pengurus dapat langsung melihat status penyelesaian dirinya sendiri tanpa mencari satu-per-satu di tabel kelas.
- **Header Profil**: Avatar inisial, Nama Mahasiswa, NIM, Total Beban SKS pekan aktif.
- **Kartu Statistik Pribadi**:
  - Matkul Selesai (misal: `3 / 5 Matkul`).
  - Matkul Pending (misal: `2 Matkul`).
  - Status Deadline Hari Ini (`🚨 1 Matkul Deadline Malam Ini`).
- **Tabel Checklist Mandiri**:
  - Baris per mata kuliah.
  - Kolom: Mata Kuliah, Deadline, Status Fordis (2x reply), Status Posttest, Status Penugasan, Status Kuesioner, Kesimpulan Absensi (`🟢 VALID` / `❌ BELUM LENGKAP`).

---

### Frame 4: Mobile Responsive View (`393 × 852 px` — iPhone 16)

- Topbar ringkas dengan burger menu dan status pill.
- Horizontal scroll card carousel untuk KPI metrik.
- Sticky segmented control tab untuk memfilter status mahasiswa.
- Bottom Floating Action Bar untuk membuka Generator Draf WhatsApp dan menyalin teks dengan 1 ketukan.

---

## 💡 4. Aturan Bisnis & UX yang Wajib Tercermin di Desain

1. **Aturan "Fordis Belum Dibuka Jangan Ditongolin di Matkul Aktif"**:
   - Jika mata kuliah daring hanya memiliki slot posttest kosong tanpa topik diskusi dosen (`forum.available: false`), mata kuliah tersebut **TIDAK BOLEH** tampil di daftar tugas aktif.
   - Mata kuliah tersebut harus memiliki section khusus di bawah bernama `*Fordis Belum Dibuka Dosen:*`.
2. **Aturan "Matkul Offline Pengganti Tugas MENTARI"**:
   - Jika ada mata kuliah offline (tatap muka) yang dosennya berhalangan hadir dan memberikan tugas di MENTARI (seperti kasus *Pengolahan Citra Digital*), berikan badge khusus `LURING + TUGAS MENTARI` (Cyan `#38BDF8`).
   - Matkul ini harus otomatis masuk ke daftar tugas aktif draf WhatsApp.
3. **Aturan "Alur Absensi Valid"**:
   - Selalu sertakan footer alur absensi valid di kartu ringkasan dan draf pesan:
     `Fordis (min 2x) ➔ Posttest ➔ Kuesioner (Absensi Valid)`
4. **Indikator Deadline Hari Ini**:
   - Jika hari ini cocok dengan hari deadline mata kuliah (misal hari Sabtu untuk *Pengolahan Citra Digital*), tambahkan badge merah berkedip `🚨 DEADLINE HARI INI` di kartu dan draf pengingat.

---

## 🛠️ 5. Rekomendasi Komponen Figma (Figma Component Set)

Buat komponen-komponen berikut dengan Auto-Layout dan Variants di Figma:

1. **Button Component**:
   - Variants: `Primary` (Cyan fill), `Secondary` (Slate outline), `Success` (Green), `Ghost`, `Icon-Only`.
   - States: `Default`, `Hover`, `Active`, `Disabled`, `Loading`.
2. **Badge / Pill Component**:
   - Variants:
     - Mode: `Daring` (Emerald fill), `Luring` (Blue fill), `Luring+Tugas` (Cyan fill), `Kombinasi` (Purple fill).
     - Status: `Sudah Dibuka` (Green), `Belum Dibuka` (Amber), `Tatap Muka` (Gray).
     - Urgensi: `Deadline Hari Ini` (Red pulse border).
3. **Table Row Component**:
   - Kolom dengan auto-layout responsive (*fill container*).
   - Cell interaktif untuk rincian forum per-topik dosen.
4. **Chat Simulator Container**:
   - Auto-layout vertical dengan padding `16px`, background `#111B21`, radius `12px`, dan monospace typography.
