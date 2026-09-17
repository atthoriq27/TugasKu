export class ReminderEngine {
  constructor() {
    this.reminderReasons = {
      BELUM_POSTTEST: "Posttest",
      FORUM_BELUM_MEMENUHI: "Forum Diskusi"
    };
  }

  getReminderCandidates(studentStatuses) {
    if (!Array.isArray(studentStatuses)) {
      return [];
    }

    const candidates = [];
    const processedNims = new Set();

    for (const student of studentStatuses) {
      if (!student.nim || processedNims.has(student.nim)) {
        continue;
      }

      const reasons = this.getRemindelReasons(student);

      if (reasons.length > 0) {
        candidates.push({
          nim: student.nim,
          nama_mahasiswa: student.nama_mahasiswa,
          reason: reasons
        });
        processedNims.add(student.nim);
      }
    }

    return candidates;
  }

  getRemindelReasons(student) {
    const reasons = [];

    if (student.posttest_status === "BELUM_MENGERJAKAN") {
      reasons.push("BELUM_POSTTEST");
    }

    if (
      student.forum_status === "BELUM_MENGERJAKAN" ||
      student.forum_status === "BELUM_MEMENUHI"
    ) {
      reasons.push("FORUM_BELUM_MEMENUHI");
    }

    return reasons;
  }

  formatReminderReason(reasonCodes) {
    return reasonCodes
      .map(code => this.reminderReasons[code] || code)
      .join(" & ");
  }

  generateReminder(courseMetadata, reminderCandidates, mode = "SIMPLE") {
    if (
      !courseMetadata ||
      !Array.isArray(reminderCandidates) ||
      reminderCandidates.length === 0
    ) {
      return null;
    }

    return {
      type: "STUDENT_REMINDER",
      course_id: courseMetadata.course_id,
      course_name: courseMetadata.course_name,
      meeting: courseMetadata.meeting,
      whatsapp_group: courseMetadata.whatsapp_group,
      mode: mode,
      candidates: reminderCandidates,
      generated_at: new Date().toISOString()
    };
  }

  generateMultipleCourseReminders(coursesList) {
    if (!Array.isArray(coursesList)) {
      return [];
    }

    return coursesList
      .map(course => this.generateReminder(course.metadata, course.candidates, course.mode || "SIMPLE"))
      .filter(reminder => reminder !== null);
  }

  generateMainGroupUpdate(courseReminders) {
    if (!Array.isArray(courseReminders) || courseReminders.length === 0) {
      return null;
    }

    const courses = courseReminders.map(reminder => ({
      course_name: reminder.course_name,
      meeting: reminder.meeting,
      total_reminders: reminder.candidates.length
    }));

    return {
      type: "MAIN_GROUP_UPDATE",
      courses: courses,
      generated_at: new Date().toISOString()
    };
  }
}

export default ReminderEngine;
