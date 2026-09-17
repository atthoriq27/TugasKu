import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonWhatsAppMessageStore {
  constructor(dataDir = null) {
    const defaultDataDir = path.join(__dirname, "../../data/whatsapp");
    this.dataDir = dataDir || defaultDataDir;
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.messageFile = path.join(this.dataDir, "messages.json");
    this.ensureMessageFile();
  }

  ensureMessageFile() {
    if (!fs.existsSync(this.messageFile)) {
      fs.writeFileSync(this.messageFile, JSON.stringify([], null, 2), "utf-8");
    }
  }

  async saveMessage(messageState) {
    try {
      const messages = this.readMessages();
      
      const existingIndex = messages.findIndex(m => m.unique_key === messageState.unique_key);
      if (existingIndex >= 0) {
        messages[existingIndex] = { ...messages[existingIndex], ...messageState, updated_at: new Date().toISOString() };
      } else {
        messages.push({ ...messageState, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }

      fs.writeFileSync(this.messageFile, JSON.stringify(messages, null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error saving WhatsApp message state:", error.message);
      return false;
    }
  }

  async getMessage(uniqueKey) {
    try {
      const messages = this.readMessages();
      return messages.find(m => m.unique_key === uniqueKey) || null;
    } catch (error) {
      console.error("Error getting WhatsApp message:", error.message);
      return null;
    }
  }

  async isMessageSent(uniqueKey) {
    const msg = await this.getMessage(uniqueKey);
    return msg !== null && msg.status === "SENT";
  }

  async clear() {
    try {
      fs.writeFileSync(this.messageFile, JSON.stringify([], null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error clearing WhatsApp messages:", error.message);
      return false;
    }
  }

  readMessages() {
    const content = fs.readFileSync(this.messageFile, "utf-8");
    return JSON.parse(content);
  }
}

export default JsonWhatsAppMessageStore;
