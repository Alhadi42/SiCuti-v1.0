/**
 * Comprehensive ResizeObserver error suppression utility
 * Handles all known ResizeObserver error patterns across different browsers and contexts
 */

// All known ResizeObserver error patterns
const RESIZE_OBSERVER_PATTERNS = [
  'ResizeObserver loop',
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver: loop completed with undelivered notifications',
  'ResizeObserver: loop limit exceeded',
  'ResizeObserver loop limit exceeded',
  'loop completed with undelivered notifications',
  'ResizeObserver callback',
  'ResizeObserver.observe',
  'ResizeObserver entry',
  'ResizeObserver notification',
  'ResizeObserver iteration',
  'ResizeObserver observer loop'
];

/**
 * Check if an error message is a ResizeObserver error
 */
export const isResizeObserverError = (message) => {
  if (!message) return false;
  const messageStr = String(message).toLowerCase();
  return RESIZE_OBSERVER_PATTERNS.some(pattern => 
    messageStr.includes(pattern.toLowerCase())
  );
};

/**
 * Check if an error object is a ResizeObserver error
 */
export const isResizeObserverErrorObject = (error) => {
  if (!error) return false;
  
  const message = error.message || '';
  const stack = error.stack || '';
  const toString = error.toString() || '';
  
  return RESIZE_OBSERVER_PATTERNS.some(pattern => {
    const patternLower = pattern.toLowerCase();
    return message.toLowerCase().includes(patternLower) ||
           stack.toLowerCase().includes(patternLower) ||
           toString.toLowerCase().includes(patternLower);
  });
};

/**
 * Suppress ResizeObserver errors from window events
 */
const setupWindowErrorSuppression = () => {
  // Store original onerror if it exists
  const originalOnError = window.onerror;
  
  window.onerror = (message, source, lineno, colno, error) => {
    if (isResizeObserverError(message) || isResizeObserverErrorObject(error)) {
      if (import.meta.env.DEV) {
        console.warn('🔄 ResizeObserver window error suppressed:', message);
      }
      return true; // Prevent default error handling
    }
    
    // Call original error handler if it exists
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    
    return false; // Let other errors through
  };
  
  // Handle unhandled promise rejections that might contain ResizeObserver errors
  const originalUnhandledRejection = window.onunhandledrejection;
  
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    if (isResizeObserverErrorObject(reason) || isResizeObserverError(reason?.message)) {
      if (import.meta.env.DEV) {
        console.warn('🔄 ResizeObserver unhandled rejection suppressed:', reason);
      }
      event.preventDefault();
      return true;
    }
    
    // Call original handler if it exists
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(window, event);
    }
    
    return false;
  };
};

/**
 * Comprehensive console suppression for ResizeObserver errors
 */
const setupConsoleSuppression = () => {
  // Override all console methods that might show ResizeObserver errors
  const consoleMethods = ['warn', 'error', 'log'];
  
  consoleMethods.forEach(method => {
    const originalMethod = console[method];
    const storageKey = `_original${method.charAt(0).toUpperCase() + method.slice(1)}`;
    
    // Store original method if not already stored
    if (!window[storageKey]) {
      window[storageKey] = originalMethod;
    }
    
    console[method] = (...args) => {
      // Check if any argument contains ResizeObserver error patterns
      const hasResizeObserverError = args.some(arg => {
        const argStr = String(arg);
        return isResizeObserverError(argStr) || isResizeObserverErrorObject(arg);
      });
      
      if (hasResizeObserverError) {
        // Suppress in production, minimal logging in development
        if (import.meta.env.DEV) {
          window[storageKey](`🔄 ResizeObserver ${method} suppressed:`, ...args);
        }
        return;
      }
      
      // Call original method for non-ResizeObserver messages
      return originalMethod.apply(console, args);
    };
  });
};

/**
 * Setup comprehensive ResizeObserver error suppression
 */
export const initResizeObserverSuppression = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Setup window-level error suppression
    setupWindowErrorSuppression();
    
    // Setup console-level suppression
    setupConsoleSuppression();
    
    // Add event listeners for error events
    window.addEventListener('error', (event) => {
      if (isResizeObserverError(event.message) || isResizeObserverErrorObject(event.error)) {
        if (import.meta.env.DEV) {
          console.warn('🔄 ResizeObserver event error suppressed:', event.message);
        }
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true); // Use capture phase
    
    // Add event listener for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (isResizeObserverErrorObject(event.reason) || isResizeObserverError(event.reason?.message)) {
        if (import.meta.env.DEV) {
          console.warn('🔄 ResizeObserver promise rejection suppressed:', event.reason);
        }
        event.preventDefault();
        return false;
      }
    });
    
    if (import.meta.env.DEV) {
      console.log('🛡️ Comprehensive ResizeObserver suppression initialized');
    }
    
  } catch (error) {
    console.warn('Failed to initialize ResizeObserver suppression:', error);
  }
};

/**
 * Test ResizeObserver suppression
 */
export const testResizeObserverSuppression = () => {
  console.group('🧪 Testing Comprehensive ResizeObserver Suppression');
  
  // Test all console methods
  console.log('Testing console.warn suppression:');
  console.warn('ResizeObserver loop completed with undelivered notifications.');
  
  console.log('Testing console.error suppression:');
  console.error('ResizeObserver: loop limit exceeded');
  
  console.log('Testing console.log suppression:');
  console.log('ResizeObserver callback failed');
  
  // Test window error suppression
  console.log('Testing window error suppression:');
  window.dispatchEvent(new ErrorEvent('error', {
    message: 'ResizeObserver loop completed with undelivered notifications',
    error: new Error('ResizeObserver loop completed with undelivered notifications')
  }));
  
  // Test promise rejection suppression
  console.log('Testing promise rejection suppression:');
  window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
    reason: new Error('ResizeObserver loop completed with undelivered notifications'),
    promise: Promise.reject(new Error('ResizeObserver loop completed with undelivered notifications'))
  }));
  
  console.log('✅ If you only see suppressed messages above, the suppression is working correctly');
  console.groupEnd();
};

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize with a slight delay to ensure it runs after other error handlers
  setTimeout(initResizeObserverSuppression, 0);
  
  // Make test function globally available
  window.testResizeObserverSuppression = testResizeObserverSuppression;
}

export default {
  initResizeObserverSuppression,
  testResizeObserverSuppression,
  isResizeObserverError,
  isResizeObserverErrorObject
};
