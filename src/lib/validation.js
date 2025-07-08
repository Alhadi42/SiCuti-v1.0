/**
 * Comprehensive input validation and sanitization utilities
 */

// Regular expressions for validation
const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+62|62|0)[0-9]{9,13}$/,
  nip: /^[0-9]{18}$|^NIPK[0-9]{9}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  name: /^[a-zA-Z\s.,-]{2,100}$/,
  alphanumeric: /^[a-zA-Z0-9\s]{1,255}$/,
  numeric: /^[0-9]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
};

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
];

export class Validator {
  /**
   * Sanitize input to prevent XSS attacks
   */
  static sanitizeInput(input) {
    if (typeof input !== "string") return input;

    let sanitized = input.trim();

    // Remove XSS patterns
    XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");

    return sanitized;
  }

  /**
   * Sanitize input for database storage (less aggressive)
   */
  static sanitizeForDB(input) {
    if (typeof input !== "string") return input;

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove only potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email || typeof email !== "string") {
      return { valid: false, error: "Email is required" };
    }

    const sanitized = this.sanitizeInput(email.toLowerCase());

    if (!REGEX_PATTERNS.email.test(sanitized)) {
      return { valid: false, error: "Invalid email format" };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    if (!password || typeof password !== "string") {
      return { valid: false, error: "Password is required" };
    }

    if (password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters" };
    }

    if (!REGEX_PATTERNS.password.test(password)) {
      return {
        valid: false,
        error: "Password must contain at least one letter and one number",
      };
    }

    return { valid: true, value: password };
  }

  /**
   * Validate username
   */
  static validateUsername(username) {
    if (!username || typeof username !== "string") {
      return { valid: false, error: "Username is required" };
    }

    const sanitized = this.sanitizeInput(username.toLowerCase());

    if (!REGEX_PATTERNS.username.test(sanitized)) {
      return {
        valid: false,
        error:
          "Username must be 3-30 characters, letters, numbers and underscore only",
      };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate NIP (Nomor Induk Pegawai)
   */
  static validateNIP(nip) {
    if (!nip || typeof nip !== "string") {
      return { valid: false, error: "NIP is required" };
    }

    const sanitized = this.sanitizeInput(nip.replace(/\s/g, ""));

    if (!REGEX_PATTERNS.nip.test(sanitized)) {
      return {
        valid: false,
        error: "NIP must be 18 digits or NIPK format (NIPK + 9 digits)",
      };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== "string") {
      return { valid: false, error: "Phone number is required" };
    }

    const sanitized = this.sanitizeInput(phone.replace(/\s|-/g, ""));

    if (!REGEX_PATTERNS.phone.test(sanitized)) {
      return {
        valid: false,
        error: "Invalid Indonesian phone number format",
      };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate name (person or place)
   */
  static validateName(name) {
    if (!name || typeof name !== "string") {
      return { valid: false, error: "Name is required" };
    }

    const sanitized = this.sanitizeForDB(name);

    if (sanitized.length < 2) {
      return { valid: false, error: "Name must be at least 2 characters" };
    }

    if (sanitized.length > 100) {
      return { valid: false, error: "Name must be less than 100 characters" };
    }

    // Check for valid name characters
    if (!REGEX_PATTERNS.name.test(sanitized)) {
      return {
        valid: false,
        error:
          "Name can only contain letters, spaces, dots, commas, and hyphens",
      };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate date in YYYY-MM-DD format
   */
  static validateDate(date) {
    if (!date || typeof date !== "string") {
      return { valid: false, error: "Date is required" };
    }

    const sanitized = this.sanitizeInput(date);

    if (!REGEX_PATTERNS.date.test(sanitized)) {
      return { valid: false, error: "Date must be in YYYY-MM-DD format" };
    }

    const dateObj = new Date(sanitized);
    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: "Invalid date" };
    }

    return { valid: true, value: sanitized };
  }

  /**
   * Validate numeric input
   */
  static validateNumber(value, min = null, max = null) {
    if (value === null || value === undefined || value === "") {
      return { valid: false, error: "Number is required" };
    }

    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: "Must be a valid number" };
    }

    if (min !== null && num < min) {
      return { valid: false, error: `Must be at least ${min}` };
    }

    if (max !== null && num > max) {
      return { valid: false, error: `Must be at most ${max}` };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate file upload
   */
  static validateFile(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    if (!file) {
      return { valid: false, error: "File is required" };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    return { valid: true, value: file };
  }

  /**
   * Validate form data object
   */
  static validateForm(data, rules) {
    const errors = {};
    const validatedData = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      if (
        rule.required &&
        (!value || (typeof value === "string" && !value.trim()))
      ) {
        errors[field] = `${rule.label || field} is required`;
        continue;
      }

      if (!value && !rule.required) {
        validatedData[field] = value;
        continue;
      }

      let result;
      switch (rule.type) {
        case "email":
          result = this.validateEmail(value);
          break;
        case "password":
          result = this.validatePassword(value);
          break;
        case "username":
          result = this.validateUsername(value);
          break;
        case "nip":
          result = this.validateNIP(value);
          break;
        case "phone":
          result = this.validatePhone(value);
          break;
        case "name":
          result = this.validateName(value);
          break;
        case "date":
          result = this.validateDate(value);
          break;
        case "number":
          result = this.validateNumber(value, rule.min, rule.max);
          break;
        case "file":
          result = this.validateFile(value, rule.allowedTypes, rule.maxSize);
          break;
        default:
          result = { valid: true, value: this.sanitizeForDB(value) };
      }

      if (!result.valid) {
        errors[field] = result.error;
      } else {
        validatedData[field] = result.value;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      data: validatedData,
    };
  }
}

export default Validator;
