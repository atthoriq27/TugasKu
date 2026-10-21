# Kebijakan Keamanan (Security Policy)

Keamanan dan privasi data akademik mahasiswa merupakan prioritas utama dalam proyek **TugasKu**.

---

## Versi yang Didukung

Pembaruan keamanan dan perbaikan bug secara aktif diberikan untuk versi-versi berikut:

| Versi | Didukung Keamanan |
| :--- | :--- |
| 1.2.x | :white_check_mark: Ya |
| 1.1.x | :x: Tidak |
| 1.0.x | :x: Tidak |

---

## Prinsip Privasi & Perlindungan Data Mahasiswa

1. **Penyimpanan Lokal (Zero Cloud Storage)**:
   * Seluruh data sesi MENTARI (`session.json`), konfigurasi kelas (`class-settings.json`), dan kontak WhatsApp mahasiswa (`contacts.json`) hanya disimpan secara lokal di mesin pengguna.
   * Aplikasi tidak pernah mengirimkan kredensial atau kontak mahasiswa ke server pihak ketiga.

2. **Sanitasi Ekspor**:
   * Skrip `npm run export:clean` otomatis mengecualikan file rahasia (`.env`, `contacts.json`, `session.json`, `telegram.json`, `data/`) dari paket distribusi arsip `.zip`.
   * Repositori Git dikonfigurasi dengan `.gitignore` ketat untuk mencegah kebocoran data sensitif secara tidak sengaja.

3. **Masking Kontak & Token**:
   * Tampilan antarmuka dashboard menyembunyikan token bot Telegram dan menyediakan sakelar toggle penyamaran nomor HP mahasiswa.

---

## Melaporkan Kerentanan Keamanan

Jika Anda menemukan potensi kerentanan keamanan (seperti kebocoran token atau celah injeksi), harap **JANGAN** membuat issue publik di GitHub.

Silakan laporkan secara privat melalui salah satu cara berikut:
1. Menggunakan fitur **GitHub Private Vulnerability Reporting** pada tab *Security* di repositori ini.
2. Menghubungi pengelola repositori secara langsung melalui kontak pribadi pengelola proyek.

Harap sertakan informasi berikut dalam laporan Anda:
* Deskripsi kerentanan dan potensi dampaknya.
* Langkah-langkah reproduksi (proof-of-concept) yang jelas.
* Saran perbaikan atau mitigasi (jika ada).

Tim pengembang akan merespons dalam waktu 1x48 jam untuk memvalidasi dan menyiapkan patch perbaikan.
