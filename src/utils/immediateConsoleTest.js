/**
 * Immediate console test that runs on page load
 * This helps users immediately see if the [object Object] fix is working
 */

// Wait a moment for all systems to initialize
setTimeout(() => {
  if (import.meta.env.DEV) {
    console.log("🔧 Running immediate console override test...");
    
    // Test objects that commonly cause [object Object]
    const testObject = { 
      message: "This should NOT show as [object Object]",
      code: "TEST123",
      data: { nested: "value" }
    };
    
    const emptyObject = {};
    
    const complexObject = {
      id: 1,
      name: "test",
      config: {
        enabled: true,
        settings: {
          theme: "dark",
          lang: "en"
        }
      },
      items: [1, 2, 3]
    };
    
    console.log("=== CONSOLE OVERRIDE TEST ===");
    console.log("✅ If you see JSON instead of [object Object], the fix is working!");
    console.log("Test object:", testObject);
    console.error("Test error with object:", testObject);
    console.warn("Test warning with object:", testObject);
    console.log("Empty object:", emptyObject);
    console.log("Complex object:", complexObject);
    console.log("=== END TEST ===");
    
    // Instructions for manual testing
    console.log("🔧 Manual test commands:");
    console.log("   window.testConsole.all() - Run all console tests");
    console.log("   window.testConsole.error() - Test console.error specifically");
    console.log("   console.error('test:', { your: 'object' }) - Test any object");
  }
}, 500);

export default {};
