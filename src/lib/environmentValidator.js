/**
 * Environment variables validation and configuration
 */

// Required environment variables
const REQUIRED_ENV_VARS = {
  VITE_SUPABASE_URL: {
    required: true,
    validate: (value) => value && value.startsWith("https://"),
    error: "VITE_SUPABASE_URL must be a valid HTTPS URL",
  },
  VITE_SUPABASE_ANON_KEY: {
    required: true,
    validate: (value) => value && value.length > 50,
    error: "VITE_SUPABASE_ANON_KEY must be a valid Supabase anonymous key",
  },
};

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  VITE_APP_VERSION: {
    default: "1.0.0",
    validate: (value) => /^\d+\.\d+\.\d+/.test(value),
  },
  VITE_TEMPO: {
    default: "false",
    validate: (value) => ["true", "false"].includes(value),
  },
};

export class EnvironmentValidator {
  static errors = [];
  static warnings = [];

  static validate() {
    this.errors = [];
    this.warnings = [];

    // Validate required variables
    for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
      const value = import.meta.env[key];

      if (!value) {
        this.errors.push(`Missing required environment variable: ${key}`);
        continue;
      }

      if (config.validate && !config.validate(value)) {
        this.errors.push(config.error || `Invalid value for ${key}`);
      }
    }

    // Validate optional variables
    for (const [key, config] of Object.entries(OPTIONAL_ENV_VARS)) {
      const value = import.meta.env[key];

      if (value && config.validate && !config.validate(value)) {
        this.warnings.push(
          `Invalid value for optional variable ${key}: ${value}`,
        );
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  static getConfig() {
    const validation = this.validate();

    if (!validation.isValid) {
      throw new Error(
        `Environment validation failed:\n${validation.errors.join("\n")}`,
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn("Environment warnings:", validation.warnings);
    }

    return {
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      app: {
        version:
          import.meta.env.VITE_APP_VERSION ||
          OPTIONAL_ENV_VARS.VITE_APP_VERSION.default,
        tempo: import.meta.env.VITE_TEMPO === "true",
      },
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
    };
  }

  static logConfiguration() {
    const config = this.getConfig();

    console.group("🔧 Application Configuration");
    console.log("Environment:", config.isDev ? "Development" : "Production");
    console.log("Version:", config.app.version);
    console.log("Supabase URL:", config.supabase.url);
    console.log("Tempo enabled:", config.app.tempo);
    console.groupEnd();
  }
}

// Validate on module load
try {
  EnvironmentValidator.validate();
  if (import.meta.env.DEV) {
    EnvironmentValidator.logConfiguration();
  }
} catch (error) {
  console.error("❌ Environment validation failed:", error.message);
}

export default EnvironmentValidator;
