export function findMeeting(courseDetail, kodeSection) {
  const sections = Array.isArray(courseDetail?.data) ? courseDetail.data : [];
  return sections.find((section) => section?.kode_section === kodeSection) ?? null;
}

export function findPosttestActivity(meeting) {
  const activities = Array.isArray(meeting?.sub_section) ? meeting.sub_section : [];
  return activities.find((activity) => activity?.tipe === 'QUIZ' && activity?.kode_template === 'POST_TEST' && activity?.id) ?? null;
}

export function findForumActivities(meeting) {
  const activities = Array.isArray(meeting?.sub_section) ? meeting.sub_section : [];
  return activities.filter((activity) => activity?.tipe === 'FORUM' && activity?.id);
}

export function findForumActivity(meeting) {
  return findForumActivities(meeting)[0] ?? null;
}

export function findAssignmentActivity(meeting) {
  const activities = Array.isArray(meeting?.sub_section) ? meeting.sub_section : [];
  return activities.find((activity) => activity?.tipe === 'ASSIGNMENT' && activity?.kode_template === 'PENUGASAN_TERSTRUKTUR' && activity?.id) ?? null;
}

export function findQuestionnaireActivity(meeting) {
  const activities = Array.isArray(meeting?.sub_section) ? meeting.sub_section : [];
  return activities.find((activity) => activity?.tipe === 'QUESIONER' && activity?.kode_template === 'KUESIONER' && activity?.id) ?? null;
}

export function findAllForumTopics(forumTopicsResponse) {
  const topics = Array.isArray(forumTopicsResponse?.topics) ? forumTopicsResponse.topics : [];
  return topics.filter((topic) => topic?.id && (topic?.post_type === 'TOPIC' || topic?.judul));
}

export function findPrimaryForumTopic(forumTopicsResponse) {
  return findAllForumTopics(forumTopicsResponse)[0] ?? null;
}

export function normalizeStudents(courseDetail) {
  const peserta = Array.isArray(courseDetail?.peserta) ? courseDetail.peserta : [];
  return peserta.map((student) => ({
    nim: student.nim,
    nama_mahasiswa: student.nama_mahasiswa,
    alamat_email: student.alamat_email,
    no_hp_mahasiswa: student.no_hp_mahasiswa
  })).filter((student) => student.nim);
}
