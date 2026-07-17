/**
 * Calculating user's age by date of birth
 */
export function calculateUserAge(birthDate: string): number {
  if (!birthDate) return 0;
  
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  
  if (isNaN(birthDateObj.getTime())) return 0;
  
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validation of date of birth
 */
export function validateBirthDate(birthDate: string): { valid: boolean; message?: string } {
  if (!birthDate) {
    return { valid: false, message: 'Date of birth is required' };
  }
  
  const date = new Date(birthDate);
  
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Incorrect date format' };
  }
  
  const today = new Date();
  if (date > today) {
    return { valid: false, message: 'Date of birth cannot be in the future' };
  }
  
  const age = calculateUserAge(birthDate);
  if (age < 0 || age > 150) {
    return { valid: false, message: 'Incorrect age' };
  }
  
  return { valid: true };
}

/**
 * Event date format validation
 */
export function validateEventDate(year: string, month: string, day: string): { valid: boolean; message?: string } {
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  
  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
    return { valid: false, message: 'Incorrect date values' };
  }
  
  const date = new Date(yearNum, monthNum, dayNum);
  
  if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum || date.getDate() !== dayNum) {
    return { valid: false, message: 'Invalid date' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, message: 'The date of the event cannot be in the past' };
  }
  
  return { valid: true };
}
