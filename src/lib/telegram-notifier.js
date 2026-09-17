import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "telegram.json");

export class TelegramNotifier {
  constructor(options = {}) {
    this.configPath = options.configPath || CONFIG_PATH;
  }

  getConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
      } catch (e) {}
    }
    return {
      bot_token: process.env.TELEGRAM_BOT_TOKEN || "",
      chat_id: process.env.TELEGRAM_CHAT_ID || "",
      auto_notify_enabled: false,
      notify_time: "18:00",
      days: ["Thu", "Sat"]
    };
  }

  saveConfig(newConfig) {
    const current = this.getConfig();
    const merged = { ...current, ...newConfig };
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  }

  async sendMessage(text, options = {}) {
    const config = this.getConfig();
    const token = (options.bot_token || config.bot_token || "").trim();
    const chatId = (options.chat_id || config.chat_id || "").trim();
    const parseMode = options.parse_mode || "HTML";

    if (!token) {
      throw new Error("Telegram Bot Token belum diatur.");
    }
    if (!chatId) {
      throw new Error("Telegram Chat ID belum diatur.");
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          port: 443,
          path: `/bot${token}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          },
          timeout: 10000
        },
        (res) => {
          let body = "";
          res.on("data", chunk => body += chunk);
          res.on("end", () => {
            try {
              const data = JSON.parse(body);
              if (data.ok) {
                resolve({ success: true, result: data.result });
              } else {
                reject(new Error(data.description || "Gagal mengirim pesan Telegram"));
              }
            } catch (err) {
              reject(new Error("Response dari Telegram tidak valid"));
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Koneksi ke Telegram API timeout"));
      });

      req.write(payload);
      req.end();
    });
  }

  async sendTestMessage(token, chatId) {
    const testMsg = `<b>🔔 TES NOTIFIKASI TUGASKU</b>\n\n` +
      `Halo Komti! Bot Telegram TugasKu berhasil terhubung.\n` +
      `Waktu Server: <i>${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</i>\n\n` +
      `Sistem siap mengirimkan update tagihan tugas MENTARI secara otomatis! 🚀`;

    return this.sendMessage(testMsg, {
      bot_token: token,
      chat_id: chatId,
      parse_mode: "HTML"
    });
  }
}
