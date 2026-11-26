(function (root) {
  "use strict";
  function escapeText(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
  function fold(line) {
    const encoder = new TextEncoder();
    const lines = [];
    let part = "";
    let size = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 75) { lines.push(part); part = " "; size = 1; }
      part += char;
      size += bytes;
    }
    lines.push(part);
    return lines.join("\r\n");
  }
  function stamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("Date de séance invalide.");
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }
  function event(row, now = new Date()) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)) throw new Error("Identifiant de séance invalide.");
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ping Points//Seances//FR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", `UID:${row.id}@ping-points.vercel.app`, `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(row.starts_at)}`, `SUMMARY:${escapeText(row.title)}`,
      `LOCATION:${escapeText(`${row.venue}, ${row.city}`)}`,
      "DESCRIPTION:Durée non renseignée : ajuste la fin dans ton calendrier.",
      "END:VEVENT", "END:VCALENDAR", ""
    ].map(fold).join("\r\n");
  }
  const api = { event };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingCalendar = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
