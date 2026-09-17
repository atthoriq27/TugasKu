import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MentariBrowserSession {
  constructor({
    sessionDir = null,
    configDir = null
  } = {}) {
    this.sessionDir = sessionDir || path.join(__dirname, "../../data/mentari-session");
    this.configDir = configDir || path.join(__dirname, "../../config");
    this.sessionFilePath = path.join(this.configDir, "session.json");
    this.browserContext = null;
  }

  getSession() {
    if (fs.existsSync(this.sessionFilePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.sessionFilePath, "utf-8"));
        if (data && data.token && this.isTokenValid(data.token)) {
          return data;
        }
      } catch (e) {}
    }

    const envPath = path.join(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      let token = "";
      content.split("\n").forEach(line => {
        if (line.startsWith("MENTARI_TOKEN=")) {
          token = line.replace("MENTARI_TOKEN=", "").trim();
        }
      });
      if (token && this.isTokenValid(token)) {
        return { token, updatedAt: new Date().toISOString() };
      }
    }

    return null;
  }

  isTokenValid(token) {
    if (!token) return false;
    try {
      const parts = token.replace(/^Bearer\s+/i, "").split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      if (payload.exp) {
        const nowSec = Math.floor(Date.now() / 1000);
        return payload.exp > nowSec;
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  saveSession({ token, cookies = [], user = null }) {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();

    if (!user) {
      try {
        const parts = cleanToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          user = {
            id: payload.id,
            username: payload.username,
            fullname: payload.fullname,
            role: payload.role
          };
        }
      } catch (e) {}
    }

    const sessionData = {
      token: cleanToken,
      cookies,
      user,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(this.sessionFilePath, JSON.stringify(sessionData, null, 2), "utf-8");

    const envPath = path.join(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      if (content.includes("MENTARI_TOKEN=")) {
        content = content.replace(/MENTARI_TOKEN=[^\r\n]*/, `MENTARI_TOKEN=${sessionData.token}`);
      } else {
        content += `\nMENTARI_TOKEN=${sessionData.token}\n`;
      }
      fs.writeFileSync(envPath, content, "utf-8");
    }

    return sessionData;
  }

  cleanupLocksAndProcesses() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        const files = ["SingletonLock", "SingletonCookie", "SingletonSocket"];
        files.forEach(f => {
          const p = path.join(this.sessionDir, f);
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch (e) {}
          }
        });

        // Bersihkan folder sesi sementara Playwright yang tertinggal (_temp_*, _login_*, _sub_*)
        const entries = fs.readdirSync(this.sessionDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && (entry.name.startsWith("_temp_") || entry.name.startsWith("_login_") || entry.name.startsWith("_sub_"))) {
            try {
              fs.rmSync(path.join(this.sessionDir, entry.name), { recursive: true, force: true });
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    if (process.platform === "win32") {
      try {
        execSync("powershell -Command \"Get-Process | Where-Object { $_.Path -like '*ms-playwright*' } | Stop-Process -Force -ErrorAction SilentlyContinue\"", {
          stdio: "ignore",
          timeout: 2000
        });
      } catch (e) {}
    }
  }

  async acquireBrowser() {
    if (this.browserContext) {
      try {
        const pages = this.browserContext.pages();
        if (pages.length > 0 && !pages[0].isClosed()) {
          await pages[0].title(); // Memastikan koneksi IPC browser masih aktif
          return this.browserContext;
        } else {
          await this.browserContext.newPage();
          return this.browserContext;
        }
      } catch (e) {
        console.warn("Koneksi browserContext lama terputus, membuka browser baru...");
        this.browserContext = null;
      }
    }

    this.cleanupLocksAndProcesses();

    try {
      this.browserContext = await chromium.launchPersistentContext(this.sessionDir, {
        headless: false,
        args: [
          "--window-position=0,0",
          "--window-size=1024,768",
          "--disable-blink-features=AutomationControlled"
        ]
      });
      return this.browserContext;
    } catch (err) {
      console.warn("Fallback to dedicated temporary context:", err.message);
      this.cleanupLocksAndProcesses();
      const fallbackDir = path.join(this.sessionDir, "_temp_" + Date.now());
      this.browserContext = await chromium.launchPersistentContext(fallbackDir, {
        headless: false,
        args: [
          "--window-position=0,0",
          "--window-size=1024,768",
          "--disable-blink-features=AutomationControlled"
        ]
      });
      return this.browserContext;
    }
  }

  async releaseBrowser() {
    if (this.browserContext) {
      try {
        await this.browserContext.close();
      } catch (e) {}
      this.browserContext = null;
    }
    this.cleanupLocksAndProcesses();
  }

  invalidateSession() {
    try {
      const current = this.getSession();
      if (current && current.updatedAt) {
        const ageSec = (Date.now() - new Date(current.updatedAt).getTime()) / 1000;
        if (ageSec < 60) {
          console.log(`ℹ️ Sesi baru diperbarui (${Math.round(ageSec)} detik lalu). Pembatalan sesi diabaikan.`);
          return;
        }
      }
      if (fs.existsSync(this.sessionFilePath)) {
        fs.unlinkSync(this.sessionFilePath);
        console.log("🗑️  Sesi MENTARI lama/kedaluwarsa telah dihapus.");
      }
    } catch (e) {}

    try {
      const envPath = path.join(__dirname, "../../.env");
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, "utf-8");
        content = content.replace(/MENTARI_TOKEN=[^\r\n]*/, "MENTARI_TOKEN=");
        fs.writeFileSync(envPath, content, "utf-8");
      }
    } catch (e) {}
  }

  resetWindowPlacement() {
    try {
      const prefPath = path.join(this.sessionDir, "Default", "Preferences");
      if (fs.existsSync(prefPath)) {
        const data = JSON.parse(fs.readFileSync(prefPath, "utf-8"));
        if (data.browser && data.browser.window_placement) {
          delete data.browser.window_placement;
          fs.writeFileSync(prefPath, JSON.stringify(data, null, 2));
        }
      }
    } catch (e) {}
  }

  /**
   * Launch dedicated Chromium browser for the user to login.
   */
  async loginInteractively({ force = false } = {}) {
    await this.releaseBrowser();
    this.cleanupLocksAndProcesses();
    this.resetWindowPlacement();

    const oldSession = this.getSession();
    const oldToken = oldSession?.token || null;

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }

    let capturedToken = null;
    let capturedUser = null;
    let isResolved = false;

    let context;
    try {
      context = await chromium.launchPersistentContext(this.sessionDir, {
        headless: false,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--window-position=100,80",
          "--window-size=1280,850"
        ]
      });
    } catch (launchErr) {
      console.warn("Retrying login browser with clean directory:", launchErr.message);
      this.cleanupLocksAndProcesses();
      const cleanDir = path.join(this.sessionDir, "_login_" + Date.now());
      context = await chromium.launchPersistentContext(cleanDir, {
        headless: false,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--window-position=100,80",
          "--window-size=1280,850"
        ]
      });
    }

    return new Promise(async (resolve, reject) => {
      const page = context.pages()[0] || await context.newPage();

      const finishLogin = async (token, source = "deteksi") => {
        if (isResolved) return;

        // Verify token with real request on MENTARI before accepting
        try {
          const isWorking = await page.evaluate(async (tok) => {
            try {
              const r = await fetch("/api/user-course", {
                headers: { "authorization": "Bearer " + tok, "accept": "application/json" }
              });
              return r.ok;
            } catch (e) {
              return false;
            }
          }, token);

          if (!isWorking) {
            return;
          }
        } catch (e) {
          return;
        }

        isResolved = true;

        try {
          const cookies = await context.cookies();
          this.saveSession({ token, cookies, user: capturedUser });
          console.log(`\n🎉 LOGIN BERHASIL TERVERIFIKASI (${source})!`);
          console.log("   Token dan sesi MENTARI telah otomatis tersimpan.");
          console.log("   Browser akan ditutup dalam 2 detik...\n");
          
          setTimeout(async () => {
            try { await context.close(); } catch (e) {}
            this.cleanupLocksAndProcesses();
            resolve(token);
          }, 2000);
        } catch (err) {
          try { await context.close(); } catch (e) {}
          this.cleanupLocksAndProcesses();
          resolve(token);
        }
      };

      // 1. Response listener: captures actual login submission from user
      page.on("response", async (res) => {
        const url = res.url();
        if (url.includes("/api/login") && res.ok()) {
          try {
            const json = await res.json().catch(() => null);
            if (json && json.access && json.access[0]?.token) {
              capturedUser = json.access[0];
              const token = json.access[0].token;
              if (token && token !== oldToken) {
                capturedToken = token;
                await finishLogin(token, "Login Form MENTARI");
              }
            }
          } catch (e) {}
        }
      });

      // 2. Request listener: only for genuine new tokens different from oldToken
      page.on("request", async (req) => {
        const url = req.url();
        const headers = req.headers();
        if (url.includes("mentari.unpam.ac.id") && headers["authorization"]) {
          const authHeader = headers["authorization"];
          if (authHeader.startsWith("Bearer ") && authHeader.length > 50) {
            const token = authHeader.replace(/^Bearer\s+/i, "").trim();
            if (token && token !== oldToken && !capturedToken) {
              capturedToken = token;
              await finishLogin(token, "Bearer Request Header");
            }
          }
        }
      });

      try {
        console.log("🌐 Membuka portal MENTARI UNPAM di jendela browser login...");
        await context.clearCookies().catch(() => {});
        
        // Add init script to remove stale token so Next.js does not get stuck in redirect loops
        await page.addInitScript(() => {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("auth");
          } catch (e) {}
        });

        await page.goto("https://mentari.unpam.ac.id/login", { waitUntil: "domcontentloaded", timeout: 30000 });

        // Auto-detect if login input fields are visible. If blank or blocked by Cloudflare, auto-refresh cleanly once!
        try {
          await page.waitForSelector('input[name="username"], input[type="text"], input[type="password"]', { 
            timeout: 3000, 
            state: "visible" 
          });
        } catch (e) {
          const currentUrl = page.url();
          if (currentUrl.includes("mentari.unpam.ac.id")) {
            console.log("🔄 Memuat ulang halaman login MENTARI agar form langsung tampil...");
            await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
            await page.waitForSelector('input[name="username"], input[type="text"], input[type="password"]', { 
              timeout: 6000, 
              state: "visible" 
            }).catch(() => {});
          }
        }

        const checkInterval = setInterval(async () => {
          if (isResolved) {
            clearInterval(checkInterval);
            return;
          }
          try {
            const currentUrl = page.url();
            // Only check storage if user has navigated past login page (into dashboard / root)
            if (!currentUrl.includes("/login")) {
              const tokenInStorage = await page.evaluate(() => {
                for (let i = 0; i < localStorage.length; i++) {
                  const val = localStorage.getItem(localStorage.key(i));
                  if (val && typeof val === "string" && val.length > 50 && val.includes(".")) {
                    return val;
                  }
                }
                return null;
              }).catch(() => null);

              if (tokenInStorage && tokenInStorage !== oldToken && this.isTokenValid(tokenInStorage)) {
                await finishLogin(tokenInStorage, "Dashboard Redirection");
              }
            }
          } catch (e) {}
        }, 1500);

        setTimeout(() => {
          if (!isResolved) {
            clearInterval(checkInterval);
            context.close().catch(() => {});
            this.cleanupLocksAndProcesses();
            reject(new Error("Waktu tunggu login habis (5 menit). Silakan coba lagi."));
          }
        }, 300000);

      } catch (err) {
        context.close().catch(() => {});
        this.cleanupLocksAndProcesses();
        reject(err);
      }
    });
  }

  /**
   * Universal fetch executed inside Chromium browser session to bypass Cloudflare TLS fingerprinting & WAF.
   */
  async fetchWithBrowser(urlPath, options = {}) {
    const session = this.getSession();
    if (!session || !session.token) {
      const err = new Error("Sesi login MENTARI belum ada atau telah terputus.");
      err.code = "SESSION_EXPIRED";
      throw err;
    }

    // Maximum 2 attempts: 1 normal attempt + 1 auto-recovery attempt if browser was terminated
    for (let attempt = 1; attempt <= 2; attempt++) {
      let browser;
      let targetPage;

      try {
        browser = await this.acquireBrowser();
        targetPage = browser.pages()[0] || await browser.newPage();
      } catch (launchErr) {
        if (attempt === 1) {
          console.warn("Koneksi browser terputus, menginisialisasi ulang browser session...");
          this.cleanupLocksAndProcesses();
          continue;
        }
        const err = new Error(`Gagal membuka browser session: ${launchErr.message}`);
        err.code = "SESSION_EXPIRED";
        throw err;
      }

      try {
        // Ensure page is on mentari domain and Cloudflare challenge is solved
        const currentUrl = targetPage.url();
        const currentTitle = await targetPage.title().catch(() => "");
        const isChallengeActive = currentTitle.includes("Just a moment") || currentTitle.includes("Cloudflare");
        const isBadRoute = currentUrl.includes("/user-course") || currentUrl.includes("/dashboard");

        if (!currentUrl.includes("mentari.unpam.ac.id") || isChallengeActive || isBadRoute) {
          await targetPage.goto("https://mentari.unpam.ac.id/", { 
            waitUntil: "domcontentloaded", 
            timeout: 30000 
          }).catch(() => {});

          // Wait up to 10 seconds if Cloudflare challenge is completing
          const startTime = Date.now();
          while (Date.now() - startTime < 10000) {
            const title = await targetPage.title().catch(() => "");
            if (!title.includes("Just a moment") && !title.includes("Cloudflare")) {
              break;
            }
            await targetPage.waitForTimeout(500);
          }
        }

        let result = await targetPage.evaluate(async ({ path, token, queryTime }) => {
          const fullUrl = path.startsWith("http") 
            ? path 
            : `https://mentari.unpam.ac.id${path.startsWith("/") ? "" : "/"}${path}${path.includes("?") ? "&" : "?"}t=${queryTime}`;

          const res = await fetch(fullUrl, {
            headers: {
              "authorization": "Bearer " + token,
              "accept": "application/json, text/plain, */*"
            }
          });

          const text = await res.text().catch(() => "");
          let data = null;
          try {
            data = JSON.parse(text);
          } catch (e) {}

          return { status: res.status, ok: res.ok, data, text: text.slice(0, 100) };
        }, { path: urlPath, token: session.token, queryTime: Date.now() });

        // If 403 occurred due to Cloudflare interception, reload root to refresh cf_clearance and retry once
        if (result.status === 403 && (result.text.includes("Just a moment") || !result.data)) {
          console.log("⏳ Cloudflare challenge terdeteksi saat fetch. Menyelesaikan clearance...");
          await targetPage.goto("https://mentari.unpam.ac.id/", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
          await targetPage.waitForTimeout(1500);

          result = await targetPage.evaluate(async ({ path, token, queryTime }) => {
            const fullUrl = path.startsWith("http") 
              ? path 
              : `https://mentari.unpam.ac.id${path.startsWith("/") ? "" : "/"}${path}${path.includes("?") ? "&" : "?"}t=${queryTime}`;

            const res = await fetch(fullUrl, {
              headers: {
                "authorization": "Bearer " + token,
                "accept": "application/json, text/plain, */*"
              }
            });

            const data = await res.json().catch(() => null);
            return { status: res.status, ok: res.ok, data };
          }, { path: urlPath, token: session.token, queryTime: Date.now() });
        }

        if (!result.ok) {
          const err = new Error(`MENTARI API error: HTTP ${result.status}`);
          if (result.status === 401 || result.status === 403) {
            err.code = "SESSION_EXPIRED";
            if (result.status === 401) {
              this.invalidateSession();
            }
          }
          throw err;
        }

        return result.data;
      } catch (pageErr) {
        if ((pageErr.message.includes("closed") || pageErr.message.includes("Target page")) && attempt === 1) {
          console.warn("Browser terputus di tengah pemindaian, mencoba ulang otomatis...");
          this.browserContext = null;
          this.cleanupLocksAndProcesses();
          continue;
        }
        throw pageErr;
      }
    }
  }
}

export default MentariBrowserSession;
