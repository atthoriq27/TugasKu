import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTACTS_FILE = path.join(__dirname, "..", "..", "config", "contacts.json");

export class ContactManager {
  constructor(filePath = CONTACTS_FILE) {
    this.filePath = filePath;
  }

  getContacts() {
    if (fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } catch (e) {}
    }
    return {};
  }

  saveContacts(contacts) {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(contacts, null, 2), "utf-8");
    return contacts;
  }

  normalizePhone(phone) {
    if (!phone) return "";
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    } else if (cleaned.startsWith("8")) {
      cleaned = "62" + cleaned;
    }
    return cleaned;
  }

  isMainStudent(nim) {
    const contacts = this.getContacts();
    const c = contacts[nim];
    // If not in contacts yet or type is REVISI, return false
    if (!c) return false;
    return c.type !== "REVISI";
  }

  ensureContact(nim, name) {
    if (this.isExcluded(nim)) {
      return null;
    }
    const contacts = this.getContacts();
    if (!contacts[nim]) {
      // Deteksi Cerdas Angkatan UNPAM:
      // NIM diawali 241011 / 24 menandakan angkatan 2024 kelas utama.
      // Angkatan luar (20, 21, 22, 23) otomatis ditandai sebagai REVISI.
      const isCurrentBatch = String(nim).startsWith("241011") || String(nim).startsWith("24");
      contacts[nim] = {
        nim,
        nama: name || nim,
        phone: "",
        type: isCurrentBatch ? "UTAMA" : "REVISI"
      };
      this.saveContacts(contacts);
    }
    return contacts[nim];
  }

  updateContact(nim, data) {
    const contacts = this.getContacts();
    const existing = contacts[nim] || { nim };
    contacts[nim] = {
      ...existing,
      ...data,
      phone: this.normalizePhone(data.phone || existing.phone || ""),
      type: data.type || existing.type || "UTAMA"
    };
    this.saveContacts(contacts);
    return contacts[nim];
  }

  toggleType(nim) {
    const contacts = this.getContacts();
    if (contacts[nim]) {
      contacts[nim].type = contacts[nim].type === "REVISI" ? "UTAMA" : "REVISI";
      this.saveContacts(contacts);
      return contacts[nim];
    }
    return null;
  }

  getExcludedNims() {
    try {
      const p = path.join(__dirname, "..", "..", "config", "class-settings.json");
      if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, "utf-8"));
        return Array.isArray(d.excluded_nims) ? d.excluded_nims : [];
      }
    } catch (e) {}
    return [];
  }

  isExcluded(nim) {
    const list = this.getExcludedNims();
    return list.includes(String(nim));
  }

  excludeStudent(nim) {
    const p = path.join(__dirname, "..", "..", "config", "class-settings.json");
    try {
      let d = {};
      if (fs.existsSync(p)) {
        d = JSON.parse(fs.readFileSync(p, "utf-8"));
      }
      if (!Array.isArray(d.excluded_nims)) d.excluded_nims = [];
      if (!d.excluded_nims.includes(String(nim))) {
        d.excluded_nims.push(String(nim));
        fs.writeFileSync(p, JSON.stringify(d, null, 2), "utf-8");
      }
    } catch (e) {}

    // Hapus juga dari contacts.json
    this.deleteContact(nim);
    return true;
  }

  restoreStudent(nim, nama = "") {
    const p = path.join(__dirname, "..", "..", "config", "class-settings.json");
    try {
      if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (Array.isArray(d.excluded_nims)) {
          d.excluded_nims = d.excluded_nims.filter(n => n !== String(nim));
          fs.writeFileSync(p, JSON.stringify(d, null, 2), "utf-8");
        }
      }
    } catch (e) {}

    // Daftarkan kembali ke contacts
    this.ensureContact(nim, nama);
    return true;
  }

  deleteContact(nim) {
    const contacts = this.getContacts();
    if (contacts[nim]) {
      delete contacts[nim];
      this.saveContacts(contacts);
      return true;
    }
    return false;
  }

  formatMention(nim, fallbackName, options = {}) {
    const contacts = this.getContacts();
    const c = contacts[nim];
    const name = fallbackName || c?.nama || nim;
    const isRevisi = c ? c.type === "REVISI" : !this.isMainStudent(nim);

    let prefix = "";
    if (isRevisi && options.showRevisiTag !== false) {
      prefix = "[Revisi] ";
    }

    const format = options.mentionFormat || this.mentionFormat || "phone_name";

    if (format === "name_only") {
      return `${prefix}@${name}`;
    }
    if (format === "clean_name") {
      return `${prefix}${name}`;
    }

    if (c && c.phone) {
      return `${prefix}@${c.phone} (${name})`;
    }
    return `${prefix}${name}`;
  }
}
