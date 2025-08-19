/**
 * Debug console utility to help track down [object Object] errors
 */

let originalConsoleError;
let originalConsoleLog;
let originalConsoleWarn;

export const initDebugConsole = () => {
  // Always initialize in development, even if already done
  console.log("🔍 Initializing debug console...");

  if (import.meta.env.PROD) {
    console.log("🔍 Production mode - debug console disabled");
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
          console.log("🔍 Caught [object Object], converting:", arg);
          return safeStringify(arg);
        }

        // Check for other [object Type] patterns that aren't useful
        if (str.match(/^\[object \w+\]$/) &&
            !str.match(/^\[object (Error|Date|Array|Function|RegExp|Promise)\]$/)) {
          console.log("🔍 Caught [object Type], converting:", str);
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
          console.log("🔍 Caught plain object, converting:");
          return safeStringify(arg);
        }

        return arg;
      });

      originalFn.apply(console, processedArgs);
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

  // Immediate test to verify the override is working
  const testObj = { test: "verification test", status: "initialized" };
  console.log("✅ Console override verification - this object should be stringified:", testObj);

  // Test error case specifically
  console.error("Test error with object:", testObj);

  // If we still see [object Object], the override isn't working
  if (String(testObj) === "[object Object]") {
    console.warn("⚠️ Debug console override may not be working properly");
  }
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
