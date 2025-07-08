/**
 * Rate Limiting untuk mencegah brute force attacks
 */

const RATE_LIMIT_KEY_PREFIX = "rate_limit_";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_WINDOW = 60 * 1000; // 1 minute window

export class RateLimiter {
  static getKey(identifier) {
    return `${RATE_LIMIT_KEY_PREFIX}${identifier}`;
  }

  static getAttemptData(identifier) {
    try {
      const key = this.getKey(identifier);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error reading rate limit data:", error);
      return null;
    }
  }

  static setAttemptData(identifier, data) {
    try {
      const key = this.getKey(identifier);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving rate limit data:", error);
    }
  }

  static clearAttemptData(identifier) {
    try {
      const key = this.getKey(identifier);
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error clearing rate limit data:", error);
    }
  }

  static isBlocked(identifier) {
    const data = this.getAttemptData(identifier);
    if (!data) return false;

    const now = Date.now();

    // Check if lockout period has expired
    if (data.lockedUntil && now < data.lockedUntil) {
      return {
        blocked: true,
        remainingTime: Math.ceil((data.lockedUntil - now) / 1000),
        attempts: data.attempts,
      };
    }

    // Check if we're in a new time window
    if (now - data.firstAttempt > ATTEMPT_WINDOW) {
      this.clearAttemptData(identifier);
      return false;
    }

    return false;
  }

  static recordAttempt(identifier, success = false) {
    const now = Date.now();
    let data = this.getAttemptData(identifier);

    if (success) {
      // Clear attempts on successful login
      this.clearAttemptData(identifier);
      return { success: true };
    }

    if (!data) {
      // First failed attempt
      data = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
    } else {
      // Check if we're in a new time window
      if (now - data.firstAttempt > ATTEMPT_WINDOW) {
        data = {
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
        };
      } else {
        data.attempts += 1;
        data.lastAttempt = now;
      }
    }

    // Check if max attempts reached
    if (data.attempts >= MAX_ATTEMPTS) {
      data.lockedUntil = now + LOCKOUT_DURATION;
    }

    this.setAttemptData(identifier, data);

    return {
      success: false,
      attempts: data.attempts,
      maxAttempts: MAX_ATTEMPTS,
      lockedUntil: data.lockedUntil,
      remainingTime: data.lockedUntil
        ? Math.ceil((data.lockedUntil - now) / 1000)
        : null,
    };
  }

  static getRemainingAttempts(identifier) {
    const data = this.getAttemptData(identifier);
    if (!data) return MAX_ATTEMPTS;

    const now = Date.now();

    // Check if we're in a new time window
    if (now - data.firstAttempt > ATTEMPT_WINDOW) {
      return MAX_ATTEMPTS;
    }

    return Math.max(0, MAX_ATTEMPTS - data.attempts);
  }

  static formatTimeRemaining(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes} menit ${remainingSeconds} detik`;
    }
    return `${remainingSeconds} detik`;
  }
}

// Utility untuk membersihkan data rate limiting yang expired
export const cleanupExpiredRateLimits = () => {
  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RATE_LIMIT_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));

          // Remove if lockout has expired and no recent attempts
          if (
            data.lockedUntil &&
            now > data.lockedUntil &&
            now - data.lastAttempt > ATTEMPT_WINDOW
          ) {
            keysToRemove.push(key);
          }

          // Remove if attempt window has expired
          else if (
            !data.lockedUntil &&
            now - data.firstAttempt > ATTEMPT_WINDOW
          ) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove corrupted data
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Error cleaning up rate limits:", error);
  }
};

// Jalankan cleanup saat module dimuat
cleanupExpiredRateLimits();
