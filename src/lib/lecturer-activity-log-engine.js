import { randomUUID } from "crypto";

export class LecturerActivityLogEngine {
  constructor({ logStore = null } = {}) {
    this.logStore = logStore;
    this.eventTypes = ["CREATED", "UPDATED", "REMOVED"];
  }

  async detectActivityChanges(courseId, courseName, lecturerName, oldSnapshot, newSnapshot) {
    const events = [];

    if (!oldSnapshot) {
      // First snapshot - all activities are CREATED
      const createdEvents = this.generateCreatedEvents(
        courseId,
        courseName,
        lecturerName,
        newSnapshot
      );
      events.push(...createdEvents);
    } else {
      // Compare snapshots
      const oldActivityMap = this.buildActivityMap(oldSnapshot);
      const newActivityMap = this.buildActivityMap(newSnapshot);

      // Detect new/updated activities
      for (const key in newActivityMap) {
        if (!oldActivityMap[key]) {
          const activity = newActivityMap[key];
          events.push({
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            course_id: courseId,
            course_name: courseName,
            meeting: activity.meeting,
            lecturer_name: lecturerName,
            activity_type: activity.type,
            activity_id: activity.id,
            activity_title: activity.title,
            event_type: "CREATED"
          });
        }
      }

      // Detect removed activities
      for (const key in oldActivityMap) {
        if (!newActivityMap[key]) {
          const activity = oldActivityMap[key];
          events.push({
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            course_id: courseId,
            course_name: courseName,
            meeting: activity.meeting,
            lecturer_name: lecturerName,
            activity_type: activity.type,
            activity_id: activity.id,
            activity_title: activity.title,
            event_type: "REMOVED"
          });
        }
      }
    }

    // Persist events
    if (this.logStore && events.length > 0) {
      for (const event of events) {
        await this.logStore.append(event);
      }
    }

    return events;
  }

  generateCreatedEvents(courseId, courseName, lecturerName, snapshot) {
    const events = [];

    if (!snapshot || !snapshot.meetings) {
      return events;
    }

    for (const meeting of snapshot.meetings) {
      for (const activity of meeting.activities || []) {
        if (activity.available) {
          events.push({
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            course_id: courseId,
            course_name: courseName,
            meeting: meeting.meeting,
            lecturer_name: lecturerName,
            activity_type: activity.type,
            activity_id: activity.id,
            activity_title: activity.title,
            event_type: "CREATED"
          });
        }
      }
    }

    return events;
  }

  buildActivityMap(snapshot) {
    const map = {};

    if (!snapshot || !snapshot.meetings) {
      return map;
    }

    for (const meeting of snapshot.meetings) {
      for (const activity of meeting.activities || []) {
        if (activity.available) {
          const key = `${meeting.meeting}_${activity.type}_${activity.id}`;
          map[key] = activity;
        }
      }
    }

    return map;
  }

  generateNotification(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return null;
    }

    // Group by course and meeting
    const grouped = {};

    for (const event of events) {
      const key = `${event.course_id}_${event.meeting}`;

      if (!grouped[key]) {
        grouped[key] = {
          course_id: event.course_id,
          course_name: event.course_name,
          meeting: event.meeting,
          lecturer_name: event.lecturer_name,
          activities: []
        };
      }

      grouped[key].activities.push({
        type: event.activity_type,
        title: event.activity_title,
        event: event.event_type
      });
    }

    return {
      type: "LECTURER_ACTIVITY_UPDATE",
      entries: Object.values(grouped),
      generated_at: new Date().toISOString()
    };
  }
}

export default LecturerActivityLogEngine;
