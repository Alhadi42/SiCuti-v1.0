/**
 * Simple utility to test console override functionality
 * Use this to quickly verify that [object Object] is being fixed
 */

// Test objects that commonly cause [object Object] issues
const testObjects = {
  simpleObject: { name: "test", value: 123 },
  emptyObject: {},
  nestedObject: { 
    level1: { 
      level2: { 
        message: "nested data",
        array: [1, 2, 3] 
      } 
    } 
  },
  supabaseError: {
    code: "42501",
    message: "Permission denied",
    details: "RLS policy violation",
    hint: "Check authentication"
  },
  arrayWithObjects: [
    { id: 1, name: "first" },
    { id: 2, name: "second" }
  ]
};

/**
 * Test console.log with various object types
 */
export const testConsoleLog = () => {
  console.log("=== TESTING CONSOLE.LOG ===");
  
  Object.entries(testObjects).forEach(([name, obj]) => {
    console.log(`Testing ${name}:`, obj);
  });
  
  console.log("=== END CONSOLE.LOG TEST ===");
};

/**
 * Test console.error with various object types
 */
export const testConsoleError = () => {
  console.log("=== TESTING CONSOLE.ERROR ===");
  
  Object.entries(testObjects).forEach(([name, obj]) => {
    console.error(`Testing ${name}:`, obj);
  });
  
  console.log("=== END CONSOLE.ERROR TEST ===");
};

/**
 * Test console.warn with various object types
 */
export const testConsoleWarn = () => {
  console.log("=== TESTING CONSOLE.WARN ===");
  
  Object.entries(testObjects).forEach(([name, obj]) => {
    console.warn(`Testing ${name}:`, obj);
  });
  
  console.log("=== END CONSOLE.WARN TEST ===");
};

/**
 * Run all console tests
 */
export const runAllConsoleTests = () => {
  console.log("🚀 Starting console override tests...");
  
  testConsoleLog();
  testConsoleError();
  testConsoleWarn();
  
  console.log("🏁 Console override tests completed!");
  console.log("👀 Review the output above - there should be NO [object Object] instances!");
};

// Make functions available globally for easy testing
if (typeof window !== 'undefined') {
  window.testConsole = {
    log: testConsoleLog,
    error: testConsoleError,
    warn: testConsoleWarn,
    all: runAllConsoleTests
  };
  
  console.log("🔧 Console test functions available as window.testConsole");
  console.log("   Usage: window.testConsole.all() or window.testConsole.error()");
}

export default {
  testConsoleLog,
  testConsoleError,
  testConsoleWarn,
  runAllConsoleTests
};
