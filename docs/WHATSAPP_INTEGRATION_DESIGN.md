# WHATSAPP INTEGRATION DESIGN (PHASE 8)

Dokumen ini menjelaskan arsitektur integrasi WhatsApp untuk TugasKu berdasarkan output dan struktur yang dihasilkan di Phase 1 hingga Phase 7.1.

## 1. KEBUTUHAN WHATSAPP TUGASKU

TugasKu membutuhkan sebuah layer pengiriman pesan WhatsApp (Adapter) yang bertugas mengeksekusi pengiriman payload yang telah di-generate oleh `WhatsAppMessageRouter`.

Kebutuhan utama meliputi:
- Mengirim pesan teks terstruktur (beserta formatting bold/italic dan emoji).
- Me-*mention* (tag) anggota grup tertentu.
- Mendapatkan identifikasi unik pesan terkirim (message ID) untuk kebutuhan _idempotency_ dan logging.
- Tidak memiliki dependensi kuat pada library WA tertentu (decoupled architecture).

## 2. KEBUTUHAN MENTION ANGGOTA GRUP

Berbeda dengan format WhatsApp personal, pesan yang dikirimkan ke dalam grup seringkali membutuhkan penandaan spesifik ke mahasiswa yang dituju. 
Berdasarkan `WhatsAppMessageRouter`:
- Format pesan menyisipkan text seperti `@{phone}` (misal `@62811111111`).
- Bersamaan dengan itu, adapter memerlukan supply array nomor-nomor yang harus di-tag agar library WA menyalakan fitur mention.
- Hanya mahasiswa yang kontaknya ada dalam `config/students.json` yang akan masuk ke payload `mentions`.
- Apabila tidak memiliki kontak, sistem menggunakan fallback ke text String `Nama Mahasiswa` tanpa di-mention, dan mencatat Log Warning.

## 3. INTERFACE WhatsAppAdapter

Semua penyedia WhatsApp harus mengimplementasikan interface adapter berikut:

```javascript
export class WhatsAppAdapter {
  async connect() { throw new Error("Not implemented"); }
  async disconnect() { throw new Error("Not implemented"); }
  async getGroups() { throw new Error("Not implemented"); }
  async sendMessage(groupId, text) { throw new Error("Not implemented"); }
  async sendMessageWithMentions(groupId, text, mentions) { throw new Error("Not implemented"); }
  isConnected() { throw new Error("Not implemented"); }
}
```

## 4. MESSAGE PAYLOAD CONTRACT

Payload yang dikeluarkan oleh Router ke layer WhatsApp adalah:

```json
{
  "destination": "COURSE_GROUP",
  "course_id": "20252-04TPLE003-22TIF0162",
  "group_id": "120363xxx@g.us",
  "message_type": "STUDENT_REMINDER",
  "message": "🔔 *REMINDER TUGAS* ...",
  "mentions": [
    {
      "nim": "241011401783",
      "displayName": "AHMAD ZACKY ALAMSYAH",
      "phone": "62811111111",
      "mention": true
    }
  ]
}
```

## 5. GROUP ROUTING CONTRACT

- **STUDENT_REMINDER**: Dikirim ke grup mata kuliah (destination: `COURSE_GROUP`). Tidak boleh ke Grup Utama.
- **COURSE_ACTIVITY_UPDATE**: Dikirim ke grup mata kuliah (destination: `COURSE_GROUP`).
- **MAIN_GROUP_ACTIVITY_UPDATE**: Agregasi update dari multi-matkul dikirim HANYA ke Grup Utama Kelas (destination: `MAIN_GROUP`).

Konfigurasi disimpan pada `config/groups.json`. Pengguna (Admin/Ketua Kelas) wajib mengisi parameter `whatsappGroupId` berdasarkan ID internal WhatsApp (misal: `1203631234567890@g.us`).

## 6. STUDENT CONTACT CONTRACT

Data mahasiswa untuk mention dikelola dalam `config/students.json`. Struktur:
```json
{
  "nim": "241011401783",
  "nama": "AHMAD ZACKY",
  "phone": "62811111111"
}
```
Aturan:
- `phone` harus menggunakan format kode negara (misal awalan `62`), tanpa `+` atau `0`.
- Jika phone tidak tersedia/null, pipeline WA tidak akan gagal. Akan dilabeli `MISSING_CONTACT`.

## 7. AUTHENTICATION & SESSION REQUIREMENT

TugasKu mensyaratkan session authentication WhatsApp dijaga aman:
- Jangan di-commit ke Git. Set `.gitignore` khusus untuk folder penyimpanan sesi autentikasi (contoh: `data/wa-session/`).
- Autentikasi dilakukan via QR Code pada terminal, bukan menggunakan user interface.
- Layer authentication tidak boleh mengekspos kredensial ke global repository / config files.

## 8. RETRY & ERROR HANDLING

- Layer pengiriman WhatsApp harus mampu menangkap network errors, rate limit (contoh: `429 Too Many Requests`), atau group tidak valid.
- Error yang dilempar dari Adapter dikomunikasikan kembali ke `SchedulerEngine` sehingga status Job diset sebagai `FAILED` berserta pesan errornya.
- Scheduler Engine memiliki rule `maxAttempts` (default: 3) yang menangani retry otomatis dengan delay `30000ms`.

