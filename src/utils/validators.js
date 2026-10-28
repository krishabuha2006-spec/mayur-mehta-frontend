export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function isValidPassword(password) {
  if (!password) return false;
  // Must be at least 8 characters and contain both letters and numbers (Module M1.2)
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export function validatePasswordRequirements(password = '') {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    isValid: hasMinLength && hasLetter && hasNumber
  };
}

