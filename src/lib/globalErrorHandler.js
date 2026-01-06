/**
 * Global error handling and logging
 */

import { AuthManager } from "./auth";
import { AuditLogger, AUDIT_EVENTS } from "./auditLogger";

// Utility to safely convert any error to string
const safeStringifyError = (error) => {
  if (!error) return "Unknown error";

  if (typeof error === "string") {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const parts = [`Error: ${error.message}`];
    if (error.name && error.name !== 'Error') parts.unshift(`${error.name}:`);
    if (error.code) parts.push(`Code: ${error.code}`);
    if (error.details) parts.push(`Details: ${error.details}`);
    if (error.hint) parts.push(`Hint: ${error.hint}`);
    return parts.join(' ');
  }

  // Handle objects with error-like properties
  if (error.message) {
    const parts = [error.message];
    if (error.code) parts.push(`(Code: ${error.code})`);
    if (error.details) parts.push(`(Details: ${error.details})`);
    return parts.join(' ');
  }

  if (typeof error === "object") {
    // Handle special Supabase error format
    if (error.code || error.details || error.hint) {
      const parts = [];
      if (error.message) parts.push(error.message);
      if (error.code) parts.push(`Code: ${error.code}`);
      if (error.details) parts.push(`Details: ${error.details}`);
      if (error.hint) parts.push(`Hint: ${error.hint}`);
      return parts.join(' | ');
    }

    try {
      // Handle circular references
      const seen = new WeakSet();
      return JSON.stringify(error, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]";
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (e) {
      // If JSON.stringify fails, create a descriptive string
      const constructor = error.constructor?.name || "Object";
      const keys = Object.keys(error).slice(0, 3);
      const preview = keys.length > 0 ? ` {${keys.join(', ')}}` : '';
      return `[${constructor}${preview}]`;
    }
  }

  return String(error);
};

export class GlobalErrorHandler {
  static isInitialized = false;
  static errorQueue = [];
  static maxQueueSize = 100;

  static init() {
    if (this.isInitialized) return;

    // Handle unhandled promise rejections
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );

    // Handle JavaScript errors
    window.addEventListener("error", this.handleError);

    // Store original console methods for ResizeObserver suppression
    if (!window._originalConsoleWarn) {
      window._originalConsoleWarn = console.warn;

      // Define ResizeObserver patterns once at the top level
      const resizeObserverPatterns = [
        'ResizeObserver loop',
        'ResizeObserver loop completed with undelivered notifications',
        'ResizeObserver: loop completed with undelivered notifications',
        'ResizeObserver: loop limit exceeded',
        'ResizeObserver loop limit exceeded',
        'loop completed with undelivered notifications',
        'ResizeObserver callback',
        'ResizeObserver.observe'
      ];

      // Override console.warn to suppress ResizeObserver errors
      console.warn = (...args) => {
        const message = args.map(arg => String(arg)).join(' ');

        const isResizeObserverMessage = resizeObserverPatterns.some(pattern =>
          message.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isResizeObserverMessage) {
          // Suppress ResizeObserver warnings completely in production
          if (import.meta.env.DEV) {
            return window._originalConsoleWarn("🔄 ResizeObserver suppressed:", message);
          }
          return;
        }
        return window._originalConsoleWarn.apply(console, args);
      };

      // Also override console.error for ResizeObserver errors that appear as errors
      if (!window._originalConsoleError) {
        window._originalConsoleError = console.error;

        console.error = (...args) => {
          const message = args.map(arg => String(arg)).join(' ');

          const isResizeObserverError = resizeObserverPatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (isResizeObserverError) {
            if (import.meta.env.DEV) {
              return window._originalConsoleError("🔄 ResizeObserver error suppressed:", message);
            }
            return;
          }
          return window._originalConsoleError.apply(console, args);
        };
      }
    }

    // Handle React error boundary errors (will be caught by ErrorBoundary)
    // This is backup for errors that might escape the boundary

    this.isInitialized = true;
    console.log("🛡️ Global error handler initialized with ResizeObserver suppression");
  }

  static handleUnhandledRejection = (event) => {
    const message = event.reason
      ? safeStringifyError(event.reason)
      : "Unhandled promise rejection";
    const stack = event.reason?.stack;

    const error = {
      type: "unhandledrejection",
      message,
      stack,
      reason: event.reason,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user: (AuthManager?.getUserSession && AuthManager.getUserSession()?.id) || "anonymous",
    };

    this.logError(error);

    // Prevent default browser error logging in production
    if (import.meta.env.PROD) {
      event.preventDefault();
    }
  };

  static handleError = (event) => {
    // Comprehensive ResizeObserver error suppression
    const errorMessage = event.message || String(event.error) || '';
    const errorStack = event.error?.stack || '';
    const errorString = event.error?.toString() || '';

    // Check all possible ResizeObserver error patterns
    const resizeObserverPatterns = [
      'ResizeObserver loop',
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver: loop completed with undelivered notifications',
      'ResizeObserver: loop limit exceeded',
      'ResizeObserver loop limit exceeded',
      'loop completed with undelivered notifications',
      'ResizeObserver callback',
      'ResizeObserver.observe'
    ];

    const isResizeObserverError = resizeObserverPatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorStack.toLowerCase().includes(pattern.toLowerCase()) ||
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isResizeObserverError) {
      // Completely suppress in production, minimal logging in dev
      if (import.meta.env.DEV) {
        console.warn("🔄 ResizeObserver error suppressed:", errorMessage);
      }
      // Prevent default browser error handling
      if (event.preventDefault) event.preventDefault();
      return false;
    }

    const error = {
      type: "javascript",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user: (AuthManager?.getUserSession && AuthManager.getUserSession()?.id) || "anonymous",
    };

    this.logError(error);
  };

  static logError(error) {
    // Add to error queue
    this.errorQueue.push(error);

    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group("🚨 Global Error Handler");
      console.error("Error:", error);
      console.groupEnd();
    }

    // Log critical errors to audit system
    if (this.isCriticalError(error)) {
      try {
        if (AuditLogger && AuditLogger.logSecurityEvent && AUDIT_EVENTS) {
          AuditLogger.logSecurityEvent(AUDIT_EVENTS.SYSTEM_ERROR, {
            error: error.message,
            type: error.type,
            user: error.user,
          });
        }
      } catch (auditError) {
        // Non-critical: audit logging failure shouldn't break error handling
        if (import.meta.env.DEV) {
          console.warn("Failed to log to audit system:", auditError);
        }
      }
    }

    // Send to external error tracking service in production
    if (import.meta.env.PROD) {
      this.sendToErrorTracker(error);
    }
  }

  static isCriticalError(error) {
    const criticalPatterns = [
      "network",
      "supabase",
      "authentication",
      "database",
      "permission",
      "unauthorized",
    ];

    return criticalPatterns.some((pattern) =>
      error.message?.toLowerCase().includes(pattern),
    );
  }

  static sendToErrorTracker(error) {
    // In production, you'd send to services like Sentry, LogRocket, etc.
    // For now, we'll just store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("error_logs") || "[]",
      );
      existingErrors.push(error);

      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }

      localStorage.setItem("error_logs", JSON.stringify(existingErrors));
    } catch (e) {
      console.warn("Failed to store error log:", e);
    }
  }

  static getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem("error_logs") || "[]");
    } catch (e) {
      return [];
    }
  }

  static clearErrorLogs() {
    localStorage.removeItem("error_logs");
    this.errorQueue = [];
  }

  static getErrorStats() {
    const logs = this.getErrorLogs();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    return {
      total: logs.length,
      lastHour: logs.filter(
        (log) => now - new Date(log.timestamp).getTime() < oneHour,
      ).length,
      lastDay: logs.filter(
        (log) => now - new Date(log.timestamp).getTime() < oneDay,
      ).length,
      byType: logs.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {}),
      critical: logs.filter((log) => this.isCriticalError(log)).length,
    };
  }

  static cleanup() {
    if (!this.isInitialized) return;

    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );
    window.removeEventListener("error", this.handleError);

    this.isInitialized = false;
  }
}

