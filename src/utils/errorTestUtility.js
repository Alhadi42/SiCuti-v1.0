/**
 * Utility to test error handling improvements
 * This helps verify that [object Object] errors are properly handled
 */

import { safeErrorMessage, getUserFriendlyErrorMessage } from './errorDisplay';

// Test different types of error objects that might cause [object Object] issues
const createTestErrors = () => {
  return {
    supabaseError: {
      code: "42501",
      message: "new row violates row-level security policy",
      details: "Policy restricts access to this table",
      hint: "Check your authentication and permissions"
    },
    
    networkError: new Error("Failed to fetch"),
    
    objectWithoutMessage: {
      status: 500,
      statusText: "Internal Server Error",
      data: { error: "Something went wrong" }
    },
    
    stringError: "Simple string error",
    
    emptyObject: {},
    
    nullError: null,
    
    undefinedError: undefined,
    
    circularReferenceError: (() => {
      const obj = { message: "Circular reference error" };
      obj.self = obj;
      return obj;
    })(),
    
    arrayError: ["error1", "error2", "error3"],
    
    numberError: 404,
    
    booleanError: false
  };
};

/**
 * Test all error types to ensure they don't produce [object Object]
 */
export const testErrorHandling = () => {
  console.group("🧪 Testing Error Handling");
  
  const testErrors = createTestErrors();
  const results = {};
  
  Object.entries(testErrors).forEach(([errorType, error]) => {
    console.group(`Testing ${errorType}:`);
    
    try {
      const safeMessage = safeErrorMessage(error);
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      
      const hasObjectObject = safeMessage.includes("[object Object]") || 
                            friendlyMessage.includes("[object Object]");
      
      results[errorType] = {
        original: error,
        safeMessage,
        friendlyMessage,
        hasObjectObject,
        status: hasObjectObject ? "❌ FAIL" : "✅ PASS"
      };
      
      console.log("Original:", error);
      console.log("Safe message:", safeMessage);
      console.log("Friendly message:", friendlyMessage);
      console.log("Status:", results[errorType].status);
      
    } catch (testError) {
      results[errorType] = {
        original: error,
        testError: testError.message,
        status: "❌ ERROR"
      };
      console.error("Test failed with error:", testError);
    }
    
    console.groupEnd();
  });
  
  console.groupEnd();
  
  // Summary
  const passed = Object.values(results).filter(r => r.status.includes("PASS")).length;
  const failed = Object.values(results).filter(r => r.status.includes("FAIL") || r.status.includes("ERROR")).length;
  
  console.log(`📊 Error Handling Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 All error handling tests passed! No [object Object] issues detected.");
  } else {
    console.warn("⚠️ Some error handling tests failed. Review the results above.");
  }
  
  return results;
};

/**
 * Test console override functionality
 */
export const testConsoleOverride = () => {
  console.group("🧪 Testing Console Override");
  
  const testObject = { test: "value", nested: { data: "example" } };
  const testError = new Error("Test error");
  const emptyObject = {};
  
  console.log("Testing console.log with object:", testObject);
  console.error("Testing console.error with object:", testObject);
  console.warn("Testing console.warn with object:", testObject);
  
  console.log("Testing with error object:", testError);
  console.log("Testing with empty object:", emptyObject);
  
  console.groupEnd();
  console.log("✅ Console override test completed. Check output above for any [object Object] instances.");
};

/**
 * Test ResizeObserver error suppression
 */
export const testResizeObserverSuppression = () => {
  console.group("🧪 Testing ResizeObserver Error Suppression");
  
  // Simulate ResizeObserver error
  const resizeObserverError = new Error("ResizeObserver loop completed with undelivered notifications");
  
  // This should be handled gracefully by our global error handler
  window.dispatchEvent(new ErrorEvent('error', {
    error: resizeObserverError,
    message: resizeObserverError.message
  }));
  
  console.log("✅ ResizeObserver error simulation completed.");
  console.log("Check that no ResizeObserver error appeared in console (should be suppressed).");
  console.groupEnd();
};

/**
 * Run all tests
 */
export const runAllErrorTests = () => {
  console.log("��� Starting comprehensive error handling tests...");
  
  const errorResults = testErrorHandling();
  testConsoleOverride();
  testResizeObserverSuppression();
  
  console.log("🏁 All error handling tests completed!");
  return errorResults;
};

// Auto-run tests in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Wait for debug console to be properly initialized
  const waitAndRunTests = () => {
    if (window._debugConsoleInitialized) {
      console.log("🔧 Auto-running error handling tests in development mode...");

      // Quick test for console override
      console.log("🧪 Quick console override test:");
      const testObj = { test: "value", nested: { data: "example" } };
      console.log("Testing object:", testObj);
      console.error("Testing error with object:", testObj);
      console.warn("Testing warn with object:", testObj);

      // Run full tests
      runAllErrorTests();
    } else {
      setTimeout(waitAndRunTests, 100);
    }
  };

  // Start after a delay to ensure everything is loaded
  setTimeout(waitAndRunTests, 500);
}

export default {
  testErrorHandling,
  testConsoleOverride, 
  testResizeObserverSuppression,
  runAllErrorTests
};
