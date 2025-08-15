/**
 * Debug console utility to help track down [object Object] errors
 */

let originalConsoleError;
let originalConsoleLog;
let originalConsoleWarn;

export const initDebugConsole = () => {
  if (import.meta.env.PROD) return;

  // Store original methods
  originalConsoleError = console.error;
  originalConsoleLog = console.log;
  originalConsoleWarn = console.warn;

  // Override console.error to catch [object Object] errors
  console.error = function (...args) {
    // Check if any argument is [object Object] or contains it
    const hasObjectError = args.some((arg) => {
      const str = String(arg);
      return (
        str === "[object Object]" ||
        str.includes("[object Object]") ||
        (typeof arg === "object" && arg !== null && !arg.message && !arg.stack && !Array.isArray(arg) && !(arg instanceof Error) && !(arg instanceof Date) && Object.keys(arg).length > 0)
      );
    });

    if (hasObjectError) {
      console.group("🔍 [object Object] Error Detected!");
      console.log("Arguments:", args);
      console.log("Stack trace:", new Error().stack);
      console.log("URL:", window.location.href);
      console.log("User Agent:", navigator.userAgent);

      // Try to stringify each argument safely
      args.forEach((arg, index) => {
        console.log(`Arg ${index}:`, {
          type: typeof arg,
          constructor: arg?.constructor?.name,
          value: arg,
          stringified: safeStringify(arg),
        });
      });
      console.groupEnd();

      // Send to global error handler
      if (window.GlobalErrorHandler) {
        window.GlobalErrorHandler.logError({
          type: "object-object-error",
          message: "Detected [object Object] error in console",
          args: args.map((arg) => safeStringify(arg)),
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Process ALL arguments to prevent any [object Object] from appearing
    const processedArgs = args.map((arg) => {
      const str = String(arg);
      if (
        str === "[object Object]" ||
        (typeof arg === "object" && arg !== null && !arg.message && !arg.stack)
      ) {
        return safeStringify(arg);
      }
      return arg;
    });

    originalConsoleError.apply(console, processedArgs);
  };

  console.log(
    "🔍 Debug console initialized - will catch [object Object] errors",
  );
};

export const restoreConsole = () => {
  if (originalConsoleError) {
    console.error = originalConsoleError;
  }
  if (originalConsoleLog) {
    console.log = originalConsoleLog;
  }
  if (originalConsoleWarn) {
    console.warn = originalConsoleWarn;
  }
};

const safeStringify = (obj) => {
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

  if (obj instanceof Error) {
    return `Error: ${obj.message}${obj.stack ? "\nStack: " + obj.stack : ""}`;
  }

  if (typeof obj === "object") {
    // Handle arrays
    if (Array.isArray(obj)) {
      try {
        return `Array[${obj.length}]: ${JSON.stringify(obj.slice(0, 3))}${obj.length > 3 ? "..." : ""}`;
      } catch (e) {
        return `Array[${obj.length}]`;
      }
    }

    // Handle objects with specific properties we care about
    if (obj.message || obj.code || obj.details) {
      const parts = [];
      if (obj.message) parts.push(`message: "${obj.message}"`);
      if (obj.code) parts.push(`code: "${obj.code}"`);
      if (obj.details) parts.push(`details: "${obj.details}"`);
      if (obj.hint) parts.push(`hint: "${obj.hint}"`);
      return `{${parts.join(", ")}}`;
    }

    // Try to stringify with circular reference handling
    try {
      const seen = new WeakSet();
      return JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return "[Circular Reference]";
            }
            seen.add(value);
          }
          return value;
        },
        2,
      );
    } catch (e) {
      // If JSON.stringify fails, build a simple representation
      const constructor = obj.constructor?.name || "Object";
      const keys = Object.keys(obj).slice(0, 3);
      const keyStr =
        keys.length > 0
          ? ` {${keys.join(", ")}${Object.keys(obj).length > 3 ? "..." : ""}}`
          : "";
      return `[${constructor}${keyStr}]`;
    }
  }

  return String(obj);
};

export default { initDebugConsole, restoreConsole };
