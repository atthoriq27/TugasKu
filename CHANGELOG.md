# Changelog

Semua perubahan pada proyek TugasKu dicatat dalam dokumen ini.

Format dokumen ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi [Semantic Versioning](https://semver.org/).

## [1.2.1] - 2026-09-25

### Ditambahkan
- Pengemasan aplikasi desktop Windows mandiri menggunakan **Electron** dan **electron-builder**:
  - Installer resmi dengan wizard NSIS (`TugasKu Setup.exe`) lengkap dengan shortcut Desktop, Start Menu, dan uninstaller.
  - Varian portabel tanpa instalasi (`TugasKu-Portable.exe`).
  - Isolasi data pengguna persisten di direktori `%APPDATA%/TugasKu` via abstraksi `TUGASKU_CONFIG_DIR` dan `TUGASKU_DATA_DIR`.
- Skrip launcher cepat Windows (`start-tugasku.bat`) dan integrasi shortcut desktop dengan ikon resmi TugasKu.
- Pemindaian otomatis (auto-scan) saat membuka menu Rangkuman Pribadi sehingga data status seluruh mata kuliah pada pekan aktif langsung dimutakhirkan tanpa harus klik manual.
- Sakelar toggle fleksibel pada header Draft Pengingat WhatsApp:
  - Toggle "Nomor HP" untuk menyertakan atau menyembunyikan nomor HP (@628...) agar hanya menampilkan nama mahasiswa bersih.
  - Toggle "Nomor urut" untuk beralih antara format penomoran (1, 2, 3) atau daftar poin bullet (•).
- Preferensi sakelar draft tersimpan otomatis pada penyimpanan lokal peramban.

### Diperbaiki
- Tampilan placeholder dummy pada Rangkuman Pribadi digantikan dengan indikator pemindaian dinamis saat proses scan berlangsung.
- Penanganan link eksternal (WhatsApp Web, Telegram) pada mode desktop agar otomatis terbuka di peramban sistem utama.

## [1.2.0] - 2026-09-21

### Ditambahkan
- Kolom dan pemantauan status kuesioner pembelajaran pada tabel Rangkuman Pribadi untuk validasi absensi perkuliahan.
- Tombol dan modal rilis versi di sidebar aplikasi (`v1.2.0`).
- Endpoint API `/api/version` untuk pengecekan versi aplikasi dan status konfigurasi.
- Skrip ekspor bersih `npm run export:clean` untuk menyiapkan paket distribusi zip bebas kredensial sesi.

### Diubah
- Draf pesan WhatsApp grup matkul kini memicu pemindaian (auto-scan) secara otomatis saat berpindah mata kuliah atau pertemuan tanpa perlu berpindah tab secara manual.
- Penamaan berkas dan lembar kerja ekspor CSV sekarang bersifat dinamis mengikuti kelas yang sedang aktif (misal `Data_Mahasiswa_05TPLE001.csv`).
- Pembersihan kredensial sesi personal dan konfigurasi kelas pada repositori git melalui pembaruan `.gitignore`.
- Perapian dokumentasi panduan dan antarmuka tanpa dekorasi emoji non-standar.

### Diperbaiki
- Masalah duplikasi event trigger pada dropdown kustom saat memilih mata kuliah.
- Sinkronisasi daftar mata kuliah dari MENTARI saat berganti akun mahasiswa pada kelas berbeda.

## [1.1.0] - 2026-09-20

### Ditambahkan
- Pengaturan moda perkuliahan (daring/luring) per mata kuliah pada tab Pengaturan.
- Masking token bot Telegram pada tampilan antarmuka web.

### Diubah
- Engine browser login diprioritaskan menggunakan Google Chrome terpasang di sistem untuk efisiensi ruang penyimpanan.

## [1.0.0] - 2026-09-15

### Ditambahkan
- Rilis perdana sistem TugasKu.
- Pemindai otomatis status Posttest dan Forum Diskusi LMS MENTARI.
- Generator draf pesan rekapitulasi WhatsApp dan notifikasi Telegram.
- Ekspor data rekapitulasi mahasiswa ke format CSV.
