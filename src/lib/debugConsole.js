/**
 * Debug console utility to help track down [object Object] errors
 */

let originalConsoleError;
let originalConsoleLog;
let originalConsoleWarn;
let isProcessing = false; // Recursion protection
let errorCount = 0; // Error tracking
let isDisabled = false; // Emergency disable

export const initDebugConsole = () => {
  // Check if disabled due to previous errors
  if (isDisabled) {
    return;
  }

  // Use original console for initialization message
  if (originalConsoleLog) {
    originalConsoleLog.call(console, "🔍 Re-initializing debug console...");
  } else {
    console.log("🔍 Initializing debug console...");
  }

  if (import.meta.env.PROD) {
    return;
  }

  // Store original methods (or use existing stored versions)
  if (!originalConsoleError) {
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    console.log("🔍 Stored original console methods");
  } else {
    console.log("🔍 Using previously stored console methods");
  }

  // Create enhanced console override function
  const createEnhancedConsole = (originalFn, methodName) => {
    return function (...args) {
      // Prevent infinite recursion
      if (isProcessing) {
        return originalFn.apply(console, args);
      }

      isProcessing = true;

      try {
        // Check if any argument is [object Object] or contains it
      const hasObjectError = args.some((arg) => {
        const str = String(arg);
        return (
          str === "[object Object]" ||
          str.includes("[object Object]") ||
          (str.match(/^\[object \w+\]$/) && !str.match(/^\[object (Error|Date|Array|Function|RegExp|Promise)\]$/)) ||
          (typeof arg === "object" && arg !== null &&
           !Array.isArray(arg) &&
           !(arg instanceof Error) &&
           !(arg instanceof Date) &&
           !(arg instanceof RegExp) &&
           !(arg instanceof Function) &&
           arg.constructor === Object)
        );
      });

      if (hasObjectError && methodName === 'error') {
        originalConsoleLog.call(console, "🔍 [object Object] Error Detected!");
        originalConsoleLog.call(console, "Arguments:", args.map(arg => safeStringify(arg)));
        originalConsoleLog.call(console, "Stack trace:", new Error().stack);
        originalConsoleLog.call(console, "URL:", window.location.href);

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
        // Handle null and undefined first
        if (arg === null || arg === undefined) {
          return arg;
        }

        const str = String(arg);

        // Direct check for [object Object] string
        if (str === "[object Object]") {
          return safeStringify(arg);
        }

        // Check for other [object Type] patterns that aren't useful
        if (str.match(/^\[object \w+\]$/) &&
            !str.match(/^\[object (Error|Date|Array|Function|RegExp|Promise)\]$/)) {
          return safeStringify(arg);
        }

        // Check for plain objects that would stringify to [object Object]
        if (typeof arg === "object" && arg !== null &&
            !Array.isArray(arg) &&
            !(arg instanceof Error) &&
            !(arg instanceof Date) &&
            !(arg instanceof RegExp) &&
            !(arg instanceof Function) &&
            arg.constructor === Object) {
          return safeStringify(arg);
        }

        return arg;
      });

        originalFn.apply(console, processedArgs);
      } catch (recursionError) {
        errorCount++;
        if (errorCount > 3) {
          // Emergency disable after too many errors
          isDisabled = true;
          restoreConsole();
          originalConsoleError.call(console, "🚨 Debug console disabled due to errors");
        }
        // Fallback to original method
        originalFn.apply(console, args);
      } finally {
        isProcessing = false;
      }
    };
  };

  // Override all console methods
  console.error = createEnhancedConsole(originalConsoleError, 'error');
  console.log = createEnhancedConsole(originalConsoleLog, 'log');
  console.warn = createEnhancedConsole(originalConsoleWarn, 'warn');

  console.log(
    "🔍 Debug console initialized - will catch [object Object] errors",
  );

  // Set flag to indicate initialization is complete
  window._debugConsoleInitialized = true;

  // Use original methods for verification to avoid recursion
  const testObj = { test: "verification test", status: "initialized" };
  originalConsoleLog.call(console, "✅ Console override verification - this object should be stringified:", safeStringify(testObj));

  // Test with a simple, safe test
  setTimeout(() => {
    try {
      console.log("Safe test:", { simple: "test" });
    } catch (testError) {
      originalConsoleError.call(console, "Console override test failed:", testError);
    }
  }, 100);
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
  if (typeof obj === "function") return `[Function: ${obj.name || "anonymous"}]`;

  if (obj instanceof Error) {
    return `Error: ${obj.message}${obj.stack ? "\nStack: " + obj.stack : ""}`;
  }

  if (obj instanceof Date) {
    return `Date: ${obj.toISOString()}`;
  }

  if (obj instanceof RegExp) {
    return `RegExp: ${obj.toString()}`;
  }

  if (typeof obj === "object") {
    // Handle arrays
    if (Array.isArray(obj)) {
      try {
        if (obj.length === 0) return "[]";
        const preview = obj.slice(0, 3).map(item => {
          if (typeof item === "object" && item !== null) {
            return typeof item === "object" ? "{...}" : String(item);
          }
          return item;
        });
        return `Array[${obj.length}]: [${preview.join(", ")}${obj.length > 3 ? ", ..." : ""}]`;
      } catch (e) {
        return `Array[${obj.length}]`;
      }
    }

    // Handle objects with specific error-like properties first
    if (obj.message || obj.code || obj.details || obj.error) {
      const parts = [];
      if (obj.message) parts.push(`message: "${obj.message}"`);
      if (obj.code) parts.push(`code: "${obj.code}"`);
      if (obj.details) parts.push(`details: "${obj.details}"`);
      if (obj.hint) parts.push(`hint: "${obj.hint}"`);
      if (obj.error && typeof obj.error === "string") parts.push(`error: "${obj.error}"`);
      if (parts.length > 0) {
        return `{${parts.join(", ")}}`;
      }
    }

    // Try to stringify with circular reference handling
    try {
      const seen = new WeakSet();
      const result = JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return "[Circular Reference]";
            }
            seen.add(value);
          }
          // Handle functions in objects
          if (typeof value === "function") {
            return `[Function: ${value.name || "anonymous"}]`;
          }
          return value;
        },
        2,
      );

      // If result is too long, truncate it
      if (result.length > 1000) {
        return result.substring(0, 1000) + "... (truncated)";
      }

      return result;
    } catch (e) {
      // If JSON.stringify fails, build a simple representation
      try {
        const constructor = obj.constructor?.name || "Object";
        const keys = Object.keys(obj).slice(0, 5);
        const keyStr = keys.length > 0
          ? ` {${keys.join(", ")}${Object.keys(obj).length > 5 ? "..." : ""}}`
          : " {}";
        return `[${constructor}${keyStr}]`;
      } catch (e2) {
        return "[Object - unable to inspect]";
      }
    }
  }

  // Fallback for any other type
  try {
    return String(obj);
  } catch (e) {
    return "[Unknown - unable to convert]";
  }
};

export default { initDebugConsole, restoreConsole };
