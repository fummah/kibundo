// src/utils/dateFormat.js
export function formatDayLabel(date, locale = "de") {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");

  // Map Sunday (0) -> index 6 to get Mon-first ordering
  const idx = (d.getDay() + 6) % 7;

  const de = ["Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa.", "So."];
  const en = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat.", "Sun."];

  const name = (locale === "de" ? de : en)[idx];
  return `${name} ${dd}`;
}
