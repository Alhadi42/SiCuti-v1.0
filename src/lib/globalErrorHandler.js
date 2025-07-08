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

  if (error.message) {
    return error.message;
  }

  if (typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return String(error);
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

    // Handle React error boundary errors (will be caught by ErrorBoundary)
    // This is backup for errors that might escape the boundary

    this.isInitialized = true;
    console.log("🛡️ Global error handler initialized");
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
      user: AuthManager.getUserSession()?.id || "anonymous",
    };

    this.logError(error);

    // Prevent default browser error logging in production
    if (import.meta.env.PROD) {
      event.preventDefault();
    }
  };

  static handleError = (event) => {
    const error = {
      type: "javascript",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user: AuthManager.getUserSession()?.id || "anonymous",
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
      AuditLogger.logSecurityEvent(AUDIT_EVENTS.SYSTEM_ERROR, {
        error: error.message,
        type: error.type,
        user: error.user,
      });
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
