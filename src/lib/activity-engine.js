export class ActivityEngine {
  constructor({ snapshotStore = null } = {}) {
    this.snapshotStore = snapshotStore;
    this.activityTypes = [
      'PRETEST',
      'BUKU_ISBN',
      'VIDEO_AJAR',
      'POWER_POINT',
      'ARTIKEL_RISET',
      'MATERI_LAINNYA',
      'PENUGASAN_TERSTRUKTUR',
      'LINK_VCON',
      'FORUM_DISKUSI',
      'POSTTEST',
      'QUESIONER'
    ];
  }

  detectActivities(courseDetail) {
    if (!courseDetail || !courseDetail.data) {
      return {
        course_id: courseDetail?.kode_course || null,
        meetings: []
      };
    }

    const courseId = courseDetail.kode_course;
    const meetings = [];

    for (const section of courseDetail.data) {
      const meetingNum = this.extractMeetingNumber(section.kode_section);
      
      if (meetingNum === null) continue;

      const activities = this.parseActivities(
        section.sub_section || [],
        courseId,
        meetingNum
      );

      if (activities.length > 0) {
        meetings.push({
          meeting: meetingNum,
          kode_section: section.kode_section,
          activities
        });
      }
    }

    return {
      course_id: courseId,
      meetings: meetings.sort((a, b) => a.meeting - b.meeting)
    };
  }

  parseActivities(subSections, courseId, meetingNum) {
    const activities = [];

    for (const sub of subSections) {
      if (!sub.tipe) continue;

      const normalizedActivity = this.normalizeActivity(
        sub,
        courseId,
        meetingNum
      );

      if (normalizedActivity) {
        activities.push(normalizedActivity);
      }
    }

    return activities;
  }

  normalizeActivity(activityData, courseId, meetingNum) {
    const activityType = activityData.kode_template;

    if (!this.activityTypes.includes(activityType)) {
      return null;
    }

    return {
      type: activityType,
      available: !!activityData.id,
      id: activityData.id || null,
      title: activityData.judul || null,
      meeting: meetingNum,
      course_id: courseId,
      tipe: activityData.tipe,
      detected_at: new Date().toISOString()
    };
  }

  extractMeetingNumber(kodeSection) {
    if (!kodeSection) return null;

    if (kodeSection === 'GENERAL') return null;
    if (kodeSection === 'UAS') return null;

    const match = kodeSection.match(/PERTEMUAN_(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  }

  async detectNewActivities(courseId, newSnapshot) {
    if (!this.snapshotStore) {
      return {
        new_activities: [],
        removed_activities: [],
        unchanged: true
      };
    }

    const oldSnapshot = await this.snapshotStore.getSnapshot(courseId);

    if (!oldSnapshot) {
      const newActivities = this.extractAllActivities(newSnapshot);
      return {
        new_activities: newActivities.map(a => ({
          type: 'NEW_ACTIVITY',
          course_id: courseId,
          meeting: a.meeting,
          activity_type: a.type,
          activity_id: a.id,
          title: a.title
        })),
        removed_activities: [],
        unchanged: false,
        is_first_snapshot: true
      };
    }

    const oldActivities = this.extractActivityMap(oldSnapshot);
    const newActivities = this.extractActivityMap(newSnapshot);

    const newlyAdded = [];
    const removed = [];

    for (const key in newActivities) {
      if (!oldActivities[key]) {
        newlyAdded.push({
          type: 'NEW_ACTIVITY',
          course_id: courseId,
          meeting: newActivities[key].meeting,
          activity_type: newActivities[key].type,
          activity_id: newActivities[key].id,
          title: newActivities[key].title
        });
      }
    }

    for (const key in oldActivities) {
      if (!newActivities[key]) {
        removed.push({
          type: 'REMOVED_ACTIVITY',
          course_id: courseId,
          meeting: oldActivities[key].meeting,
          activity_type: oldActivities[key].type,
          activity_id: oldActivities[key].id,
          title: oldActivities[key].title
        });
      }
    }

    return {
      new_activities: newlyAdded,
      removed_activities: removed,
      unchanged: newlyAdded.length === 0 && removed.length === 0,
      is_first_snapshot: false
    };
  }

  extractActivityMap(snapshot) {
    const map = {};

    if (!snapshot.meetings) return map;

    for (const meeting of snapshot.meetings) {
      for (const activity of meeting.activities || []) {
        const key = `${meeting.meeting}_${activity.type}_${activity.id || 'null'}`;
        map[key] = activity;
      }
    }

    return map;
  }

  extractAllActivities(snapshot) {
    const activities = [];

    if (!snapshot.meetings) return activities;

    for (const meeting of snapshot.meetings) {
      for (const activity of meeting.activities || []) {
        activities.push(activity);
      }
    }

    return activities;
  }

  generateUpdateNotification(snapshot) {
    if (!snapshot.meetings || snapshot.meetings.length === 0) {
      return null;
    }

    const updates = [];

    for (const meeting of snapshot.meetings) {
      for (const activity of meeting.activities || []) {
        if (activity.available) {
          updates.push({
            meeting: meeting.meeting,
            activity_type: activity.type,
            activity_title: activity.title,
            activity_id: activity.id
          });
        }
      }
    }

    if (updates.length === 0) {
      return null;
    }

    return {
      course_id: snapshot.course_id,
      updates
    };
  }

  generateCombinedUpdateNotification(snapshots) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return null;
    }

    const courseUpdates = [];

    for (const snapshot of snapshots) {
      const notification = this.generateUpdateNotification(snapshot);
      if (notification && notification.updates.length > 0) {
        courseUpdates.push(notification);
      }
    }

    if (courseUpdates.length === 0) {
      return null;
    }

    return {
      type: 'COMBINED_UPDATE',
      courses: courseUpdates,
      generated_at: new Date().toISOString()
    };
  }
}

export default ActivityEngine;
