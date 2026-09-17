export class MessageGenerator {
  static generatePosttestReminder(report) {
    const missing = report.filter(r => r.posttest_status === 'BELUM_MENGERJAKAN');
    if (missing.length === 0) return '✓ Semua mahasiswa sudah mengerjakan Posttest.';

    let msg = `📝 *REMINDER POSTTEST - ${report[0]?.mata_kuliah}*\n`;
    msg += `Pertemuan: ${report[0]?.pertemuan}\n\n`;
    msg += `Daftar mahasiswa belum mengerjakan:\n`;
    
    missing.forEach((s, i) => {
      msg += `${i + 1}. ${s.mahasiswa} (${s.nim})\n`;
    });

    msg += `\nSegera dikerjakan ya teman-teman! 📚`;
    return msg;
  }

  static generateForumReminder(report) {
    const missing = report.filter(r => r.forum_status !== 'MEMENUHI');
    if (missing.length === 0) return '✓ Semua mahasiswa sudah memenuhi syarat Forum Diskusi (min 2 reply).';

    let msg = `💬 *REMINDER FORUM DISKUSI - ${report[0]?.mata_kuliah}*\n`;
    msg += `Pertemuan: ${report[0]?.pertemuan}\n\n`;
    msg += `Daftar mahasiswa belum memenuhi syarat (min 2 reply):\n`;

    missing.forEach((s, i) => {
      const status = s.forum_reply_count === 1 ? 'Baru 1x' : 'Belum isi';
      msg += `${i + 1}. ${s.mahasiswa} [${status}]\n`;
    });

    msg += `\nYuk aktif diskusi! Minimal 2 reply per pertemuan.`;
    return msg;
  }

  static generateRecap(report) {
    const stats = {
      total: report.length,
      donePosttest: report.filter(r => r.posttest_status === 'SUDAH_MENGERJAKAN').length,
      doneForum: report.filter(r => r.forum_status === 'MEMENUHI').length
    };

    let msg = `📊 *RECAP AKTIVITAS - ${report[0]?.mata_kuliah}*\n`;
    msg += `Pertemuan: ${report[0]?.pertemuan}\n`;
    msg += `- Total Mahasiswa: ${stats.total}\n`;
    msg += `- Sudah Posttest: ${stats.donePosttest}/${stats.total}\n`;
    msg += `- Memenuhi Forum: ${stats.doneForum}/${stats.total}\n`;
    
    return msg;
  }

  static generateStudentReminderSimple(courseMetadata, reminderCandidates) {
    if (!reminderCandidates || reminderCandidates.length === 0) {
      return null;
    }

    let msg = `🔔 *REMINDER TUGAS*\n`;
    msg += `*${courseMetadata.course_name}*\n`;
    msg += `Pertemuan ${courseMetadata.meeting}\n\n`;
    msg += `Yang belum menyelesaikan tugas:\n`;

    reminderCandidates.forEach((student, i) => {
      msg += `${i + 1}. ${student.nama_mahasiswa}\n`;
    });

    msg += `\nMohon segera dikerjakan ya 🙏`;
    return msg;
  }

  static generateStudentReminderDetail(courseMetadata, reminderCandidates) {
    if (!reminderCandidates || reminderCandidates.length === 0) {
      return null;
    }

    const reasonMap = {
      BELUM_POSTTEST: "Posttest",
      FORUM_BELUM_MEMENUHI: "Forum Diskusi"
    };

    let msg = `🔔 *REMINDER TUGAS*\n`;
    msg += `*${courseMetadata.course_name}*\n`;
    msg += `Pertemuan ${courseMetadata.meeting}\n\n`;
    msg += `Yang belum menyelesaikan:\n`;

    reminderCandidates.forEach((student, i) => {
      const reasons = student.reason
        .map(r => reasonMap[r] || r)
        .join(" & ");
      msg += `${i + 1}. ${student.nama_mahasiswa} — ${reasons}\n`;
    });

    msg += `\nMohon segera dikerjakan ya 🙏`;
    return msg;
  }

  static generateMainGroupUpdate(courseReminders) {
    if (!Array.isArray(courseReminders) || courseReminders.length === 0) {
      return null;
    }

    let msg = `📢 *UPDATE TUGAS KELAS*\n\n`;

    courseReminders.forEach(reminder => {
      msg += `*${reminder.course_name}*\n`;
      msg += `Pertemuan ${reminder.meeting} — ${reminder.candidates.length} mahasiswa belum\n`;
    });

    msg += `\nSilakan cek grup mata kuliah masing-masing 📚`;
    return msg;
  }
}

export default MessageGenerator;
