export class WhatsAppMessageFormatter {
  // FIX #4: Add field validation helpers
  static validateActivityField(activity) {
    if (!activity) return false;
    return !!(activity.title || activity.type);
  }

  static validateCourseActivityPayload(courseName, week, meeting, activities, deadline) {
    const errors = [];
    
    if (!courseName || courseName.trim() === '') {
      errors.push("courseName is required");
    }
    if (week === null || week === undefined || week < 1 || week > 16) {
      errors.push("week must be between 1-16");
    }
    if (meeting === null || meeting === undefined || meeting < 1) {
      errors.push("meeting must be >= 1");
    }
    if (!Array.isArray(activities) || activities.length === 0) {
      errors.push("activities must be non-empty array");
    }
    if (!deadline || deadline.trim() === '') {
      errors.push("deadline is required");
    }
    
    // Validate each activity
    if (Array.isArray(activities)) {
      activities.forEach((act, i) => {
        if (!act.title && !act.type) {
          errors.push(`activities[${i}] must have title or type`);
        }
      });
    }

    return errors;
  }

  static formatStudentReminderDetail(courseMetadata, candidates) {
    if (!candidates || candidates.length === 0) return null;

    // FIX #4: Validate course metadata fields
    if (!courseMetadata || !courseMetadata.course_name) {
      console.error("[ERROR] formatStudentReminderDetail: missing course_name");
      return null;
    }

    let msg = `*GRUP ${courseMetadata.course_name.toUpperCase()}*\n\n`;
    msg += `List yang belum mengerjakan tugas\n`;
    msg += `Week ${courseMetadata.week || '?'} - Pertemuan ${courseMetadata.meeting || '?'}\n\n`;

    const reasonMap = {
      BELUM_POSTTEST: "Posttest",
      FORUM_BELUM_MEMENUHI: "Forum Diskusi"
    };

    candidates.forEach((student, i) => {
      const reasons = student.reason
        .map(r => reasonMap[r] || r)
        .join(" & ");
      // The @phone mention will be handled by adapter, we provide the string template
      const mentionStr = student.phone ? `@${student.phone}` : student.nama_mahasiswa;
      msg += `${i + 1}. ${mentionStr} - ${reasons}\n`;
    });

    return msg;
  }

  static formatCourseActivityUpdate(courseName, week, meeting, activities, deadline) {
    // FIX #4: Validate required fields before formatting
    const validationErrors = this.validateCourseActivityPayload(
      courseName, 
      week, 
      meeting, 
      activities, 
      deadline
    );

    if (validationErrors.length > 0) {
      console.error("[ERROR] formatCourseActivityUpdate validation failed:");
      validationErrors.forEach(err => console.error(`  - ${err}`));
      return null;
    }

    if (!activities || activities.length === 0) return null;

    let msg = `*UPDATE TUGAS \u2014 ${courseName.toUpperCase()}*\n\n`;
    msg += `Week ${week}\n`;
    msg += `Pertemuan ${meeting}\n\n`;

    activities.forEach(act => {
      // FIX #4: Use title if available, fallback to type, default to "Aktivitas"
      const activityName = act.title || act.type || "Aktivitas";
      msg += `📌 ${activityName}\n`;
      if (act.status) msg += `Status: ${act.status}\n`;
      msg += `Deadline: ${deadline}\n\n`;
    });

    return msg.trim();
  }

  static formatMainGroupUpdate(week, courseUpdates) {
    // FIX #4: Validate main group update payload
    if (!week || week < 1 || week > 16) {
      console.error("[ERROR] formatMainGroupUpdate: week must be 1-16");
      return null;
    }

    if (!courseUpdates || courseUpdates.length === 0) return null;

    let msg = `📢 *UPDATE TUGAS KELAS*\n`;
    msg += `Week ${week}\n\n`;

    courseUpdates.forEach((update, i) => {
      if (!update.course_name) {
        console.warn(`[WARNING] courseUpdate[${i}] missing course_name, skipping`);
        return;
      }

      msg += `${i + 1}. ${update.course_name.toUpperCase()}\n`;
      msg += `   Pertemuan ${update.meeting || '?'}\n`;
      
      if (update.activities && update.activities.length > 0) {
        update.activities.forEach(act => {
          const activityName = act.title || act.type || "Aktivitas";
          msg += `   - ${activityName}\n`;
        });
      } else {
        msg += `   - Tidak ada aktivitas baru\n`;
      }
      
      msg += `   Deadline: ${update.deadline || 'TBD'}\n\n`;
    });

    return msg.trim();
  }
}

export default WhatsAppMessageFormatter;
