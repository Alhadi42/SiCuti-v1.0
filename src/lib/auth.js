import { supabase } from "./supabaseClient";
import bcrypt from "bcryptjs";
import { RateLimiter } from "./rateLimiter";
import { AuditLogger, AUDIT_EVENTS } from "./auditLogger";

// Token management with expiration
const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";
const EXPIRY_KEY = "token_expiry";
const TOKEN_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class AuthManager {
  static setUserSession(user) {
    const expiryTime = Date.now() + TOKEN_DURATION;

    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, `auth_${Date.now()}`);
      localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error("Failed to set user session:", error);
      throw new Error("Failed to save login session");
    }
  }

  static getUserSession() {
    try {
      const user = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      const expiry = localStorage.getItem(EXPIRY_KEY);

      if (!user || !token || !expiry) {
        return null;
      }

      // Check if token is expired
      if (Date.now() > parseInt(expiry)) {
        this.clearSession();
        return null;
      }

      return JSON.parse(user);
    } catch (error) {
      console.error("Failed to get user session:", error);
      this.clearSession();
      return null;
    }
  }

  static clearSession() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  static isAuthenticated() {
    return this.getUserSession() !== null;
  }

  static async login(username, password) {
    if (!username || !password) {
      throw new Error("Username dan password wajib diisi");
    }

    // Input sanitization
    const sanitizedUsername = username.trim().toLowerCase();

    // Check rate limiting
    const rateLimitCheck = RateLimiter.isBlocked(sanitizedUsername);
    if (rateLimitCheck && rateLimitCheck.blocked) {
      const timeRemaining = RateLimiter.formatTimeRemaining(
        rateLimitCheck.remainingTime,
      );
      AuditLogger.logSecurityEvent(AUDIT_EVENTS.LOGIN_BLOCKED, {
        username: sanitizedUsername,
        attempts: rateLimitCheck.attempts,
        remainingTime: rateLimitCheck.remainingTime,
      });
      throw new Error(
        `Terlalu banyak percobaan login. Coba lagi dalam ${timeRemaining}`,
      );
    }

    try {
      // Get user from database
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", sanitizedUsername)
        .single();

      if (error || !user) {
        // Record failed attempt
        RateLimiter.recordAttempt(sanitizedUsername, false);
        AuditLogger.logLogin(
          sanitizedUsername,
          false,
          "Username tidak ditemukan",
        );
        throw new Error("Username tidak ditemukan");
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        // Record failed attempt
        const attemptResult = RateLimiter.recordAttempt(
          sanitizedUsername,
          false,
        );
        const remaining = RateLimiter.getRemainingAttempts(sanitizedUsername);

        AuditLogger.logLogin(sanitizedUsername, false, "Password salah");

        if (attemptResult.lockedUntil) {
          const timeRemaining = RateLimiter.formatTimeRemaining(
            attemptResult.remainingTime,
          );
          throw new Error(
            `Password salah. Akun diblokir selama ${timeRemaining}`,
          );
        } else {
          throw new Error(`Password salah. ${remaining} percobaan tersisa`);
        }
      }

      // Record successful attempt
      RateLimiter.recordAttempt(sanitizedUsername, true);
      AuditLogger.logLogin(sanitizedUsername, true);

      // Remove sensitive data before storing
      const { password: _, ...safeUser } = user;

      // Set session
      this.setUserSession(safeUser);

      return safeUser;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  static logout() {
    const user = this.getUserSession();
    AuditLogger.logLogout(user?.id);
    this.clearSession();
  }

  static hasRole(requiredRole) {
    const user = this.getUserSession();
    if (!user) return false;

    const roleHierarchy = {
      employee: 1,
      admin_unit: 2,
      master_admin: 3,
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 999;

    return userLevel >= requiredLevel;
  }

  static canAccessUnit(unitName) {
    const user = this.getUserSession();
    if (!user) return false;

    // Master admin can access everything
    if (user.role === "master_admin") return true;

    // Admin unit can only access their own unit
    if (user.role === "admin_unit") {
      return user.unit_kerja === unitName;
    }

    // Employees can only access their own data
    return false;
  }
}

// Input sanitization helpers
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/[<>]/g, "") // Basic XSS protection
    .substring(0, 255); // Limit length
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};
