import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "telegram.json");

function telegramRequest(token, method, payload = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${token}/${method}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.ok) resolve(json.result);
            else reject(new Error(json.description || "Telegram API error"));
          } catch {
            reject(new Error("Invalid Telegram response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(body);
    req.end();
  });
}

function sendMessage(token, chatId, text, extra = {}) {
  return telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

function getUpdates(token, offset = 0) {
  return telegramRequest(token, "getUpdates", {
    offset,
    timeout: 15,
    allowed_updates: ["message"],
  });
}

function getCurrentSemesterWeek() {
  const settingsPath = path.join(__dirname, "..", "..", "config", "class-settings.json");
  let startStr = "2026-08-31";
  if (fs.existsSync(settingsPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      if (cfg.semester_start_date) startStr = cfg.semester_start_date;
    } catch {}
  }
  const start = new Date(startStr + "T00:00:00");
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  if (diffTime < 0) return "1";

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  const offsetToWeek = {
    0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7",
    7: "UTS", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13", 14: "14", 15: "15",
    16: "UAS", 17: "16"
  };

  return offsetToWeek[diffWeeks] || (diffWeeks > 17 ? "16" : "1");
}

export class TelegramBot {
  constructor({ scanAllFn, sessionManager, contactManager }) {
    this.scanAll = scanAllFn;
    this.sessionMgr = sessionManager;
    this.contactMgr = contactManager;
    this._polling = false;
    this._offset = 0;
    this._pollTimer = null;
    this._cronTimer = null;
    this._activeWeek = getCurrentSemesterWeek();
  }

  getConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      } catch {}
    }
    return { bot_token: "", chat_id: "", bot_polling_enabled: false };
  }

  get token() {
    return (this.getConfig().bot_token || "").trim();
  }

  get chatId() {
    return String(this.getConfig().chat_id || "").trim();
  }

  isAuthorized(fromChatId) {
    return String(fromChatId) === this.chatId;
  }

  start() {
    if (this._polling) return;
    if (!this.token || !this.chatId) {
      console.warn("[TelegramBot] Token atau Chat ID belum diatur.");
      return;
    }
    console.log("[TelegramBot] Polling dimulai...");
    this._polling = true;
    this._poll();
    this._startCron();
  }

  stop() {
    this._polling = false;
    if (this._pollTimer) clearTimeout(this._pollTimer);
    if (this._cronTimer) clearTimeout(this._cronTimer);
    console.log("[TelegramBot] Polling dihentikan.");
  }

  isRunning() {
    return this._polling;
  }

  async _poll() {
    if (!this._polling) return;
    try {
      const updates = await getUpdates(this.token, this._offset);
      for (const update of updates || []) {
        this._offset = update.update_id + 1;
        if (update.message) await this._handleMessage(update.message);
      }
    } catch (err) {
      console.error("[TelegramBot] Poll error:", err.message);
    }
    if (this._polling) {
      this._pollTimer = setTimeout(() => this._poll(), 1000);
    }
  }

  async _handleMessage(msg) {
    const chatId = msg.chat?.id;
    const text = (msg.text || "").trim();
    const command = text.split(" ")[0].toLowerCase().replace(/@\w+$/, "");
    const args = text.split(" ").slice(1);

    if (!this.isAuthorized(chatId)) {
      await sendMessage(this.token, chatId, "Akses ditolak. Bot ini hanya untuk komti kelas 05TPLE003.");
      return;
    }

    switch (command) {
      case "/start":
      case "/help":
        await this._cmdHelp(chatId);
        break;
      case "/status":
        await this._cmdStatus(chatId);
        break;
      case "/scan_all":
      case "/scanall":
        await this._cmdScanAll(chatId);
        break;
      case "/pekan":
        await this._cmdSetPekan(chatId, args[0]);
        break;
      default:
        await sendMessage(
          this.token,
          chatId,
          `Perintah tidak dikenal: <code>${command}</code>\n\nKirim /help untuk daftar perintah.`
        );
    }
  }

  async _cmdHelp(chatId) {
    await sendMessage(
      this.token,
      chatId,
      `<b>TugasKu Bot — 05TPLE003</b>\n\n` +
      `/scan_all — Scan semua matkul daring pekan ini\n` +
      `/status — Cek status sesi MENTARI\n` +
      `/pekan [N] — Ganti pekan aktif (contoh: /pekan 2)\n` +
      `/help — Tampilkan pesan ini\n\n` +
      `<i>Pekan aktif: ${this._activeWeek}</i>`
    );
  }

  async _cmdStatus(chatId) {
    try {
      const session = this.sessionMgr.getSession();
      if (session?.token) {
        const user = session.user?.fullname || "Atthoriq";
        const updAt = session.updatedAt
          ? new Date(session.updatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"
          : "-";
        await sendMessage(
          this.token,
          chatId,
          `Sesi MENTARI <b>aktif</b>\nAkun: ${user}\nUpdate: ${updAt}`
        );
      } else {
        await sendMessage(
          this.token,
          chatId,
          `Sesi MENTARI <b>tidak aktif</b>\n\nJalankan <code>npm run login</code> di terminal untuk login ulang.`
        );
      }
    } catch (err) {
      await sendMessage(this.token, chatId, `Gagal cek status: ${err.message}`);
    }
  }

  async _cmdSetPekan(chatId, val) {
    const n = parseInt(val, 10);
    if (!val || isNaN(n)) {
      await sendMessage(this.token, chatId, `Format salah. Gunakan: <code>/pekan 2</code>`);
      return;
    }
    this._activeWeek = val;
    await sendMessage(this.token, chatId, `Pekan aktif diubah ke <b>Pekan ${val}</b>.`);
  }

  async _cmdScanAll(chatId) {
    await sendMessage(
      this.token,
      chatId,
      `Memindai semua mata kuliah pekan ${this._activeWeek}...\n<i>Proses ini 1-2 menit, mohon tunggu.</i>`
    );
    try {
      const results = await this.scanAll(this._activeWeek);
      const text = this._formatScanAllResult(results, this._activeWeek);
      const chunks = this._splitMessage(text, 4096);
      for (const chunk of chunks) {
        await sendMessage(this.token, chatId, chunk);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      await sendMessage(this.token, chatId, `Gagal scan: ${err.message}`);
    }
  }

  _formatScanAllResult(results, weekVal) {
    const WEEK_NAMES = {
      "1": "Pekan 1 (31 Agt – 5 Sep 2026)",
      "2": "Pekan 2",
      "3": "Pekan 3",
      "4": "Pekan 4",
      "5": "Pekan 5",
      "6": "Pekan 6",
      "7": "Pekan 7",
      "UTS": "Pekan UTS",
      "8": "Pekan 8",
      "9": "Pekan 9",
      "10": "Pekan 10",
      "11": "Pekan 11",
      "12": "Pekan 12",
      "13": "Pekan 13",
      "14": "Pekan 14",
      "15": "Pekan 15",
      "UAS": "Pekan UAS",
      "16": "Pekan 16",
    };
    const weekLabel = WEEK_NAMES[weekVal] || `Pekan ${weekVal}`;

    let text = `<b>REKAP TUGAS MENTARI — 05TPLE003</b>\n<i>${weekLabel}</i>\n\n`;

    const fordisAktif = [];
    const fordisBlm = [];
    const luring = results.filter((r) => r.isLuring && !r.isDaring && !r.isKombinasi);

    results
      .filter((r) => r.isDaring || r.isKombinasi || (r.scannedMeetings && r.scannedMeetings.length > 0))
      .forEach((res) => {
        const fa = (res.scannedMeetings || []).filter((m) => m.forum?.available);
        const fb = (res.scannedMeetings || []).filter((m) => !m.forum?.available);
        if (fa.length > 0) fordisAktif.push({ ...res, activeMeetings: fa });
        if (fb.length > 0) fordisBlm.push(res);
      });

    if (fordisAktif.length === 0 && fordisBlm.length === 0 && luring.length === 0) {
      text += `Belum ada tagihan tugas di MENTARI pekan ini.\n\n`;
    } else {
      fordisAktif.forEach((res, i) => {
        const name = res.mataKuliah || "Mata Kuliah";
        const sks = res.sks || 2;
        text += `<blockquote>${name} (${sks} SKS)</blockquote>\n`;
        text += `<b>Deadline: Jumat, 23:59 WIB</b>\n`;
        res.activeMeetings.forEach((m) => {
          const pNum = m.meetingNum || "1";
          const forum = m.forum;
          const post = m.posttest;
          const asg = m.assignment;
          const forumTxt =
            (forum.needForumStudents?.length || 0) > 0
              ? `${forum.needForumStudents.length} Mahasiswa belum`
              : `Semua Mahasiswa selesai ✅`;
          const postTxt = post?.available
            ? post.pendingCount > 0
              ? `${post.pendingCount} Mahasiswa belum`
              : `Semua Mahasiswa selesai ✅`
            : `Belum dibuka dosen`;
          text += `  • <b>Pertemuan ${pNum}:</b>\n`;
          text += `  - Fordis: ${forumTxt}\n`;
          if (asg?.available) {
            if (asg.is_private) {
              text += `  - Penugasan Terstruktur: Cek portal MENTARI masing-masing ⚠️\n`;
            } else if (asg.pendingCount > 0) {
              text += `  - Penugasan Terstruktur: ${asg.pendingCount} Mahasiswa belum\n`;
            }
          }
          text += `  - Posttest: ${postTxt}\n`;
        });
        text += "\n";
      });

      if (fordisBlm.length > 0) {
        text += `<b>Fordis Belum Dibuka Dosen:</b>\n`;
        fordisBlm.forEach((r) => {
          text += `<blockquote>${r.mataKuliah}</blockquote>\n`;
        });
        text += "\n";
      }
    }

    text += `⚠️ <b>Alur Absensi Valid:</b>\nFordis (min 2x) ➔ Posttest ➔ Kuesioner`;
    return text;
  }

  _splitMessage(text, maxLen) {
    const chunks = [];
    while (text.length > 0) {
      if (text.length <= maxLen) {
        chunks.push(text);
        break;
      }
      let cut = text.lastIndexOf("\n", maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(text.slice(0, cut));
      text = text.slice(cut).trimStart();
    }
    return chunks;
  }

  _startCron() {
    this._scheduleCron();
  }

  _msUntilNextTrigger() {
    const now = new Date();
    const jkt = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const day = jkt.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const h = jkt.getHours(),
      m = jkt.getMinutes(),
      s = jkt.getSeconds();
    const targets = [9, 19];

    if (!isWeekday) {
      const daysUntilMon = (8 - day) % 7 || 7;
      return daysUntilMon * 86400000 - h * 3600000 - m * 60000 - s * 1000 + 9 * 3600000;
    }

    for (const t of targets) {
      if (h < t) return (t - h) * 3600000 - m * 60000 - s * 1000;
      if (h === t && m === 0 && s < 5) return 0;
    }

    const nextDay = day === 5 ? 3 : 1;
    return nextDay * 86400000 - h * 3600000 - m * 60000 - s * 1000 + 9 * 3600000;
  }

  _scheduleCron() {
    if (!this._polling) return;
    const ms = this._msUntilNextTrigger();
    if (ms === 0) {
      this._runAutoScan().catch(console.error);
      this._cronTimer = setTimeout(() => this._scheduleCron(), 60000);
    } else {
      this._cronTimer = setTimeout(() => {
        this._scheduleCron();
      }, Math.min(ms, 60000));
    }
  }

  async _runAutoScan() {
    if (!this.token || !this.chatId) return;
    console.log("[TelegramBot] Auto-scan...");
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    try {
      await sendMessage(
        this.token,
        this.chatId,
        `<b>AUTO-SCAN TERJADWAL</b>\n<i>${now} WIB</i>\n\nMemindai semua mata kuliah pekan ${this._activeWeek}...`
      );
      const results = await this.scanAll(this._activeWeek);
      const text = this._formatScanAllResult(results, this._activeWeek);
      const chunks = this._splitMessage(text, 4096);
      for (const chunk of chunks) {
        await sendMessage(this.token, this.chatId, chunk);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      await sendMessage(this.token, this.chatId, `Auto-scan gagal: ${err.message}`).catch(() => {});
    }
  }

  async triggerScanAll(weekVal) {
    if (weekVal) this._activeWeek = weekVal;
    await this._runAutoScan();
  }
}