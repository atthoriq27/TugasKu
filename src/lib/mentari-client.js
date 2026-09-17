export class MentariClient {
  constructor({ baseUrl = 'https://mentari.unpam.ac.id', token, cookie } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token ? token.replace(/^Bearer\s+/i, '').trim() : '';
    this.cookie = cookie;
  }

  async request(path) {
    if (!this.token) throw new Error('MENTARI token belum tersedia');

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Origin': 'https://mentari.unpam.ac.id',
      'Referer': 'https://mentari.unpam.ac.id/'
    };

    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No body');
      throw new Error(`MENTARI request gagal: ${response.status} ${response.statusText}\nBody: ${errorBody.substring(0, 500)}...`);
    }

    return response.json();
  }

  getUserCourses({ semester = '', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (semester) query.set('semester', semester);
    query.set('page', String(page));
    query.set('limit', String(limit));
    return this.request(`/api/user-course?${query.toString()}`);
  }

  getUserCourseDetail(kodeCourse) {
    return this.request(`/api/user-course/${encodeURIComponent(kodeCourse)}`);
  }

  getQuizPeserta(quizId) {
    return this.request(`/api/quiz/peserta/${encodeURIComponent(quizId)}`);
  }

  getForumTopics(forumSubSectionId) {
    return this.request(`/api/forum/topic/${encodeURIComponent(forumSubSectionId)}`);
  }

  getForumReply(forumTopicId) {
    return this.request(`/api/forum/reply/${encodeURIComponent(forumTopicId)}`);
  }

  getAssignment(assignmentId) {
    return this.request(`/api/assignment/${encodeURIComponent(assignmentId)}`);
  }
}

export default MentariClient;
