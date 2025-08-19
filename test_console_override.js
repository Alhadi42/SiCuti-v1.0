/**
 * Simple test to verify console override is working
 * Run this in the browser console to test
 */

// Test objects that should NOT display as [object Object]
const testObj = { message: "This should NOT be [object Object]", code: 123 };
const emptyObj = {};
const complexObj = { 
  user: { name: "Test", id: 1 }, 
  settings: { theme: "dark" },
  items: [1, 2, 3] 
};

console.log("=== MANUAL CONSOLE OVERRIDE TEST ===");
console.log("If you see JSON below instead of [object Object], the fix is working!");
console.log("Test object:", testObj);
console.error("Test error with object:", testObj);
console.warn("Test warning with object:", testObj);
console.log("Empty object:", emptyObj);
console.log("Complex object:", complexObj);
console.log("=== END MANUAL TEST ===");

// Check if debug console is initialized
if (window._debugConsoleInitialized) {
  console.log("✅ Debug console is initialized");
} else {
  console.log("❌ Debug console is NOT initialized");
}

// Instructions
console.log("🔧 To run full tests:");
console.log("- Console tests: window.testConsole.all()");
console.log("- Error tests: runAllErrorTests()");
console.log("- Or add ?runConsoleTests=true to URL");
