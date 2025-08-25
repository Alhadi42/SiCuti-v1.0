/**
 * Aggressive ResizeObserver error suppression
 * This is loaded as early as possible to catch all ResizeObserver errors
 * Including errors from libraries, frameworks, and browser contexts
 */

// Comprehensive patterns including browser-specific variations
const COMPREHENSIVE_PATTERNS = [
  'resizeobserver loop',
  'resizeobserver loop completed with undelivered notifications',
  'resizeobserver: loop completed with undelivered notifications',
  'resizeobserver: loop limit exceeded', 
  'resizeobserver loop limit exceeded',
  'loop completed with undelivered notifications',
  'resizeobserver callback',
  'resizeobserver.observe',
  'resizeobserver entry',
  'resizeobserver notification',
  'resizeobserver iteration',
  'resizeobserver observer loop',
  'resizeobserver error',
  'resize observer loop',
  'resize observer error',
  'observer loop completed',
  'observer loop limit',
  'undelivered notifications',
  'resize callback error',
  'resize observation error'
];

/**
 * Ultra-aggressive pattern matching
 */
const isResizeObserverRelated = (text) => {
  if (!text) return false;
  const textLower = String(text).toLowerCase();
  
  // Direct pattern matching
  if (COMPREHENSIVE_PATTERNS.some(pattern => textLower.includes(pattern))) {
    return true;
  }
  
  // Combination checks
  if (textLower.includes('resize') && textLower.includes('observer')) {
    return true;
  }
  
  if (textLower.includes('resize') && textLower.includes('loop')) {
    return true;
  }
  
  if (textLower.includes('observer') && textLower.includes('notification')) {
    return true;
  }
  
  return false;
};

/**
 * Aggressive console suppression
 */
const suppressConsoleMethods = () => {
  // Store all original methods
  if (!window._originalConsoleMethods) {
    window._originalConsoleMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
  }

  // Override all console methods
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    const original = window._originalConsoleMethods[method];
    
    console[method] = (...args) => {
      // Check if any argument is ResizeObserver related
      const hasResizeObserverContent = args.some(arg => {
        if (typeof arg === 'string') {
          return isResizeObserverRelated(arg);
        }
        if (arg && typeof arg === 'object') {
          const str = arg.toString();
          const message = arg.message || '';
          const stack = arg.stack || '';
          return isResizeObserverRelated(str) || 
                 isResizeObserverRelated(message) || 
                 isResizeObserverRelated(stack);
        }
        return false;
      });

      if (hasResizeObserverContent) {
        // Complete suppression in production
        if (typeof window !== 'undefined' && window.location && 
            (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
          original.call(console, `🔄 ResizeObserver ${method} suppressed:`, ...args);
        }
        return;
      }

      // Call original method for non-ResizeObserver messages
      return original.apply(console, args);
    };
  });
};

/**
 * Aggressive window error suppression
 */
const suppressWindowErrors = () => {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isResizeObserverRelated(message) || 
        (error && isResizeObserverRelated(error.message)) ||
        (error && isResizeObserverRelated(error.toString()))) {
      
      if (typeof window !== 'undefined' && window.location && 
          (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
        console.log('🔄 ResizeObserver window error suppressed:', message);
      }
      return true; // Prevent default error handling
    }
    
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Override unhandled rejection for ResizeObserver promises
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    if (reason && (isResizeObserverRelated(reason.message) || 
                   isResizeObserverRelated(reason.toString()))) {
      
      if (typeof window !== 'undefined' && window.location && 
          (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
        console.log('🔄 ResizeObserver promise rejection suppressed:', reason);
      }
      event.preventDefault();
      return true;
    }
    
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(window, event);
    }
    return false;
  };
};

/**
 * Aggressive event listener suppression
 */
