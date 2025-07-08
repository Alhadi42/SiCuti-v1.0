/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
  static marks = new Map();
  static measures = new Map();
  static isEnabled = import.meta.env.DEV;

  static mark(name) {
    if (!this.isEnabled || !window.performance) return;

    try {
      window.performance.mark(name);
      this.marks.set(name, Date.now());
    } catch (error) {
      console.warn("Performance mark failed:", error);
    }
  }

  static measure(name, startMark, endMark = null) {
    if (!this.isEnabled || !window.performance) return;

    try {
      if (endMark) {
        window.performance.measure(name, startMark, endMark);
      } else {
        window.performance.measure(name, startMark);
      }

      const measure = window.performance.getEntriesByName(name, "measure")[0];
      if (measure) {
        this.measures.set(name, measure.duration);
        console.log(
          `📊 Performance: ${name} took ${measure.duration.toFixed(2)}ms`,
        );
      }
    } catch (error) {
      console.warn("Performance measure failed:", error);
    }
  }

  static timeFunction(name, fn) {
    if (!this.isEnabled) return fn();

    const startTime = Date.now();
    this.mark(`${name}-start`);

    try {
      const result = fn();

      // Handle async functions
      if (result && typeof result.then === "function") {
        return result.finally(() => {
          this.mark(`${name}-end`);
          this.measure(name, `${name}-start`, `${name}-end`);
        });
      }

      this.mark(`${name}-end`);
      this.measure(name, `${name}-start`, `${name}-end`);
      return result;
    } catch (error) {
      this.mark(`${name}-error`);
      this.measure(`${name}-error`, `${name}-start`, `${name}-error`);
      throw error;
    }
  }

  static getMetrics() {
    if (!window.performance) return {};

    const navigation = window.performance.getEntriesByType("navigation")[0];
    const paint = window.performance.getEntriesByType("paint");

    return {
      // Navigation timing
      domContentLoaded:
        navigation?.domContentLoadedEventEnd -
        navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,

      // Paint timing
      firstPaint: paint.find((p) => p.name === "first-paint")?.startTime,
      firstContentfulPaint: paint.find(
        (p) => p.name === "first-contentful-paint",
      )?.startTime,

      // Custom measures
      customMeasures: Object.fromEntries(this.measures),

      // Memory (if available)
      memory: window.performance.memory
        ? {
            used: window.performance.memory.usedJSHeapSize,
            total: window.performance.memory.totalJSHeapSize,
            limit: window.performance.memory.jsHeapSizeLimit,
          }
        : null,
    };
  }

  static logMetrics() {
    if (!this.isEnabled) return;

    const metrics = this.getMetrics();
    console.group("📊 Performance Metrics");
    console.table(metrics);
    console.groupEnd();
  }

  static clearMetrics() {
    if (!window.performance) return;

    window.performance.clearMarks();
    window.performance.clearMeasures();
    this.marks.clear();
    this.measures.clear();
  }
}

// Debounce utility for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Lazy loading utility
export const lazyLoad = (importFunc) => {
  if (typeof window !== "undefined" && window.React) {
    return window.React.lazy(() => {
      return PerformanceMonitor.timeFunction("lazy-load", () => importFunc());
    });
  }
  return importFunc;
};

// Image optimization utility
export const optimizeImage = (src, options = {}) => {
  const {
    width = "auto",
    height = "auto",
    quality = "auto",
    format = "auto",
  } = options;

  // For production, you could integrate with image CDN like Cloudinary
  // For now, return original src
  return src;
};

// Bundle analyzer (development only)
export const analyzeBundleSize = () => {
  if (!import.meta.env.DEV) return;

  // Estimate JavaScript bundle size
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  let totalSize = 0;

  scripts.forEach((script) => {
    // This is an approximation - in real app you'd want actual bundle analysis
    console.log("Script:", script.src);
  });

  console.log("💾 Estimated bundle analysis complete");
};

// Initialize performance monitoring
if (typeof window !== "undefined") {
  // Log metrics after page load
  window.addEventListener("load", () => {
    setTimeout(() => {
      PerformanceMonitor.logMetrics();
    }, 1000);
  });

  // Log metrics before page unload
  window.addEventListener("beforeunload", () => {
    PerformanceMonitor.logMetrics();
  });
}

export default PerformanceMonitor;
