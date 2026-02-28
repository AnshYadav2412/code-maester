"use strict";

/**
 * Maps a numeric score (0-100) to a letter grade.
 * Follows a standard academic grading scale.
 */
const GRADE_THRESHOLDS = [
  { min: 97, grade: "A+" },
  { min: 93, grade: "A" },
  { min: 90, grade: "A-" },
  { min: 87, grade: "B+" },
  { min: 83, grade: "B" },
  { min: 80, grade: "B-" },
  { min: 77, grade: "C+" },
  { min: 73, grade: "C" },
  { min: 70, grade: "C-" },
  { min: 67, grade: "D+" },
  { min: 63, grade: "D" },
  { min: 60, grade: "D-" },
  { min: 0, grade: "F" },
];

/**
 * Returns the letter grade for a given numeric score.
 * @param {number} score - 0 to 100
 * @returns {string} letter grade
 */
function getGrade(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const entry = GRADE_THRESHOLDS.find((t) => clamped >= t.min);
  return entry ? entry.grade : "F";
}

/**
 * Returns a human-readable label for a grade.
 * @param {string} grade
 * @returns {string}
 */
function getGradeLabel(grade) {
  const labels = {
    "A+": "Exceptional",
    A: "Excellent",
    "A-": "Very Good",
    "B+": "Good",
    B: "Above Average",
    "B-": "Slightly Above Average",
    "C+": "Average",
    C: "Acceptable",
    "C-": "Below Average",
    "D+": "Poor",
    D: "Very Poor",
    "D-": "Barely Passing",
    F: "Failing",
  };
  return labels[grade] || "Unknown";
}

/**
 * Returns a colour hex code for UI rendering based on grade.
 * @param {string} grade
 * @returns {string} hex colour
 */
function getGradeColour(grade) {
  if (grade.startsWith("A")) return "#22c55e"; // green
  if (grade.startsWith("B")) return "#84cc16"; // lime
  if (grade.startsWith("C")) return "#eab308"; // yellow
  if (grade.startsWith("D")) return "#f97316"; // orange
  return "#ef4444"; // red for F
}

module.exports = { getGrade, getGradeLabel, getGradeColour };
