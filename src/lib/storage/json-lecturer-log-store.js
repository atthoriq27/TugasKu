import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonLecturerLogStore {
  constructor(dataDir = null) {
    const defaultDataDir = path.join(__dirname, "../../data/logs");
    this.dataDir = dataDir || defaultDataDir;
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.logFile = path.join(this.dataDir, "lecturer-activity.json");
    this.ensureLogFile();
  }

  ensureLogFile() {
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, JSON.stringify([], null, 2), "utf-8");
    }
  }

  async append(event) {
    try {
      const logs = this.readLogs();
      logs.push(event);
      fs.writeFileSync(this.logFile, JSON.stringify(logs, null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error appending to activity log:", error.message);
      return false;
    }
  }

  async getAll() {
    try {
      return this.readLogs();
    } catch (error) {
      console.error("Error reading activity log:", error.message);
      return [];
    }
  }

  async getByCourse(courseId) {
    try {
      const logs = this.readLogs();
      return logs.filter(log => log.course_id === courseId);
    } catch (error) {
      console.error("Error filtering by course:", error.message);
      return [];
    }
  }

  async getByDate(date) {
    try {
      const logs = this.readLogs();
      const targetDate = new Date(date).toDateString();
      return logs.filter(log => {
        const logDate = new Date(log.timestamp).toDateString();
        return logDate === targetDate;
      });
    } catch (error) {
      console.error("Error filtering by date:", error.message);
      return [];
    }
  }

  async getByMeeting(courseId, meeting) {
    try {
      const logs = this.readLogs();
      return logs.filter(log => log.course_id === courseId && log.meeting === meeting);
    } catch (error) {
      console.error("Error filtering by meeting:", error.message);
      return [];
    }
  }

  async getCourseAndMeeting(courseId, meeting) {
    return this.getByMeeting(courseId, meeting);
  }

  async clear() {
    try {
      fs.writeFileSync(this.logFile, JSON.stringify([], null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error clearing activity log:", error.message);
      return false;
    }
  }

  readLogs() {
    const content = fs.readFileSync(this.logFile, "utf-8");
    return JSON.parse(content);
  }
}

export default JsonLecturerLogStore;