// Utility functions for handling specific error types
export const handleSupabaseError = (error, context = "") => {
  const message = safeStringifyError(error);
  const code = error?.code;
  const details = error?.details;
  const hint = error?.hint;

  const errorInfo = {
    type: "supabase",
    message,
    code,
    details,
    hint,
    context,
    timestamp: new Date().toISOString(),
  };

  GlobalErrorHandler.logError(errorInfo);

  // Return user-friendly message
  if (code === "PGRST116") {
    return "Data tidak ditemukan";
  }

  if (message?.includes("JWT")) {
    return "Sesi telah berakhir, silakan login kembali";
  }

  if (message?.includes("duplicate key")) {
    return "Data sudah ada dalam sistem";
  }

  return "Terjadi kesalahan pada database";
};

export const handleNetworkError = (error, context = "") => {
  const message = safeStringifyError(error);

  const errorInfo = {
    type: "network",
    message,
    context,
    timestamp: new Date().toISOString(),
    offline: !navigator.onLine,
  };

  GlobalErrorHandler.logError(errorInfo);

  if (!navigator.onLine) {
    return "Tidak ada koneksi internet";
  }

  return "Terjadi kesalahan jaringan";
};

export const handleValidationError = (errors, context = "") => {
  const errorInfo = {
    type: "validation",
    message: "Validation failed",
    errors,
    context,
    timestamp: new Date().toISOString(),
  };

  GlobalErrorHandler.logError(errorInfo);

  return "Data yang dimasukkan tidak valid";
};

// Initialize error handler
if (typeof window !== "undefined") {
  GlobalErrorHandler.init();
}

export default GlobalErrorHandler;