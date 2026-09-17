import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WhatsAppGroupMapper {
  constructor(groupsConfigPath = null) {
    const defaultPath = path.join(__dirname, "../../config/whatsapp-groups.json");
    const configPath = groupsConfigPath || defaultPath;

    if (fs.existsSync(configPath)) {
      this.groupsConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
      this.groupsConfig = { main: { name: "KELAS TIF", groupId: null }, courses: {} };
    }

    if (!this.groupsConfig.courses) {
      this.groupsConfig.courses = {};
    }

    this.discoveredGroups = new Map();
  }

  getMainGroupId() {
    return this.groupsConfig.main?.groupId || null;
  }

  getCourseGroupId(courseId) {
    if (!this.groupsConfig.courses || !this.groupsConfig.courses[courseId]) {
      return null;
    }
    return this.groupsConfig.courses[courseId].groupId || null;
  }

  registerDiscoveredGroup(groupId, groupName, groupSubject = null) {
    this.discoveredGroups.set(groupId, {
      id: groupId,
      name: groupName,
      subject: groupSubject,
      discovered_at: new Date().toISOString()
    });
  }

  getDiscoveredGroups() {
    return Array.from(this.discoveredGroups.values());
  }

  isGroupValid(groupId) {
    if (!groupId) return false;
    if (!groupId.includes("@g.us")) {
      return false;
    }
    return this.discoveredGroups.has(groupId);
  }

  resolveGroupId(destination, courseId = null) {
    let groupId = null;

    if (destination === "MAIN_GROUP") {
      groupId = this.getMainGroupId();
    } else if (destination === "COURSE_GROUP" && courseId) {
      groupId = this.getCourseGroupId(courseId);
    }

    if (!groupId) {
      console.warn(`[WARNING] Group ID not configured for ${destination}${courseId ? ` (${courseId})` : ""}`);
      return null;
    }

    if (!this.isGroupValid(groupId)) {
      console.warn(`[WARNING] Group ID ${groupId} not found in discovered groups`);
      return null;
    }

    return groupId;
  }

  suggestMapping(discoveredGroups) {
    const suggestions = [];

    // Exact Match Main Group
    const mainGroupName = this.groupsConfig.main?.name;
    const mainMatch = discoveredGroups.find(g => g.name === mainGroupName);
    if (mainMatch) {
      suggestions.push({
        type: "MAIN_GROUP",
        suggestedGroupId: mainMatch.id,
        suggestedName: mainMatch.name
      });
    }

    // Exact Match Course Groups
    if (this.groupsConfig.courses) {
      for (const [courseId, config] of Object.entries(this.groupsConfig.courses)) {
        const targetName = config.name;
        const courseMatch = discoveredGroups.find(g => g.name === targetName);

        if (courseMatch) {
          suggestions.push({
            type: "COURSE_GROUP",
            courseId,
            suggestedGroupId: courseMatch.id,
            suggestedName: courseMatch.name
          });
        }
      }
    }

    return suggestions;
  }

  exportMapping() {
    return {
      main: this.groupsConfig.main || {},
      courses: this.groupsConfig.courses || {},
      discovered: Array.from(this.discoveredGroups.values())
    };
  }
}

export default WhatsAppGroupMapper;
