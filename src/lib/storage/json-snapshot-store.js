import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonSnapshotStore {
  constructor(dataDir = null) {
    const defaultDataDir = path.join(__dirname, "../../data/snapshots");
    this.dataDir = dataDir || defaultDataDir;
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getSnapshotPath(courseId) {
    const sanitizedId = courseId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.dataDir, `${sanitizedId}.json`);
  }

  async getSnapshot(courseId) {
    const snapshotPath = this.getSnapshotPath(courseId);

    if (!fs.existsSync(snapshotPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(snapshotPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading snapshot for ${courseId}:`, error.message);
      return null;
    }
  }

  async saveSnapshot(courseId, snapshot) {
    const snapshotPath = this.getSnapshotPath(courseId);

    try {
      const data = {
        ...snapshot,
        saved_at: new Date().toISOString()
      };

      fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error(`Error saving snapshot for ${courseId}:`, error.message);
      return false;
    }
  }

  async getAllSnapshots() {
    try {
      const files = fs.readdirSync(this.dataDir);
      const snapshots = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.dataDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          snapshots.push(JSON.parse(content));
        }
      }

      return snapshots;
    } catch (error) {
      console.error("Error reading all snapshots:", error.message);
      return [];
    }
  }

  async deleteSnapshot(courseId) {
    const snapshotPath = this.getSnapshotPath(courseId);

    try {
      if (fs.existsSync(snapshotPath)) {
        fs.unlinkSync(snapshotPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting snapshot for ${courseId}:`, error.message);
      return false;
    }
  }

  async clearAllSnapshots() {
    try {
      const files = fs.readdirSync(this.dataDir);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.dataDir, file);
          fs.unlinkSync(filePath);
        }
      }

      return true;
    } catch (error) {
      console.error("Error clearing snapshots:", error.message);
      return false;
    }
  }
}

export default JsonSnapshotStore;
