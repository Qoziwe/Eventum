import * as Crypto from 'expo-crypto';

/**
 * Password Hashing (we use SHA-256 for simplicity in the mobile application)
 * IN production it should be on the server with bcrypt!
 */
export async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

/**
 * Password verification
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  return passwordHash === hash;
}

/**
 * Generation of safe ID
 */
export function generateSecureId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  const extraRandom = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomPart}_${extraRandom}` : `${timestamp}_${randomPart}_${extraRandom}`;
}

/**
 * Validation email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password Validation
 * Minimum 8 characters, at least one letter and one number
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'The password must contain at least 8 characters' };
  }
  if (!/[a-zA-Za-zA-Z]/.test(password)) {
    return { valid: false, message: 'The password must contain at least one letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'The password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Text sanitization (removing potentially dangerous characters)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validation URL images
 */
export function validateImageUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  
  try {
    const parsedUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Blocking dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
    if (dangerousProtocols.some(proto => url.toLowerCase().includes(proto))) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Phone format validation (Kazakhstan format)
 */
export function validatePhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Checking the formats: +7XXXXXXXXXX, 7XXXXXXXXXX, 8XXXXXXXXXX
  const patterns = [
    /^\+7\d{10}$/,  // +7XXXXXXXXXX
    /^7\d{10}$/,    // 7XXXXXXXXXX
    /^8\d{10}$/,    // 8XXXXXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Formatting your phone for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
    return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
  }
  
  return phone;
}
