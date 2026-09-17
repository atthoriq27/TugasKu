import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WhatsAppSessionManager {
  constructor(sessionDir = null) {
    this.sessionDir = sessionDir || path.join(__dirname, "../../data/wa-session");
    this.sessionFile = path.join(this.sessionDir, "session.json");
    this.metadataFile = path.join(this.sessionDir, "metadata.json");
    
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Check if valid session exists and is not expired
   */
  hasValidSession() {
    if (!fs.existsSync(this.sessionFile)) {
      return false;
    }

    try {
      const metadata = this.readMetadata();
      if (!metadata || !metadata.created_at) {
        return false;
      }

      // Session valid for 30 days
      const sessionAge = Date.now() - new Date(metadata.created_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      return sessionAge < thirtyDaysMs;
    } catch (error) {
      console.error("Error checking session validity:", error.message);
      return false;
    }
  }

  /**
   * Save session data from Playwright context
   */
  async saveSession(sessionData) {
    try {
      // Save session data
      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(sessionData, null, 2),
        "utf-8"
      );

      // Save metadata
      const metadata = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        session_version: "1.0",
        wa_account: sessionData?.wa_account || null
      };

      fs.writeFileSync(
        this.metadataFile,
        JSON.stringify(metadata, null, 2),
        "utf-8"
      );

      console.log(`? Session saved to ${this.sessionFile}`);
      return true;
    } catch (error) {
      console.error("Error saving session:", error.message);
      return false;
    }
  }

  /**
   * Restore session data
   */
  getSession() {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        return null;
      }
      const content = fs.readFileSync(this.sessionFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error("Error reading session:", error.message);
      return null;
    }
  }

  /**
   * Read session metadata
   */
  readMetadata() {
    try {
      if (!fs.existsSync(this.metadataFile)) {
        return null;
      }
      const content = fs.readFileSync(this.metadataFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error("Error reading metadata:", error.message);
      return null;
    }
  }

  /**
   * Clear session (logout)
   */
  clearSession() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
      if (fs.existsSync(this.metadataFile)) {
        fs.unlinkSync(this.metadataFile);
      }
      console.log("? Session cleared");
      return true;
    } catch (error) {
      console.error("Error clearing session:", error.message);
      return false;
    }
  }

  /**
   * Display QR code in terminal (for Playwright headless context)
   */
  displayQRCode(qrCodeDataUrl) {
    console.log("\n" + "=".repeat(60));
    console.log("?? WHATSAPP LOGIN REQUIRED");
    console.log("=".repeat(60));
    console.log("\nScan QR code di bawah ini dengan WhatsApp mobile:");
    console.log("\n" + qrCodeDataUrl);
    console.log("\n" + "=".repeat(60) + "\n");
  }

  /**
   * Get session directory for file storage
   */
  getSessionDirectory() {
    return this.sessionDir;
  }

  /**
   * Get session file path
   */
  getSessionFilePath() {
    return this.sessionFile;
  }
}

export default WhatsAppSessionManager;
