/**
 * Test utility specifically for ResizeObserver error suppression
 */

export const testResizeObserverSuppression = () => {
  console.group("🧪 Testing ResizeObserver Error Suppression");
  
  console.log("📋 Running ResizeObserver suppression tests...");
  
  // Test 1: Simulate console.warn ResizeObserver error
  console.log("\n1️⃣ Testing console.warn suppression:");
  console.warn("ResizeObserver loop completed with undelivered notifications.");
  console.log("✅ If you see 'ResizeObserver loop suppressed' above, suppression is working");
  
  // Test 2: Simulate window error event
  console.log("\n2️⃣ Testing window error event suppression:");
  window.dispatchEvent(new ErrorEvent('error', {
    error: new Error("ResizeObserver loop completed with undelivered notifications"),
    message: "ResizeObserver loop completed with undelivered notifications"
  }));
  console.log("✅ Window error event test completed");
  
  // Test 3: Test alternative ResizeObserver error patterns
  console.log("\n3️⃣ Testing alternative error patterns:");
  console.warn("ResizeObserver: loop completed with undelivered notifications");
  console.warn("ResizeObserver: loop limit exceeded");
  console.warn("ResizeObserver loop completed");
  console.log("✅ Alternative patterns test completed");
  
  // Test 4: Verify normal warnings still work
  console.log("\n4️⃣ Testing normal warnings still work:");
  console.warn("This is a normal warning that should appear");
  console.log("✅ Normal warning test completed");
  
  console.log("\n🏁 ResizeObserver suppression tests completed!");
  console.log("If ResizeObserver errors were suppressed but normal warnings appeared, the fix is working correctly.");
  console.groupEnd();
};

// Test function to manually trigger ResizeObserver errors
export const simulateResizeObserverLoop = () => {
  console.log("🔄 Simulating ResizeObserver loop...");
  
  // Create a ResizeObserver that might cause a loop
  const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      // This could potentially cause a loop by modifying the observed element
      const element = entry.target;
      if (element.style.width !== '100px') {
        element.style.width = '100px';
      }
    });
  });
  
  // Create a test element
  const testElement = document.createElement('div');
  testElement.style.width = '50px';
  testElement.style.height = '50px';
  testElement.style.position = 'absolute';
  testElement.style.top = '-1000px'; // Hide it off-screen
  document.body.appendChild(testElement);
  
  // Observe the element
  observer.observe(testElement);
  
  // Trigger a size change that might cause a loop
  setTimeout(() => {
    testElement.style.width = '75px';
    
    // Clean up after a short delay
    setTimeout(() => {
      observer.disconnect();
      document.body.removeChild(testElement);
      console.log("✅ ResizeObserver simulation cleanup completed");
    }, 100);
  }, 50);
};

// Make functions available globally for manual testing
if (typeof window !== 'undefined') {
  window.testResizeObserverSuppression = testResizeObserverSuppression;
  window.simulateResizeObserverLoop = simulateResizeObserverLoop;
}

// Auto-run in development with URL parameter
if (import.meta.env.DEV && typeof window !== 'undefined') {
  if (window.location.search.includes('testResizeObserver=true')) {
    setTimeout(() => {
      testResizeObserverSuppression();
      // Optionally run the simulation test
      if (window.location.search.includes('simulateLoop=true')) {
        setTimeout(simulateResizeObserverLoop, 1000);
      }
    }, 1000);
  }
}

export default {
  testResizeObserverSuppression,
  simulateResizeObserverLoop
};
