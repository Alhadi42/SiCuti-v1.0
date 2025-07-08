/**
 * Safe error message extraction utilities
 */

export const getSafeErrorMessage = (
  error,
  fallback = "Terjadi kesalahan yang tidak diketahui",
) => {
  if (!error) return fallback;

  // If it's already a string
  if (typeof error === "string") {
    return error || fallback;
  }

  // If it has a message property
  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  // If it's a Supabase error with details
  if (error.details && typeof error.details === "string") {
    return error.details;
  }

  // If it's an HTTP error with status text
  if (error.statusText && typeof error.statusText === "string") {
    return error.statusText;
  }

  // If it's an object, try to extract meaningful info
  if (typeof error === "object") {
    // Handle Supabase specific errors
    if (error.code) {
      const message =
        error.message || error.details || error.hint || "Database error";
      return `${message} (Code: ${error.code})`;
    }

    // Handle network errors
    if (error.name === "TypeError" && error.message) {
      return `Network error: ${error.message}`;
    }

    // Try to stringify object safely
    try {
      const stringified = JSON.stringify(error, null, 2);
      if (stringified !== "{}") {
        return stringified;
      }
    } catch (e) {
      // JSON.stringify failed
    }

    // Last resort - use constructor name
    if (error.constructor && error.constructor.name) {
      return `Error: ${error.constructor.name}`;
    }
  }

  // Ultimate fallback
  return fallback;
};

export const formatErrorForToast = (error, context = "") => {
  const message = getSafeErrorMessage(error);

  return {
    variant: "destructive",
    title: context ? `❌ ${context}` : "❌ Error",
    description: message,
  };
};

export const formatErrorForConsole = (error, context = "") => {
  const message = getSafeErrorMessage(error);
  const prefix = context ? `[${context}] ` : "";

  if (import.meta.env.DEV && error?.stack) {
    console.error(`${prefix}${message}`);
    console.error("Stack trace:", error.stack);
  } else {
    console.error(`${prefix}${message}`);
  }
};

export default {
  getSafeErrorMessage,
  formatErrorForToast,
  formatErrorForConsole,
};
