import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ScheduleEngine {
  constructor(configPath = null) {
    const defaultConfigPath = path.join(__dirname, "../../config/schedule.json");
    const configFile = configPath || defaultConfigPath;
    
    if (!fs.existsSync(configFile)) {
      throw new Error(`Schedule config file tidak ditemukan: ${configFile}`);
    }

    const configContent = fs.readFileSync(configFile, "utf-8");
    this.config = JSON.parse(configContent);
  }

  getPhase(week) {
    if (week < this.config.uts_week) {
      return "BEFORE_UTS";
    } else if (week === this.config.uts_week) {
      return "UTS";
    } else if (week === this.config.uas_week) {
      return "UAS";
    } else {
      return "AFTER_UTS";
    }
  }

  getDeliveryMode(group, phase) {
    const groupConfig = this.config.groups[group.toString()];
    if (!groupConfig) {
      throw new Error(`Kelompok tidak ditemukan: ${group}`);
    }

    if (phase === "BEFORE_UTS") {
      return groupConfig.before_uts;
    } else if (phase === "AFTER_UTS") {
      return groupConfig.after_uts;
    } else {
      return "SPECIAL";
    }
  }

  getMeetingSchedule({ sks, group, startWeek = 1 }) {
    const sksStr = sks.toString();
    if (!this.config.meetings_by_sks[sksStr]) {
      throw new Error(`SKS tidak didukung: ${sks}`);
    }

    const sksMeetingConfig = this.config.meetings_by_sks[sksStr];
    const schedule = [];

    let week = startWeek;

    while (week <= this.config.semester_weeks) {
      const phase = this.getPhase(week);
      const deliveryMode = this.getDeliveryMode(group, phase);

      // Jika phase adalah UTS/UAS, jadwal dilompati (tidak ada pertemuan KBM via MENTARI)
      if (phase === "UTS" || phase === "UAS") {
        week++;
        continue; 
      }

      // Ambil pertemuan dari week mapping
      let meetingsArr = [];
      
      // Gunakan explicitly mapped week jika ada (ini source of truth)
      if (sksMeetingConfig.week_mapping && sksMeetingConfig.week_mapping[week.toString()]) {
         meetingsArr = sksMeetingConfig.week_mapping[week.toString()];
      } 
      
      const weekSchedule = {
        week,
        phase,
        delivery_mode: deliveryMode,
        meetings: []
      };

      for (let m of meetingsArr) {
         weekSchedule.meetings.push({ meeting: m });
      }

      if (weekSchedule.meetings.length > 0) {
        schedule.push(weekSchedule);
      }

      week++;
    }

    return schedule;
  }

  getOnlinePeriodsForGroup(group) {
    return this.config.online_periods.filter(period => period.group === group);
  }

  getMeetingsInOnlinePeriod(sks, group, onlinePeriodName) {
    const period = this.config.online_periods.find(p => p.name === onlinePeriodName);
    
    if (!period) {
      throw new Error(`Online period tidak ditemukan: ${onlinePeriodName}`);
    }

    if (period.group !== group) {
      throw new Error(`Online period ${onlinePeriodName} tidak untuk kelompok ${group}`);
    }

    const sksStr = sks.toString();
    if (!period.sks_meetings[sksStr]) {
      return [];
    }

    for (const override of this.config.overrides) {
      if (override.sks === sks && override.online_period === onlinePeriodName) {
        return override.sks_meetings;
      }
    }

    return period.sks_meetings[sksStr];
  }

  validateSchedule(schedule) {
    const errors = [];

    if (!Array.isArray(schedule)) {
      return ["Schedule harus berupa array"];
    }

    for (const weekSchedule of schedule) {
      if (!weekSchedule.week || typeof weekSchedule.week !== "number") {
        errors.push(`Week harus number: ${JSON.stringify(weekSchedule)}`);
      }

      if (!weekSchedule.phase) {
        errors.push(`Phase tidak ditemukan di week ${weekSchedule.week}`);
      }

      if (!weekSchedule.delivery_mode) {
        errors.push(`Delivery mode tidak ditemukan di week ${weekSchedule.week}`);
      }

      if (!Array.isArray(weekSchedule.meetings)) {
        errors.push(`Meetings harus berupa array di week ${weekSchedule.week}`);
      }

      for (const meeting of weekSchedule.meetings) {
        if (!meeting.meeting || typeof meeting.meeting !== "number") {
          errors.push(`Meeting harus number: ${JSON.stringify(meeting)}`);
        }
      }
    }

    return errors;
  }
}

export default ScheduleEngine;
