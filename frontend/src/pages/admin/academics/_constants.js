// src/pages/admin/academics/_constants.js

// German states (Bundesländer)
export const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

// School grades (1–12)
export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

// Shared statuses for curriculum/quiz/etc.
export const CURRICULUM_STATUSES = ["draft", "review", "published", "archived"];