## 9. RATE LIMITING

- TugasKu perlu mengimplementasikan Jeda (Throttling) agar nomor bot tidak terbanned.
- Jika terdapat update ke banyak matkul (multi-group routing), berikan delay setidaknya 3-5 detik antar pengiriman pesan group.
- Scheduler tidak menjalankan lebih dari X pengiriman dalam 1 menit. (Parameter delay bisa di atur di internal Task Runner).

## 10. LOGGING

Log setiap aktivitas pengiriman pesan di console saat development, namun production membutuhkan persistensi minimal untuk status.
- Gunakan `JsonWhatsAppMessageStore` yang telah dibuat.

## 11. DELIVERY STATUS

Setiap pesan yang berhasil dikirim harus me-return object:

```javascript
{
  success: true,
  message_id: "...",
  destination: "...",
  sent_at: "...",
  error: null
}
```
Hasil ini disimpan dalam persistensi state `idempotency` untuk menolak resend bila message id/unique_key terkait sudah berstatus `SENT`.

## 12. DRY-RUN MODE

- Interface WhatsApp Adapter mendukung Mock/Dry-Run: `whatsapp.js --dry-run`.
- Saat aktif, `MockWhatsAppAdapter` digunakan. Hanya me-Log ke console. Tidak melakukan HTTP network call apapun. Sangat krusial untuk QA Test.

## 13. TEST STRATEGY

Testing untuk layer ini (saat direalisasikan) meliputi:
- Memastikan method Adapter (connect, disconnect, getGroups, send) berjalan mulus.
- Test Mocking validitas payload format API ke lib external.
- Memastikan tidak ada pengiriman terduplikasi bila `JsonWhatsAppMessageStore` mengembalikan `SENT`.

---

## 14. REKOMENDASI OPSI IMPLEMENTASI WHATSAPP

Berikut adalah analisis beberapa library WhatsApp Open Source yang populer di Node.js:

### OPSI 1: Baileys (@whiskeysockets/baileys)
*Library berbasis websocket langsung ke WhatsApp Web API.*

**Kelebihan:**
- Sangat ringan, tidak membutuhkan instance browser (Puppeteer/Chromium) sama sekali.
- Paling populer di ekosistem bot Node.js.
- Fitur lengkap (mentions, button, list, poll, document).
- Kecepatan koneksi dan efisiensi resource RAM sangat baik (cocok untuk VPS/Server kelas bawah).

**Kekurangan:**
- API sering berubah (unstable) bila ada update protokol WhatsApp.
- Rawan terkena banned jika terdeteksi spam, karena menggunakan pure websocket yang bisa dianalisa perilakunya oleh AI WhatsApp.

### OPSI 2: WhatsApp-Web.js (whatsapp-web.js)
*Library berbasis Puppeteer yang menjalankan browser tersembunyi.*

**Kelebihan:**
- Sangat stabil karena mensimulasikan perilaku "user manusia" membuka WA Web.
- API sangat simple, OOP, dan sangat intuitif (`chat.sendMessage()`, `client.getChats()`).
- Relatif lebih aman dari banned dibandingkan websocket library (terlihat seperti akses browser normal).

**Kekurangan:**
- Resource-heavy. Mengkonsumsi RAM yang signifikan (300MB - 500MB) karena menjalankan full Chromium headless.
- Waktu start-up lambat.
- Harus setup package browser dependencies di server Linux (libxss1, libatk1.0, dll).

### OPSI 3: API Resmi (WhatsApp Cloud API)
*Meta / Facebook Cloud API resmi.*

**Kelebihan:**
- 100% legal, mustahil terbanned.
- Skalabilitas tidak terbatas, di-hosting di server Meta.
- Dokumentasi resmi.

**Kekurangan:**
- Menggunakan skema pricing (Gratis 1.000 Service Conversation pertama per bulan).
- Pendaftaran ribet (memerlukan Meta Business Manager, verifikasi bisnis, dan Facebook Page).
- Sulit untuk digunakan secara kasual oleh ketua kelas pribadi karena setup account business API tidak sederhana untuk perorangan.

### KESIMPULAN & REKOMENDASI
Untuk kebutuhan TugasKu yang merupakan **asisten pribadi kelas/dosen** dan diharapkan _Zero Config_ untuk di-*run* oleh ketua kelas, **OPSI 2 (WhatsApp-Web.js)** sangat direkomendasikan jika kestabilan API adalah kunci (dan server RAM memadai).

Namun, bila TugasKu menargetkan _low-resource_ dan _lightweight execution_ di local CLI/Terminal dengan cepat, **OPSI 1 (Baileys)** menjadi opsi yang paling tepat. 

👉 **Rekomendasi Utama: WhatsApp-Web.js (jika dijalankan via server) atau Baileys (jika dijalankan di CLI lokal yang RAM-nya hemat). Karena aplikasi ini akan dijalankan lewat Scheduler tanpa GUI berat, BAILYES seringkali menjadi best-fit modern stack.**
