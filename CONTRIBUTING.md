# Panduan Kontribusi (Contributing Guide)

Terima kasih atas minat Anda untuk berkontribusi pada pengembangan **TugasKu**! Kami menyambut baik setiap kontribusi berupa perbaikan bug, fitur baru, optimasi performa, maupun perbaikan dokumentasi.

Harap luangkan waktu untuk membaca panduan berikut sebelum mengirimkan kontribusi atau *Pull Request* (PR).

---

## 1. Kode Etik

Proyek ini menjunjung tinggi lingkungan kolaborasi yang inklusif, saling menghormati, dan profesional. Harap patuhi aturan yang tercantum dalam [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 2. Alur Pengembangan Lokal (Local Setup)

1. **Fork & Clone Repositori**
   ```bash
   git clone https://github.com/username/TugasKu.git
   cd TugasKu
   ```

2. **Pasang Dependensi**
   Pastikan Anda menggunakan Node.js versi 18 LTS atau lebih baru:
   ```bash
   npm install
   ```

3. **Siapkan File Konfigurasi Lingkungan**
   Salin file template konfigurasi lingkungan jika diperlukan:
   ```bash
   cp .env.example .env
   ```
   > ⚠️ **PENTING:** Jangan pernah melakukan *commit* terhadap file `.env`, kredensial login MENTARI, atau kontak nomor telepon mahasiswa ke repositori publik!

4. **Jalankan Aplikasi untuk Pengujian Lokal**
   * Mode Web Dashboard:
     ```bash
     npm run web
     ```
   * Mode Aplikasi Desktop (Electron):
     ```bash
     npm run app
     ```

---

## 3. Konvensi Penamaan Branch

Buat branch baru dari `main` dengan format deskriptif:

* `feat/nama-fitur` (untuk penambahan fitur baru)
* `fix/deskripsi-bug` (untuk perbaikan bug)
* `docs/pembaruan-dokumentasi` (untuk dokumentasi)
* `refactor/nama-modul` (untuk refaktorisasi tanpa mengubah perilaku)

Contoh:
```bash
git checkout -b feat/export-pdf-recap
```

---

## 4. Standar Kode & Struktur Proyek

* **Modularitas:** Simpan logika bisnis inti di dalam direktori `src/lib/`.
* **Arsitektur Antarmuka:** Aset antarmuka web berada di `public/`, dan *wrapper* desktop berada di `desktop/`.
* **Keamanan Privasi:** Selalu pastikan nomor telepon mahasiswa atau token sesi dapat dimask/disembunyikan saat diekspor atau ditampilkan di log publik.
* **Format Commit Message:** Gunakan konvensi [Conventional Commits](https://www.conventionalcommits.org/):
  * `feat:` Fitur baru
  * `fix:` Perbaikan bug
  * `docs:` Perubahan dokumentasi
  * `test:` Penambahan atau perbaikan pengujian unit
  * `refactor:` Restrukturisasi kode
  * `chore:` Pemeliharaan dependensi atau build tools

Contoh:
```bash
git commit -m "feat(scheduler): tambahkan interval pemindaian dinamis"
```

---

## 5. Menjalankan Pengujian (Testing)

Sebelum membuka Pull Request, **wajib** menjalankan seluruh pengujian unit dan memastikan tingkat keberhasilan 100%:

```bash
npm test
```

Jika menambahkan modul baru, tambahkan skenario uji terkait di dalam direktori `test/` dan daftarkan pada `test/run-all-tests.js`.

---

## 6. Mengajukan Pull Request (PR)

1. Pastikan branch Anda telah disinkronkan dengan `main` terbaru (`git rebase` atau `git merge main`).
2. Jalankan `npm test` untuk memastikan seluruh tes lulus.
3. Push perubahan ke branch fork Anda:
   ```bash
   git push origin feat/nama-fitur
   ```
4. Buka Pull Request di GitHub dengan mengisi template PR secara lengkap:
   * Jelaskan masalah yang diselesaikan dan solusi yang diimplementasikan.
   * Sertakan bukti pengujian atau tangkapan layar jika relevan.
5. Reviewer akan meninjau kode Anda dan memberikan umpan balik sebelum proses *merge*.
