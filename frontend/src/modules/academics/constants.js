// src/modules/academics/constants.js
export const BUNDESLAENDER = [
  "Baden-Württemberg","Bayern","Berlin","Brandenburg","Bremen","Hamburg","Hessen",
  "Mecklenburg-Vorpommern","Niedersachsen","Nordrhein-Westfalen","Rheinland-Pfalz",
  "Saarland","Sachsen","Sachsen-Anhalt","Schleswig-Holstein","Thüringen"
];

export const GRADES = Array.from({ length: 13 }, (_, i) => i + 1); // 1..13
export const CURRICULUM_STATUSES = ["draft", "review", "published", "archived"];
