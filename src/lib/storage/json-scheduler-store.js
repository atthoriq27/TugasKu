import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class JsonSchedulerStore {
  constructor(dataDir = null) {
    const defaultDataDir = path.join(__dirname, "../../data/scheduler");
    this.dataDir = dataDir || defaultDataDir;
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.jobFile = path.join(this.dataDir, "jobs.json");
    this.ensureJobFile();
  }

  ensureJobFile() {
    if (!fs.existsSync(this.jobFile)) {
      fs.writeFileSync(this.jobFile, JSON.stringify([], null, 2), "utf-8");
    }
  }

  async appendJob(job) {
    try {
      const jobs = this.readJobs();
      jobs.push(job);
      fs.writeFileSync(this.jobFile, JSON.stringify(jobs, null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error appending job:", error.message);
      return false;
    }
  }

  async getAll() {
    try {
      return this.readJobs();
    } catch (error) {
      console.error("Error reading jobs:", error.message);
      return [];
    }
  }

  async getByType(jobType) {
    try {
      const jobs = this.readJobs();
      return jobs.filter(job => job.type === jobType);
    } catch (error) {
      console.error("Error filtering by type:", error.message);
      return [];
    }
  }

  async getByStatus(status) {
    try {
      const jobs = this.readJobs();
      return jobs.filter(job => job.status === status);
    } catch (error) {
      console.error("Error filtering by status:", error.message);
      return [];
    }
  }

  async getByCourse(courseId) {
    try {
      const jobs = this.readJobs();
      return jobs.filter(job => job.course_id === courseId);
    } catch (error) {
      console.error("Error filtering by course:", error.message);
      return [];
    }
  }

  async getByUniqueKey(uniqueKey) {
    try {
      const jobs = this.readJobs();
      return jobs.find(job => job.unique_key === uniqueKey) || null;
    } catch (error) {
      console.error("Error finding by unique key:", error.message);
      return null;
    }
  }

  async clear() {
    try {
      fs.writeFileSync(this.jobFile, JSON.stringify([], null, 2), "utf-8");
      return true;
    } catch (error) {
      console.error("Error clearing jobs:", error.message);
      return false;
    }
  }

  readJobs() {
    const content = fs.readFileSync(this.jobFile, "utf-8");
    return JSON.parse(content);
  }
}

export default JsonSchedulerStore;
