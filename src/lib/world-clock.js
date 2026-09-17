export class WorldClock {
  constructor(timezone = "Asia/Jakarta", fixedNow = null) {
    this.timezone = timezone;
    this.fixedNow = fixedNow ? new Date(fixedNow) : null;
  }

  now() {
    return this.fixedNow ? new Date(this.fixedNow) : new Date();
  }

  setFixedNow(dateTime) {
    this.fixedNow = dateTime ? new Date(dateTime) : null;
  }

  nowISO() {
    return this.toZonedISO(this.now());
  }

  today() {
    return this.getParts(this.now()).date;
  }

  currentWeekday() {
    const day = this.getParts(this.now()).weekday;
    return day === 0 ? 7 : day;
  }

  currentWeekdayName() {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      timeZone: this.timezone
    }).format(this.now());
  }

  format(dateTime = this.now(), format = "dd MMMM yyyy HH:mm:ss") {
    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
    const parts = this.getParts(date);

    return format
      .replace("dd", parts.day)
      .replace("MMMM", parts.monthName)
      .replace("yyyy", parts.year)
      .replace("HH", parts.hour)
      .replace("mm", parts.minute)
      .replace("ss", parts.second);
  }

  isWithinRange(targetTime, startTime, endTime) {
    const target = new Date(targetTime).getTime();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return target >= start && target <= end;
  }

  addMinutes(minutes) {
    return new Date(this.now().getTime() + minutes * 60 * 1000);
  }

  addHours(hours) {
    return new Date(this.now().getTime() + hours * 60 * 60 * 1000);
  }

  addDays(days) {
    return new Date(this.now().getTime() + days * 24 * 60 * 60 * 1000);
  }

  getTimezoneOffset(date = this.now()) {
    const parts = this.getParts(date);
    const utcEquivalent = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return Math.round((utcEquivalent - date.getTime()) / 60000);
  }

  toJakartaTime(dateTime) {
    return this.toZonedISO(typeof dateTime === "string" ? new Date(dateTime) : dateTime);
  }

  diff(date1, date2) {
    return new Date(date1).getTime() - new Date(date2).getTime();
  }

  toZonedISO(date) {
    const parts = this.getParts(date);
    const offset = this.getTimezoneOffset(date);
    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const offsetHours = String(Math.floor(abs / 60)).padStart(2, "0");
    const offsetMinutes = String(abs % 60).padStart(2, "0");

    return `${parts.date}T${parts.hour}:${parts.minute}:${parts.second}${sign}${offsetHours}:${offsetMinutes}`;
  }

  getParts(date) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short"
    });

    const raw = Object.fromEntries(
      formatter.formatToParts(date)
        .filter(part => part.type !== "literal")
        .map(part => [part.type, part.value])
    );

    const monthName = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      timeZone: this.timezone
    }).format(date);

    const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

    return {
      year: raw.year,
      month: raw.month,
      day: raw.day,
      hour: raw.hour === "24" ? "00" : raw.hour,
      minute: raw.minute,
      second: raw.second,
      monthName,
      weekday: weekdayMap[raw.weekday],
      date: `${raw.year}-${raw.month}-${raw.day}`
    };
  }
}

export default WorldClock;
