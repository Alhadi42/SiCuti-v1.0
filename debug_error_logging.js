// Test script to verify error logging improvements
console.log("🧪 Testing error logging improvements...");

// Mock error objects that might come from Supabase
const mockSupabaseError = {
  code: "42501",
  message: "new row violates row-level security policy",
  details: "Policy restricts access to this table",
  hint: "Check your authentication and permissions"
};

const mockNetworkError = {
  name: "NetworkError",
  message: "Failed to fetch",
  stack: "Error: Failed to fetch\n    at fetch (...)"
};

const mockTimeoutError = {
  name: "TimeoutError", 
  message: "Query timeout after 10 seconds",
  code: "TIMEOUT"
};

// Test the improved error logging format
function testErrorLogging(error, errorName) {
  console.log(`\n🔍 Testing ${errorName}:`);
  
  // Old format (would show [object Object])
  console.log("❌ Old format:", error);
  
  // New improved format
  console.log("✅ New format:", JSON.stringify({
    name: error.name,
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    stack: error.stack,
    toString: error.toString ? error.toString() : String(error)
  }, null, 2));
}

// Test different error types
testErrorLogging(mockSupabaseError, "Supabase RLS Error");
testErrorLogging(mockNetworkError, "Network Error");
testErrorLogging(mockTimeoutError, "Timeout Error");

console.log("\n🎉 Error logging test completed!");
console.log("✅ The new format will show actual error details instead of [object Object]");
