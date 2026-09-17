import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WhatsAppMessageFormatter from "./whatsapp-message-formatter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WhatsAppMessageRouter {
  constructor(groupsConfigPath = null, studentsConfigPath = null) {
    // FIX #1: Standardize to whatsapp-groups.json (consistent with WhatsAppGroupMapper)
    const defaultGroupsPath = path.join(__dirname, "../../config/whatsapp-groups.json");
    const defaultStudentsPath = path.join(__dirname, "../../config/students.json");

    if (fs.existsSync(groupsConfigPath || defaultGroupsPath)) {
      this.groupsConfig = JSON.parse(fs.readFileSync(groupsConfigPath || defaultGroupsPath, "utf-8"));
    } else {
      // Fallback: support both old (mainGroup) and new (main) format
      this.groupsConfig = { 
        main: { name: "KELAS TIF", groupId: null }, 
        courses: {} 
      };
    }

    if (fs.existsSync(studentsConfigPath || defaultStudentsPath)) {
      this.studentsConfig = JSON.parse(fs.readFileSync(studentsConfigPath || defaultStudentsPath, "utf-8"));
    } else {
      this.studentsConfig = [];
    }
  }

  getCourseGroupId(courseId) {
    if (this.groupsConfig.courses && this.groupsConfig.courses[courseId]) {
      return this.groupsConfig.courses[courseId].groupId;
    }
    return null;
  }

  getMainGroupId() {
    if (this.groupsConfig.main) {
      return this.groupsConfig.main.groupId;
    }
    return null;
  }

  getStudentContact(nim) {
    const student = this.studentsConfig.find(s => s.nim === nim);
    if (!student) return null;
    return student.phone;
  }

  routeReminder(payload) {
    const courseId = payload.course_id;
    const groupId = this.getCourseGroupId(courseId);

    // Filter posttest / forum reminder logic is done before calling router
    // This router only processes the mapped output
    
    // Inject phone to candidates
    const mappedCandidates = payload.candidates.map(c => {
      const phone = this.getStudentContact(c.nim);
      if (!phone) {
        console.warn(`[WARNING] Nomor WhatsApp tidak ditemukan untuk NIM: ${c.nim}`);
      }
      return {
        ...c,
        phone: phone || null
      };
    });

    const messageText = WhatsAppMessageFormatter.formatStudentReminderDetail(
      payload, 
      mappedCandidates
    );

    if (!messageText) return null;

    return {
      destination: "COURSE_GROUP",
      course_id: courseId,
      group_id: groupId,
      message_type: "STUDENT_REMINDER",
      message: messageText,
      mentions: this.extractMentions(mappedCandidates)
    };
  }

  routeCourseActivityUpdate(payload) {
    const courseId = payload.course_id;
    const groupId = this.getCourseGroupId(courseId);
    
    const messageText = WhatsAppMessageFormatter.formatCourseActivityUpdate(
      payload.course_name,
      payload.week,
      payload.meeting,
      payload.activities,
      payload.deadline
    );

    if (!messageText) return null;

    return {
      destination: "COURSE_GROUP",
      course_id: courseId,
      group_id: groupId,
      message_type: "COURSE_ACTIVITY_UPDATE",
      message: messageText,
      mentions: []
    };
  }

  routeMainGroupActivityUpdate(week, payloads) {
    if (!payloads || payloads.length === 0) return null;
    
    const groupId = this.getMainGroupId();
    
    const messageText = WhatsAppMessageFormatter.formatMainGroupUpdate(week, payloads);

    if (!messageText) return null;

    return {
      destination: "MAIN_GROUP",
      course_id: "MULTI",
      group_id: groupId,
      message_type: "MAIN_GROUP_ACTIVITY_UPDATE",
      message: messageText,
      mentions: []
    };
  }

  extractMentions(candidates) {
    if (!candidates) return [];
    return candidates
      .filter(c => c.phone !== null)
      .map(c => ({
        nim: c.nim,
        displayName: c.nama_mahasiswa || c.nama,
        phone: c.phone,
        mention: true
      }));
  }
}

export default WhatsAppMessageRouter;
