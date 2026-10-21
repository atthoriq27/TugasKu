import { findForumActivity, findForumActivities, findMeeting, findPosttestActivity, findPrimaryForumTopic, findAllForumTopics, normalizeStudents, findAssignmentActivity, findQuestionnaireActivity } from './course-parser.js';
import { buildForumReplyCountByNim, buildPosttestStatusByNim, getForumStatus, getMultiTopicForumDetail, FORUM_TOPIC_STATUS, POSTTEST_STATUS, FORUM_STATUS, ASSIGNMENT_STATUS } from './status-rules.js';

export class TugasKuCoreEngine {
  constructor({ mentariClient }) {
    this.mentariClient = mentariClient;
  }

  async generatePertemuanReport({ kodeCourse, kodeSection }) {
    const courseDetail = await this.mentariClient.getUserCourseDetail(kodeCourse);
    const meeting = findMeeting(courseDetail, kodeSection);

    if (!meeting) {
      throw new Error(`Pertemuan tidak ditemukan: ${kodeSection}`);
    }

    const students = normalizeStudents(courseDetail);
    
    // Deteksi aktivitas yang tersedia
    const posttestActivity = findPosttestActivity(meeting);
    const forumActivities = findForumActivities(meeting);
    const assignmentActivity = findAssignmentActivity(meeting);
    const questionnaireActivity = findQuestionnaireActivity(meeting);

    // Build data aktivitas
    const aktivitasData = {
      posttest: {
        available: !!posttestActivity,
        statusPerMahasiswa: new Map()
      },
      forum: {
        available: forumActivities.length > 0,
        replyCountPerMahasiswa: new Map(),
        statusPerMahasiswa: new Map(),
        topics: [],
        hasMultipleTopics: false
      },
      assignment: {
        available: !!(assignmentActivity && assignmentActivity.id),
        id: assignmentActivity?.id || null,
        title: assignmentActivity?.judul || "Penugasan Terstruktur",
        deadline: null,
        statusPerMahasiswa: new Map()
      },
      questionnaire: {
        available: !!questionnaireActivity,
        is_done: !!questionnaireActivity?.completion,
        title: questionnaireActivity?.judul || "Kuesioner"
      }
    };

    if (questionnaireActivity) {
      if (!aktivitasData.questionnaire.is_done && typeof this.mentariClient?.getKuesioner === 'function') {
        try {
          const kuesionerRes = await this.mentariClient.getKuesioner(kodeCourse, kodeSection);
          const list = Array.isArray(kuesionerRes?.kuesioner)
            ? kuesionerRes.kuesioner
            : (Array.isArray(kuesionerRes?.data?.kuesioner) ? kuesionerRes.data.kuesioner : []);
          if (list.length > 0 && list.every(q => q.jawaban !== null && q.jawaban !== undefined)) {
            aktivitasData.questionnaire.is_done = true;
          }
        } catch (kErr) {
          // fallback to completion status
        }
      }
    }

    // Fetch posttest data jika tersedia
    if (posttestActivity) {
      try {
        const quizPesertaResponse = await this.mentariClient.getQuizPeserta(posttestActivity.id);
        aktivitasData.posttest.statusPerMahasiswa = buildPosttestStatusByNim(quizPesertaResponse);
      } catch (error) {
        console.error(`Error fetching posttest untuk ${kodeSection}:`, error.message);
        aktivitasData.posttest.available = false;
      }
    }

    // Fetch forum data jika tersedia (mendukung banyak topik & aktivitas forum dalam 1 pertemuan)
    if (forumActivities.length > 0) {
      try {
        const replyMap = new Map();
        const topicsList = [];
        let anyTopicFound = false;

        for (const fActivity of forumActivities) {
          try {
            const forumTopicsResponse = await this.mentariClient.getForumTopics(fActivity.id);
            const forumTopics = findAllForumTopics(forumTopicsResponse);

            for (const topic of forumTopics) {
              anyTopicFound = true;
              const topicReplyMap = new Map();
              let topicTotalReplies = 0;
              try {
                const forumReplyResponse = await this.mentariClient.getForumReply(topic.id);
                const replies = Array.isArray(forumReplyResponse?.data) ? forumReplyResponse.data : [];
                topicTotalReplies = replies.length;
                for (const reply of replies) {
                  if (reply?.post_type !== 'REPLY') continue;
                  if (!reply?.nim) continue;
                  replyMap.set(reply.nim, (replyMap.get(reply.nim) ?? 0) + 1);
                  topicReplyMap.set(reply.nim, (topicReplyMap.get(reply.nim) ?? 0) + 1);
                }
              } catch (topicErr) {
                console.warn(`Gagal mengambil reply untuk topik "${topic.judul || topic.id}":`, topicErr.message);
              }

              topicsList.push({
                id: topic.id,
                judul: topic.judul || "Topik Diskusi",
                createdAt: topic.createdAt || null,
                reply_count: topicTotalReplies,
                replies_by_nim: mapToObject(topicReplyMap, students, 0)
              });
            }
          } catch (forumErr) {
            console.warn(`Gagal mengambil topik forum ${fActivity.id}:`, forumErr.message);
          }
        }

        if (anyTopicFound) {
          aktivitasData.forum.available = true;
          aktivitasData.forum.replyCountPerMahasiswa = replyMap;
          aktivitasData.forum.topics = topicsList;
          aktivitasData.forum.hasMultipleTopics = topicsList.length > 1;
        } else {
          console.warn(`Topic Forum Diskusi tidak ditemukan untuk ${kodeSection}`);
          aktivitasData.forum.available = false;
          aktivitasData.forum.topics = [];
          aktivitasData.forum.hasMultipleTopics = false;
        }
      } catch (error) {
        console.error(`Error fetching forum untuk ${kodeSection}:`, error.message);
        aktivitasData.forum.available = false;
        aktivitasData.forum.topics = [];
        aktivitasData.forum.hasMultipleTopics = false;
      }
    }

    // Fetch assignment data jika tersedia
    if (assignmentActivity && assignmentActivity.id) {
      try {
        const assignmentResponse = await this.mentariClient.getAssignment(assignmentActivity.id);
        const assignmentStudents = Array.isArray(assignmentResponse?.data) ? assignmentResponse.data : [];
        
        if (assignmentResponse.judul) {
          aktivitasData.assignment.title = assignmentResponse.judul;
        }

        // MENTARI membatasi hak akses file tugas antar mahasiswa (endpoint /api/assignment/:id hanya mengembalikan data user login)
        const isPrivate = assignmentStudents.length <= 1 && students.length > 1;
        aktivitasData.assignment.is_private = isPrivate;

        for (const s of assignmentStudents) {
          const hasSubmitted = !!(s.assignment && (s.assignment.id || s.assignment.files?.length > 0 || s.assignment.konten));
          aktivitasData.assignment.statusPerMahasiswa.set(
            s.nim,
            hasSubmitted ? ASSIGNMENT_STATUS.SUDAH_MENGUMPULKAN : ASSIGNMENT_STATUS.BELUM_MENGUMPULKAN
          );
        }

        if (isPrivate) {
          for (const student of students) {
            if (!aktivitasData.assignment.statusPerMahasiswa.has(student.nim)) {
              aktivitasData.assignment.statusPerMahasiswa.set(student.nim, ASSIGNMENT_STATUS.PRIVAT_MENTARI);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching assignment untuk ${kodeSection}:`, error.message);
        aktivitasData.assignment.available = false;
      }
    }

    // Build forum status untuk semua mahasiswa
    if (aktivitasData.forum.available) {
      for (const student of students) {
        const replyCount = aktivitasData.forum.replyCountPerMahasiswa.get(student.nim) ?? 0;
        aktivitasData.forum.statusPerMahasiswa.set(student.nim, getForumStatus(replyCount));
      }
    }

    return buildPertemuanReport({
      courseDetail,
      kodeSection,
      students,
      aktivitasData
    });
  }
}

export function buildPertemuanReport({ courseDetail, kodeSection, students, aktivitasData }) {
  const topicsList = aktivitasData.forum?.topics || [];
  const hasMultipleTopics = topicsList.length > 1;

  return {
    mata_kuliah: courseDetail?.coursename ?? courseDetail?.kode_course,
    kode_course: courseDetail?.kode_course,
    pertemuan: kodeSection,
    total_mahasiswa: students.length,
    aktivitas: {
      posttest: {
        available: aktivitasData.posttest.available,
        status_per_mahasiswa: aktivitasData.posttest.available 
          ? mapToObject(aktivitasData.posttest.statusPerMahasiswa, students)
          : null
      },
      forum: {
        available: aktivitasData.forum.available,
        has_multiple_topics: hasMultipleTopics,
        topics: topicsList.map(t => ({
          id: t.id,
          judul: t.judul,
          createdAt: t.createdAt,
          reply_count: t.reply_count
        })),
        reply_count_per_mahasiswa: aktivitasData.forum.available
          ? mapToObject(aktivitasData.forum.replyCountPerMahasiswa, students, 0)
          : null,
        status_per_mahasiswa: aktivitasData.forum.available
          ? mapToObject(aktivitasData.forum.statusPerMahasiswa, students)
          : null
      },
      assignment: {
        available: aktivitasData.assignment.available,
        is_private: !!aktivitasData.assignment.is_private,
        title: aktivitasData.assignment.title,
        status_per_mahasiswa: aktivitasData.assignment.available
          ? mapToObject(aktivitasData.assignment.statusPerMahasiswa, students)
          : null
      },
      questionnaire: {
        available: !!aktivitasData.questionnaire?.available,
        is_done: !!aktivitasData.questionnaire?.is_done,
        title: aktivitasData.questionnaire?.title || "Kuesioner"
      }
    },
    mahasiswa_detail: students.map((student) => {
      const studentTopicsBreakdown = topicsList.map(t => ({
        id: t.id,
        judul: t.judul,
        count: t.replies_by_nim?.[student.nim] || 0
      }));
      const multiTopicDetail = getMultiTopicForumDetail({
        replyCount: aktivitasData.forum.replyCountPerMahasiswa?.get(student.nim) ?? 0,
        topicsBreakdown: studentTopicsBreakdown,
        totalTopics: topicsList.length
      });

      return {
        nim: student.nim,
        nama_mahasiswa: student.nama_mahasiswa,
        alamat_email: student.alamat_email,
        posttest_status: aktivitasData.posttest.available
          ? (aktivitasData.posttest.statusPerMahasiswa.get(student.nim) ?? POSTTEST_STATUS.BELUM_MENGERJAKAN)
          : 'NOT_AVAILABLE',
        forum_reply_count: aktivitasData.forum.available
          ? (aktivitasData.forum.replyCountPerMahasiswa.get(student.nim) ?? 0)
          : null,
        forum_status: aktivitasData.forum.available
          ? (aktivitasData.forum.statusPerMahasiswa.get(student.nim) ?? FORUM_STATUS.BELUM_MENGERJAKAN)
          : 'NOT_AVAILABLE',
        forum_topic_status: aktivitasData.forum.available ? multiTopicDetail.topic_status : 'NOT_AVAILABLE',
        forum_topics_breakdown: aktivitasData.forum.available ? studentTopicsBreakdown : [],
        has_unanswered_topic: aktivitasData.forum.available ? !multiTopicDetail.all_topics_filled : false,
        missing_topics: aktivitasData.forum.available ? multiTopicDetail.missing_topics : [],
        assignment_status: aktivitasData.assignment.available
          ? (aktivitasData.assignment.statusPerMahasiswa.get(student.nim) ?? (aktivitasData.assignment.is_private ? ASSIGNMENT_STATUS.PRIVAT_MENTARI : ASSIGNMENT_STATUS.BELUM_MENGUMPULKAN))
          : 'NOT_AVAILABLE',
        questionnaire_status: aktivitasData.questionnaire?.available
          ? (aktivitasData.questionnaire.is_done ? 'SUDAH_MENGISI' : 'BELUM_MENGISI')
          : 'NOT_AVAILABLE'
      };
    })
  };
}

function mapToObject(map, students, defaultValue = undefined) {
  const result = {};
  for (const student of students) {
    const value = map.get(student.nim);
    result[student.nim] = value !== undefined ? value : defaultValue;
  }
  return result;
}

