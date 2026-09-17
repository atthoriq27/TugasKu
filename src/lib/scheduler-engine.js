import { randomUUID } from "crypto";
import { WorldClock } from "./world-clock.js";

export class SchedulerEngine {
  constructor({ clock = null, logStore = null, scheduleConfig = null } = {}) {
    this.clock = clock || new WorldClock("Asia/Jakarta");
    this.logStore = logStore;
    this.scheduleConfig = scheduleConfig || {
      timezone: "Asia/Jakarta",
      jobs: {
        mentariScan: { enabled: true },
        studentReminder: { enabled: true },
        lecturerActivityUpdate: { enabled: true }
      },
      retry: { maxAttempts: 3, delayMs: 30000 }
    };
    this.jobStates = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"];
  }

  generateScheduledJobs(courses, scheduleEngine) {
    const jobs = [];
    for (const course of courses) {
      const sks = course.sks;
      const group = course.group || 1;

      // Generate MENTARI_SCAN jobs
      if (this.scheduleConfig.jobs.mentariScan.enabled) {
        try {
          const meetingSchedule = scheduleEngine.getMeetingSchedule({
            sks,
            group
          });

          for (const weekSchedule of meetingSchedule) {
            for (const meeting of weekSchedule.meetings) {
              const job = this.createJob(
                "MENTARI_SCAN",
                course.course_id,
                course.course_name,
                meeting.meeting,
                weekSchedule.phase,
                weekSchedule.delivery_mode,
                weekSchedule.week
              );
              jobs.push(job);
            }
          }
        } catch (error) {
          console.error(`Error generating MENTARI_SCAN for ${course.course_id}:`, error.message);
        }
      }

      // Generate STUDENT_REMINDER jobs
      if (this.scheduleConfig.jobs.studentReminder.enabled) {
        const reminderJob = this.createJob(
          "STUDENT_REMINDER",
          course.course_id,
          course.course_name,
          1,
          "AFTER_UTS",
          "ONLINE",
          null
        );
        jobs.push(reminderJob);
      }

      // Generate LECTURER_ACTIVITY_UPDATE jobs
      if (this.scheduleConfig.jobs.lecturerActivityUpdate.enabled) {
        const logJob = this.createJob(
          "LECTURER_ACTIVITY_UPDATE",
          course.course_id,
          course.course_name,
          1,
          "AFTER_UTS",
          "ONLINE",
          null
        );
        jobs.push(logJob);
      }
    }

    return jobs;
  }

  createJob(jobType, courseId, courseName, meeting, phase, mode, week = null) {
    return {
      id: randomUUID(),
      type: jobType,
      course_id: courseId,
      course_name: courseName,
      meeting: meeting,
      week: week,
      phase: phase,
      delivery_mode: mode,
      status: "PENDING",
      scheduled_at: this.clock.nowISO(),
      attempts: 0,
      max_attempts: this.scheduleConfig.retry.maxAttempts,
      started_at: null,
      completed_at: null,
      error: null,
      unique_key: this.generateUniqueKey(jobType, courseId, meeting)
    };
  }

  generateUniqueKey(jobType, courseId, meeting) {
    const date = this.clock.today();
    return `${date}|${courseId}|PERTEMUAN_${meeting}|${jobType}`;
  }

  deduplicateJobs(jobs) {
    const seen = new Set();
    const deduplicated = [];

    for (const job of jobs) {
      if (!seen.has(job.unique_key)) {
        seen.add(job.unique_key);
        deduplicated.push(job);
      }
    }

    return deduplicated;
  }

  async markJobRunning(job) {
    job.status = "RUNNING";
    job.started_at = this.clock.nowISO();
    job.attempts += 1;

    if (this.logStore) {
      await this.logStore.appendJob(job);
    }

    return job;
  }

  async markJobCompleted(job) {
    job.status = "COMPLETED";
    job.completed_at = this.clock.nowISO();

    if (this.logStore) {
      await this.logStore.appendJob(job);
    }

    return job;
  }

  async markJobFailed(job, error) {
    job.status = "FAILED";
    job.error = error.message || String(error);
    job.completed_at = this.clock.nowISO();

    if (this.logStore) {
      await this.logStore.appendJob(job);
    }

    return job;
  }

  async runJob(job, executor) {
    await this.markJobRunning(job);

    try {
      if (typeof executor !== "function") {
        throw new Error("Job executor belum dikonfigurasi");
      }

      const result = await executor(job);
      await this.markJobCompleted(job);
      return { job, result };
    } catch (error) {
      await this.markJobFailed(job, error);
      return { job, error };
    }
  }
  shouldRetry(job) {
    return (
      job.status === "FAILED" &&
      job.attempts < job.max_attempts &&
      job.attempts > 0
    );
  }

  getRetryDelay() {
    return this.scheduleConfig.retry.delayMs;
  }

  getReadyJobs(jobs) {
    return jobs.filter(job => job.status === "PENDING");
  }

  getWaitingJobs(jobs) {
    return jobs.filter(job => 
      job.status === "RUNNING" || 
      (job.status === "FAILED" && this.shouldRetry(job))
    );
  }

  getConfigurationStatus() {
    const missing = [];

    if (!this.scheduleConfig.timezone) missing.push("timezone");
    if (!this.scheduleConfig.jobs) missing.push("jobs");
    if (!this.scheduleConfig.retry) missing.push("retry");

    return {
      status: missing.length === 0 ? "READY" : "CONFIG_REQUIRED",
      missing
    };
  }
  formatDryRun(jobs) {
    const ready = this.getReadyJobs(jobs);
    const waiting = this.getWaitingJobs(jobs);
    const now = this.clock.format(this.clock.now(), "dd MMMM yyyy HH:mm:ss");

    let output = "TUGASKU SCHEDULER\n\n";
    output += `Current time:\n${now} WIB\n\n`;
    output += "Scheduled jobs:\n\n";

    if (ready.length > 0) {
      for (const job of ready) {
        output += `[READY]\n`;
        output += `${job.type}\n`;
        output += `${job.course_name}\n`;
        output += `Pertemuan ${job.meeting}\n`;
        output += `Phase: ${job.phase} | Mode: ${job.delivery_mode}\n\n`;
      }
    }

    if (waiting.length > 0) {
      output += "\n--- WAITING FOR RETRY ---\n\n";
      for (const job of waiting) {
        output += `[WAITING]\n`;
        output += `${job.type}\n`;
        output += `${job.course_name}\n`;
        output += `Attempt ${job.attempts}/${job.max_attempts}\n\n`;
      }
    }

    if (ready.length === 0 && waiting.length === 0) {
      output += "No jobs scheduled.\n";
    }

    return output;
  }
}

export default SchedulerEngine;


