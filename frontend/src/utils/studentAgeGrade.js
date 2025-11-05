/**
 * Utility functions for calculating and updating student age and grade
 */

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth (ISO string or Date object)
 * @returns {number|null} Age in years, or null if invalid
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  // If birthday hasn't occurred this year yet, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age >= 0 ? age : null;
}

/**
 * Calculate grade from age (German school system)
 * Typical mapping for German primary/secondary schools:
 * - Age 6-7: Grade 1 (1. Klasse)
 * - Age 7-8: Grade 2 (2. Klasse)
 * - Age 8-9: Grade 3 (3. Klasse)
 * - Age 9-10: Grade 4 (4. Klasse)
 * - Age 10-11: Grade 5 (5. Klasse)
 * - Age 11-12: Grade 6 (6. Klasse)
 * - Age 12-13: Grade 7 (7. Klasse)
 * - Age 13-14: Grade 8 (8. Klasse)
 * - Age 14-15: Grade 9 (9. Klasse)
 * - Age 15-16: Grade 10 (10. Klasse)
 * - Age 16-17: Grade 11 (11. Klasse)
 * - Age 17-18: Grade 12 (12. Klasse)
 * 
 * @param {number} age - Student age
 * @returns {number|null} Grade level, or null if age is invalid
 */
export function calculateGradeFromAge(age) {
  if (!age || age < 6 || age > 18) return null;
  
  // Grade calculation: age 6 = grade 1, age 7 = grade 2, etc.
  // But adjust for typical school entry: most start at age 6-7
  const grade = age - 5; // age 6 -> grade 1, age 7 -> grade 2
  
  // Cap at grade 12 (typical max for German schools)
  return Math.min(Math.max(grade, 1), 12);
}

/**
 * Calculate grade from class name (if class_name contains grade info)
 * @param {string} className - Class name (e.g., "1A", "Klasse 5", "Grade 3")
 * @returns {number|null} Grade level extracted from class name, or null
 */
export function extractGradeFromClassName(className) {
  if (!className) return null;
  
  // Try to extract number from class name
  const match = className.match(/\b(\d{1,2})\b/);
  if (match) {
    const grade = parseInt(match[1], 10);
    if (grade >= 1 && grade <= 12) {
      return grade;
    }
  }
  
  return null;
}

/**
 * Auto-update age and grade for a student
 * @param {Object} student - Student object with age, date_of_birth, class info
 * @param {Object} options - Options for calculation
 * @returns {Object} Updated student data with age and grade
 */
export function autoUpdateAgeAndGrade(student, options = {}) {
  const {
    useDateOfBirth = true,
    useClassName = true,
    preferredAge = null, // If provided, use this instead of calculating
    updateExistingAge = false, // If true, recalculate age even if it exists
  } = options;
  
  const updates = {};
  
  // Calculate age
  if (preferredAge !== null && preferredAge >= 4 && preferredAge <= 18) {
    updates.age = preferredAge;
  } else if (useDateOfBirth && student.date_of_birth) {
    const calculatedAge = calculateAge(student.date_of_birth);
    if (calculatedAge !== null) {
      updates.age = calculatedAge;
    }
  } else if (!student.age || updateExistingAge) {
    // If no age exists or we want to update, try to infer from class name
    if (useClassName && student.class?.class_name) {
      const gradeFromClass = extractGradeFromClassName(student.class.class_name);
      if (gradeFromClass !== null) {
        // Estimate age from grade: grade 1 = age 6-7, grade 2 = age 7-8, etc.
        // Use middle of typical age range: grade + 5
        const estimatedAge = gradeFromClass + 5;
        if (estimatedAge >= 4 && estimatedAge <= 18) {
          updates.age = estimatedAge;
        }
      }
    }
  } else if (student.age) {
    // Keep existing age if it's valid
    if (student.age >= 4 && student.age <= 18) {
      updates.age = student.age;
    }
  }
  
  // Calculate grade from age
  if (updates.age) {
    const gradeFromAge = calculateGradeFromAge(updates.age);
    if (gradeFromAge !== null) {
      updates.grade = gradeFromAge;
    }
  }
  
  // Alternatively, try to extract grade from class name if not calculated from age
  if (!updates.grade && useClassName && student.class?.class_name) {
    const gradeFromClass = extractGradeFromClassName(student.class.class_name);
    if (gradeFromClass !== null) {
      updates.grade = gradeFromClass;
    }
  }
  
  return updates;
}

/**
 * Batch update age and grade for multiple students
 * @param {Array} students - Array of student objects
 * @param {Object} options - Options for calculation
 * @returns {Array} Array of updates with student ID and updated fields
 */
export function batchUpdateAgeAndGrade(students, options = {}) {
  if (!Array.isArray(students)) return [];
  
  return students.map(student => {
    const updates = autoUpdateAgeAndGrade(student, options);
    return {
      studentId: student.id || student.user_id,
      ...updates
    };
  }).filter(update => Object.keys(update).length > 1); // Only return updates with changes
}

