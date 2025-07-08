/**
 * Simplified Audit Logger - Fallback to localStorage only
 * This avoids database dependency issues
 */

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  LOGIN_BLOCKED: "login_blocked",
  LOGOUT: "logout",
  SESSION_EXPIRED: "session_expired",

  // User management events
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  PASSWORD_CHANGED: "password_changed",

  // Data access events
  EMPLOYEE_VIEWED: "employee_viewed",
  EMPLOYEE_CREATED: "employee_created",
  EMPLOYEE_UPDATED: "employee_updated",
  EMPLOYEE_DELETED: "employee_deleted",

  // Leave management events
  LEAVE_REQUEST_CREATED: "leave_request_created",
  LEAVE_REQUEST_APPROVED: "leave_request_approved",
  LEAVE_REQUEST_REJECTED: "leave_request_rejected",
  LEAVE_BALANCE_UPDATED: "leave_balance_updated",

  // System events
  SYSTEM_ERROR: "system_error",
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  DATA_EXPORT: "data_export",
  DATA_IMPORT: "data_import",
};

export class AuditLogger {
  static async log(event, details = {}) {
    try {
      const auditEntry = {
        event_type: event,
        user_id: this.getCurrentUserId(),
        user_agent: navigator?.userAgent || "unknown",
        ip_address: "client",
        timestamp: new Date().toISOString(),
        details: JSON.stringify(details),
        session_id: this.getSessionId(),
        id: Date.now() + Math.random(), // Simple ID generation
      };

      // Always log to console in development
      if (import.meta.env.DEV) {
        console.log("🔍 Audit Log:", auditEntry);
      }

      // Store in localStorage (reliable fallback)
      this.logToLocalStorage(auditEntry);
    } catch (error) {
      console.warn("Audit logging error (non-critical):", error.message);
    }
  }

  static getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem("user_data") || "{}");
      return user.id || null;
    } catch {
      return null;
    }
  }

  static getSessionId() {
    return localStorage.getItem("auth_token") || "anonymous";
  }

  static logToLocalStorage(entry) {
    try {
      const logs = JSON.parse(
        localStorage.getItem("audit_logs_fallback") || "[]",
      );
      logs.push(entry);

      // Keep only last 100 entries to prevent storage bloat
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      localStorage.setItem("audit_logs_fallback", JSON.stringify(logs));
    } catch (error) {
      console.warn("Failed to log to localStorage:", error.message);
    }
  }

  // Convenience methods for common events
  static logLogin(username, success, reason = null) {
    this.log(success ? AUDIT_EVENTS.LOGIN_SUCCESS : AUDIT_EVENTS.LOGIN_FAILED, {
      username,
      success,
      reason,
    });
  }

  static logLogout(userId) {
    this.log(AUDIT_EVENTS.LOGOUT, { userId });
  }

  static logDataAccess(dataType, action, recordId = null) {
    this.log(`${dataType}_${action}`, {
      dataType,
      action,
      recordId,
    });
  }

  static logSecurityEvent(eventType, details) {
    this.log(eventType, {
      ...details,
      severity: "high",
    });
  }

  static logSystemError(error, context = null) {
    this.log(AUDIT_EVENTS.SYSTEM_ERROR, {
      error: error.message,
      context,
    });
  }

  // Method to retrieve audit logs from localStorage
  static async getAuditLogs(filters = {}) {
    try {
      const logs = JSON.parse(
        localStorage.getItem("audit_logs_fallback") || "[]",
      );
      let filteredLogs = logs;

      // Apply filters
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.user_id === filters.userId,
        );
      }

      if (filters.eventType) {
        filteredLogs = filteredLogs.filter(
          (log) => log.event_type === filters.eventType,
        );
      }

      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp >= filters.startDate,
        );
      }

      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp <= filters.endDate,
        );
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );

      // Apply limit
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }

      return filteredLogs;
    } catch (error) {
      console.warn("Failed to retrieve audit logs:", error.message);
      return [];
    }
  }

  static getStats() {
    try {
      const logs = JSON.parse(
        localStorage.getItem("audit_logs_fallback") || "[]",
      );
      return {
        total: logs.length,
        today: logs.filter((log) => {
          const logDate = new Date(log.timestamp).toDateString();
          const today = new Date().toDateString();
          return logDate === today;
        }).length,
        lastWeek: logs.filter((log) => {
          const logDate = new Date(log.timestamp);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return logDate >= weekAgo;
        }).length,
      };
    } catch (error) {
      console.warn("Failed to get audit stats:", error.message);
      return { total: 0, today: 0, lastWeek: 0 };
    }
  }

  static clearLogs() {
    try {
      localStorage.removeItem("audit_logs_fallback");
      console.log("Audit logs cleared");
    } catch (error) {
      console.warn("Failed to clear audit logs:", error.message);
    }
  }
}

// Initialize audit logging
if (import.meta.env.DEV) {
  console.log(
    "🔍 Simplified audit logging system initialized (localStorage only)",
  );
}

export default AuditLogger;
