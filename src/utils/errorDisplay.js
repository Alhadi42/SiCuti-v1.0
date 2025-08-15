/**
 * Utility functions for safely displaying errors to users
 * Prevents [object Object] errors in toast notifications
 */

/**
 * Safely converts any error to a user-friendly string
 * @param {any} error - Error object, string, or any value
 * @param {string} fallback - Fallback message if error is invalid
 * @returns {string} - Safe error message string
 */
export const safeErrorMessage = (error, fallback = "Terjadi kesalahan yang tidak diketahui") => {
  if (!error) return fallback;

  // If it's already a string, return it
  if (typeof error === "string") {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const parts = [error.message];
    if (error.code) parts.push(`(Code: ${error.code})`);
    if (error.details) parts.push(`(Details: ${error.details})`);
    return parts.join(' ') || fallback;
  }

  // Handle objects with error-like properties (Supabase errors)
  if (typeof error === "object" && error !== null) {
    if (error.message) {
      const parts = [error.message];
      if (error.code) parts.push(`(Code: ${error.code})`);
      if (error.details) parts.push(`(Details: ${error.details})`);
      return parts.join(' ');
    }

    // Try to extract useful information
    if (error.code || error.details || error.hint) {
      const parts = [];
      if (error.code) parts.push(`Error ${error.code}`);
      if (error.details) parts.push(error.details);
      if (error.hint) parts.push(`(${error.hint})`);
      return parts.join(': ') || fallback;
    }

    // Last resort: try to stringify
    try {
      const stringified = JSON.stringify(error, null, 2);
      // If it's just {} or similar, use fallback
      if (stringified.trim().length < 10) {
        return fallback;
      }
      return stringified;
    } catch (e) {
      // If JSON.stringify fails
      return fallback;
    }
  }

  // For any other type, convert to string
  const stringified = String(error);
  return stringified === "[object Object]" ? fallback : stringified;
};

/**
 * Enhanced version that also handles arrays and provides context
 * @param {any} error - Error object, string, or any value
 * @param {string} context - Context about where the error occurred
 * @param {string} fallback - Fallback message if error is invalid
 * @returns {string} - Safe error message string with context
 */
export const safeErrorMessageWithContext = (error, context = "", fallback = "Terjadi kesalahan") => {
  const baseMessage = safeErrorMessage(error, fallback);
  
  if (context) {
    return `${context}: ${baseMessage}`;
  }
  
  return baseMessage;
};

/**
 * Safely extracts error code from error objects
 * @param {any} error - Error object
 * @returns {string|null} - Error code or null
 */
export const getErrorCode = (error) => {
  if (!error) return null;
  
  if (typeof error === "object" && error !== null) {
    return error.code || error.errorCode || error.status || null;
  }
  
  return null;
};

/**
 * Checks if error is a network/connection error
 * @param {any} error - Error object
 * @returns {boolean} - True if it's a network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  
  const message = safeErrorMessage(error).toLowerCase();
  const networkKeywords = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'offline',
    'internet',
    'connectivity'
  ];
  
  return networkKeywords.some(keyword => message.includes(keyword));
};

/**
 * Checks if error is an authentication/permission error
 * @param {any} error - Error object
 * @returns {boolean} - True if it's an auth error
 */
export const isAuthError = (error) => {
  if (!error) return false;
  
  const code = getErrorCode(error);
  const message = safeErrorMessage(error).toLowerCase();
  
  const authCodes = ['42501', '401', '403', 'UNAUTHORIZED', 'FORBIDDEN'];
  const authKeywords = [
    'unauthorized',
    'forbidden',
    'permission',
    'authentication',
    'login',
    'token',
    'jwt',
    'row-level security'
  ];
  
  return authCodes.includes(code) || 
         authKeywords.some(keyword => message.includes(keyword));
};

/**
 * Gets user-friendly error message based on error type
 * @param {any} error - Error object
 * @returns {string} - User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (isNetworkError(error)) {
    return "Masalah koneksi internet. Periksa koneksi Anda dan coba lagi.";
  }
  
  if (isAuthError(error)) {
    return "Anda tidak memiliki izin untuk melakukan tindakan ini. Silakan login ulang atau hubungi administrator.";
  }
  
  const code = getErrorCode(error);
  if (code) {
    switch (code) {
      case 'PGRST301':
        return "Data tidak ditemukan dalam sistem.";
      case 'PGRST116':
        return "Tidak ada data yang sesuai dengan kriteria pencarian.";
      case '23505':
        return "Data sudah ada dalam sistem (duplikat).";
      case '23503':
        return "Data ini masih digunakan oleh data lain dan tidak dapat dihapus.";
      default:
        return safeErrorMessage(error);
    }
  }
  
  return safeErrorMessage(error);
};

export default {
  safeErrorMessage,
  safeErrorMessageWithContext,
  getErrorCode,
  isNetworkError,
  isAuthError,
  getUserFriendlyErrorMessage
};
