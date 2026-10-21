const { app, BrowserWindow, shell, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { fork } = require("child_process");

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3000;
const SERVER_HOST = "127.0.0.1";
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Setup user data directories (safe and persistent across updates)
function setupUserDataDirectories() {
  const userDataPath = app.getPath("userData");
  const configDir = path.join(userDataPath, "config");
  const dataDir = path.join(userDataPath, "data");

  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Copy initial default configs if missing
  const templateConfigDir = path.join(__dirname, "..", "config");
  if (fs.existsSync(templateConfigDir)) {
    const filesToCopy = ["class-settings.json", "schedule.json", "courses.json"];
    for (const f of filesToCopy) {
      const src = path.join(templateConfigDir, f);
      const dest = path.join(configDir, f);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.copyFileSync(src, dest);
        } catch (e) {
          console.warn(`[Electron] Gagal menyalin template ${f}:`, e.message);
        }
      }
    }
  }

  return { configDir, dataDir };
}

function checkServerReady(url, maxRetries = 35, delayMs = 300) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      const req = http.get(`${url}/api/version`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on("error", () => retry());
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        resolve(false);
      } else {
        setTimeout(check, delayMs);
      }
    };

    check();
  });
}

function startBackendServer() {
  return new Promise(async (resolve) => {
    // 1. Check if server is already running on port 3000
    const alreadyRunning = await checkServerReady(SERVER_URL, 2, 200);
    if (alreadyRunning) {
      console.log("[Electron] Server TugasKu sudah aktif di", SERVER_URL);
      return resolve(true);
    }

    const { configDir, dataDir } = setupUserDataDirectories();
    const serverScript = path.join(__dirname, "..", "server.js");
    console.log("[Electron] Memulai server TugasKu:", serverScript);

    serverProcess = fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: String(SERVER_PORT),
        HOST: SERVER_HOST,
        TUGASKU_CONFIG_DIR: configDir,
        TUGASKU_DATA_DIR: dataDir,
        ELECTRON_RUN_AS_NODE: "1"
      },
      stdio: "inherit"
    });

    serverProcess.on("error", (err) => {
      console.error("[Electron] Gagal memulai proses backend:", err);
    });

    serverProcess.on("exit", (code, signal) => {
      console.log(`[Electron] Backend server berhenti (code: ${code}, signal: ${signal})`);
      serverProcess = null;
    });

    const isReady = await checkServerReady(SERVER_URL, 40, 300);
    resolve(isReady);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    title: "TugasKu — Dashboard LMS MENTARI UNPAM",
    backgroundColor: "#0b0f19",
    autoHideMenuBar: true,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);

  // External links open in user's real browser (WhatsApp, Telegram, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const ready = await startBackendServer();
    if (!ready) {
      dialog.showErrorBox(
        "Gagal Memulai TugasKu",
        "Server backend tidak merespons dalam waktu 12 detik. Pastikan port 3000 tidak terblokir oleh aplikasi lain."
      );
    }
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("will-quit", () => {
    if (serverProcess) {
      try {
        serverProcess.kill("SIGINT");
      } catch (e) {}
    }
  });
}
