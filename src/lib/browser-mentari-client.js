import { MentariBrowserSession } from "./mentari-browser-session.js";

export class BrowserMentariClient {
  constructor({ browserSession = null, headless = true } = {}) {
    this.session = browserSession || new MentariBrowserSession({ headless });
  }

  async getUserCourses({ semester = "", page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (semester) query.set("semester", semester);
    query.set("page", String(page));
    query.set("limit", String(limit));
    return this.session.fetchWithBrowser(`/api/user-course?${query.toString()}`);
  }

  async getUserCourseDetail(kodeCourse) {
    return this.session.fetchWithBrowser(`/api/user-course/${encodeURIComponent(kodeCourse)}`);
  }

  async getQuizPeserta(quizId) {
    return this.session.fetchWithBrowser(`/api/quiz/peserta/${encodeURIComponent(quizId)}`);
  }

  async getForumTopics(forumSubSectionId) {
    return this.session.fetchWithBrowser(`/api/forum/topic/${encodeURIComponent(forumSubSectionId)}`);
  }

  async getForumReply(forumTopicId) {
    return this.session.fetchWithBrowser(`/api/forum/reply/${encodeURIComponent(forumTopicId)}`);
  }

  async getAssignment(assignmentId) {
    return this.session.fetchWithBrowser(`/api/assignment/${encodeURIComponent(assignmentId)}`);
  }
}

export default BrowserMentariClient;