const suppressEventErrors = () => {
  // Override addEventListener to catch ResizeObserver errors in event handlers
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'error' && typeof listener === 'function') {
      const wrappedListener = (event) => {
        if (event.message && isResizeObserverRelated(event.message)) {
          if (typeof window !== 'undefined' && window.location && 
              (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
            console.log('🔄 ResizeObserver event error suppressed:', event.message);
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        return listener.call(this, event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
};

/**
 * Override ResizeObserver constructor to add error handling
 */
const overrideResizeObserver = () => {
  if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = ResizeObserver;
    
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        // Wrap callback to catch and suppress errors
        const wrappedCallback = (entries, observer) => {
          try {
            return callback.call(this, entries, observer);
          } catch (error) {
            if (isResizeObserverRelated(error.message) || isResizeObserverRelated(error.toString())) {
              if (typeof window !== 'undefined' && window.location && 
                  (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
                console.log('🔄 ResizeObserver callback error suppressed:', error);
              }
              return; // Suppress the error
            }
            throw error; // Re-throw non-ResizeObserver errors
          }
        };
        
        super(wrappedCallback);
      }
    };
    
    // Copy static methods if any
    Object.setPrototypeOf(window.ResizeObserver, OriginalResizeObserver);
    Object.defineProperty(window.ResizeObserver, 'name', { value: 'ResizeObserver' });
  }
};

/**
 * Patch requestAnimationFrame to catch ResizeObserver errors
 */
const patchAnimationFrame = () => {
  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => {
    const wrappedCallback = (timestamp) => {
      try {
        return callback(timestamp);
      } catch (error) {
        if (isResizeObserverRelated(error.message) || isResizeObserverRelated(error.toString())) {
          if (typeof window !== 'undefined' && window.location && 
              (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
            console.log('🔄 ResizeObserver RAF error suppressed:', error);
          }
          return; // Suppress the error
        }
        throw error; // Re-throw non-ResizeObserver errors
      }
    };
    return originalRAF.call(window, wrappedCallback);
  };
};

/**
 * Initialize aggressive suppression immediately
 */
const initializeAggressiveSuppression = () => {
  try {
    suppressConsoleMethods();
    suppressWindowErrors();
    suppressEventErrors();
    overrideResizeObserver();
    patchAnimationFrame();
    
    if (typeof window !== 'undefined' && window.location && 
        (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
      console.log('🛡️ Aggressive ResizeObserver suppression initialized');
    }
  } catch (error) {
    // Silently fail if suppression setup fails
    if (typeof window !== 'undefined' && window.location && 
        (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'))) {
      console.warn('Failed to initialize aggressive ResizeObserver suppression:', error);
    }
  }
};

/**
 * Test function to verify suppression
 */
const testAggressiveSuppression = () => {
  console.group('🧪 Testing Aggressive ResizeObserver Suppression');
  
  // Test all console methods
  console.log('Testing console.log suppression:');
  console.log('ResizeObserver loop completed with undelivered notifications.');
  
  console.warn('Testing console.warn suppression:');
  console.warn('ResizeObserver: loop limit exceeded');
  
  console.error('Testing console.error suppression:');
  console.error(new Error('ResizeObserver loop completed with undelivered notifications'));
  
  // Test window error
  console.log('Testing window error suppression:');
  setTimeout(() => {
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'ResizeObserver loop completed with undelivered notifications',
      error: new Error('ResizeObserver loop completed with undelivered notifications')
    }));
  }, 100);
  
  // Test promise rejection
  console.log('Testing promise rejection suppression:');
  setTimeout(() => {
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
      reason: new Error('ResizeObserver loop completed with undelivered notifications'),
      promise: Promise.reject(new Error('ResizeObserver loop completed with undelivered notifications'))
    }));
  }, 200);
  
  console.log('✅ If ResizeObserver errors were suppressed, the aggressive suppression is working');
  console.groupEnd();
};

// Auto-initialize immediately when this module loads
if (typeof window !== 'undefined') {
  // Initialize as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAggressiveSuppression);
  } else {
    initializeAggressiveSuppression();
  }
  
  // Make test function available globally
  window.testAggressiveResizeObserverSuppression = testAggressiveSuppression;
}

export {
  initializeAggressiveSuppression,
  testAggressiveSuppression,
  isResizeObserverRelated
};

export default {
  initializeAggressiveSuppression,
  testAggressiveSuppression,
  isResizeObserverRelated
};
