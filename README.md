# 🎓 TugasKu

> **Sistem Otomasi & Pemantau Tugas LMS MENTARI UNPAM untuk Ketua Kelas (Komti).**

TugasKu membantu Anda memantau keaktifan kelas di LMS MENTARI UNPAM secara instan: mendeteksi mahasiswa yang belum mengerjakan Posttest atau Forum Diskusi, lalu menghasilkan rekap rapi dan teks pesan yang siap di-*copy-paste* langsung ke grup WhatsApp kelas tanpa perlu membuka F12 DevTools atau menyalin token/cookie manual!

---

## ⚡ Fitur Utama

1. **Auto-Login Cukup 1 Kali (`npm run login`)**:
   - Jendela Google Chrome terbuka otomatis. Anda cukup login biasa ke MENTARI (NIM, password, captcha).
   - Sistem di background **otomatis menangkap token JWT, cookies, dan session** lalu menyimpannya secara aman.
   - Sesi tersimpan secara persisten sehingga Anda tidak perlu login berulang kali.
2. **Anti-Blokir Cloudflare (100% Manjur)**:
   - Permintaan API dijalankan melalui instance Chrome Anda, sehingga lolos dari proteksi Cloudflare Turnstile (403 Forbidden).
3. **Pemindai Tugas Otomatis (`npm run scan` / `npm run scan:all`)**:
   - Deteksi mahasiswa yang **Belum Posttest**.
   - Deteksi mahasiswa yang **Reply Forum-nya < 2 kali** (belum memenuhi syarat absensi).
   - Pindai 1 mata kuliah atau seluruh 8 mata kuliah kelas Anda sekaligus.
4. **Format Pesan Siap Salin ke WhatsApp**:
   - Menghasilkan draf teks peringatan WhatsApp yang rapi dan langsung bisa Anda salin ke grup kelas.

---

## 🚀 Panduan Penggunaan Super Cepat (3 Langkah)

### Langkah 1: Login Akun MENTARI Anda (Cukup 1x)
Buka terminal dan jalankan:
```bash
npm run login
```
Jendela Google Chrome akan terbuka. Silakan masukkan NIM, password, dan captcha Anda, lalu klik **Login**. Begitu Anda masuk ke halaman MENTARI, sistem akan otomatis mendeteksi login Anda dan menyimpan sesinya!

---

### Langkah 2: Pindai Tugas Mahasiswa
Setelah login, Anda bisa langsung memindai:

```bash
# 1. Pindai mata kuliah default pertemuan aktif
npm run scan

# 2. Pindai seluruh 8 mata kuliah aktif kelas Anda sekaligus
npm run scan:all

# 3. Pindai dengan tabel detail seluruh nama mahasiswa
npm run scan:detail

# 4. Lihat daftar 8 mata kuliah kelas Anda
npm run scan:courses
```

---

### Langkah 3: Salin ke WhatsApp Kelas
Hasil pemindaian di terminal akan langsung menyajikan teks yang siap Anda copy-paste:

```text
*⚠️ PERINGATAN TUGAS MENTARI ⚠️*
*[3] KECERDASAN BUATAN # 05TPLE003 (Sabtu) [E-1]*
_PERTEMUAN 1_

❌ *BELUM POSTTEST (3 Mahasiswa):*
1. NAMA MAHASISWA A
2. NAMA MAHASISWA B
3. NAMA MAHASISWA C

❌ *FORUM BELUM MEMENUHI MINIMAL 2 REPLY (2 Mahasiswa):*
1. NAMA MAHASISWA D (baru 1x reply)
2. NAMA MAHASISWA E (belum reply)

_Mohon segera diselesaikan agar absensi pertemuan ini valid! Semangat!_ 💪
```
Tinggal blok teksnya ➔ `Ctrl + C` ➔ Paste di WhatsApp kelas Anda!

---

## 🧪 Pengujian
Seluruh pengujian unit dan logika bisnis:
```bash
npm test
```
