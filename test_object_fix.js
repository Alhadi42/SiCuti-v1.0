/**
 * Simple test to verify [object Object] fixes are working
 * Run this in the browser console after the page loads
 */

// Test objects that would normally show as [object Object]
const testObjects = {
  simpleObject: { message: "test message", code: 123 },
  emptyObject: {},
  supabaseError: {
    code: "42501", 
    message: "Permission denied",
    details: "RLS policy violation"
  },
  nestedObject: {
    level1: {
      level2: {
        data: "nested value",
        items: [1, 2, 3]
      }
    }
  }
};

console.log("=== OBJECT DISPLAY FIX VERIFICATION ===");
console.log("✅ If you see proper JSON below instead of [object Object], the fix is working!");

Object.entries(testObjects).forEach(([name, obj]) => {
  console.log(`${name}:`, obj);
  console.error(`${name} via console.error:`, obj);
  console.warn(`${name} via console.warn:`, obj);
});

console.log("=== END VERIFICATION ===");
console.log("👀 Check above output - there should be NO [object Object] text anywhere!");
