export const FORUM_STATUS = Object.freeze({
  BELUM_MENGERJAKAN: 'BELUM_MENGERJAKAN',
  BELUM_MEMENUHI: 'BELUM_MEMENUHI',
  MEMENUHI: 'MEMENUHI'
});

export const POSTTEST_STATUS = Object.freeze({
  SUDAH_MENGERJAKAN: 'SUDAH_MENGERJAKAN',
  BELUM_MENGERJAKAN: 'BELUM_MENGERJAKAN'
});

export const ASSIGNMENT_STATUS = Object.freeze({
  SUDAH_MENGUMPULKAN: 'SUDAH_MENGUMPULKAN',
  BELUM_MENGUMPULKAN: 'BELUM_MENGUMPULKAN',
  PRIVAT_MENTARI: 'PRIVAT_MENTARI',
  NOT_AVAILABLE: 'NOT_AVAILABLE'
});

export function getForumStatus(replyCount) {
  if (replyCount >= 2) return FORUM_STATUS.MEMENUHI;
  if (replyCount === 1) return FORUM_STATUS.BELUM_MEMENUHI;
  return FORUM_STATUS.BELUM_MENGERJAKAN;
}

export function buildPosttestStatusByNim(quizPesertaResponse) {
  const statusByNim = new Map();
  const rows = Array.isArray(quizPesertaResponse?.data) ? quizPesertaResponse.data : [];

  for (const row of rows) {
    if (!row?.nim) continue;
    statusByNim.set(row.nim, row.quiz ? POSTTEST_STATUS.SUDAH_MENGERJAKAN : POSTTEST_STATUS.BELUM_MENGERJAKAN);
  }

  return statusByNim;
}

export function buildForumReplyCountByNim(forumReplyResponse, existingMap = new Map()) {
  const replyCountByNim = existingMap;
  const replies = Array.isArray(forumReplyResponse?.data) ? forumReplyResponse.data : [];

  for (const reply of replies) {
    if (reply?.post_type !== 'REPLY') continue;
    if (!reply?.nim) continue;
    replyCountByNim.set(reply.nim, (replyCountByNim.get(reply.nim) ?? 0) + 1);
  }

  return replyCountByNim;
}

export const FORUM_TOPIC_STATUS = Object.freeze({
  LENGKAP: 'LENGKAP',
  PERLU_JAWAB_TOPIK_LAIN: 'PERLU_JAWAB_TOPIK_LAIN',
  KURANG: 'KURANG',
  BELUM_MENGERJAKAN: 'BELUM_MENGERJAKAN'
});

export function getMultiTopicForumDetail({ replyCount = 0, topicsBreakdown = [], totalTopics = 1 }) {
  if (totalTopics <= 1) {
    return {
      status: getForumStatus(replyCount),
      topic_status: replyCount >= 2 ? FORUM_TOPIC_STATUS.LENGKAP : (replyCount === 1 ? FORUM_TOPIC_STATUS.KURANG : FORUM_TOPIC_STATUS.BELUM_MENGERJAKAN),
      all_topics_filled: replyCount > 0,
      missing_topics: []
    };
  }

  const missingTopics = topicsBreakdown.filter(t => (t.count || 0) === 0);
  const allFilled = missingTopics.length === 0;

  let topicStatus = FORUM_TOPIC_STATUS.BELUM_MENGERJAKAN;
  if (replyCount >= 2 && allFilled) {
    topicStatus = FORUM_TOPIC_STATUS.LENGKAP;
  } else if (replyCount >= 2 && !allFilled) {
    topicStatus = FORUM_TOPIC_STATUS.PERLU_JAWAB_TOPIK_LAIN;
  } else if (replyCount === 1) {
    topicStatus = FORUM_TOPIC_STATUS.KURANG;
  }

  return {
    status: getForumStatus(replyCount),
    topic_status: topicStatus,
    all_topics_filled: allFilled,
    missing_topics: missingTopics.map(t => ({ id: t.id, judul: t.judul }))
  };
}

