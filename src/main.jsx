import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import "@/index.css";
import { supabase } from "@/lib/supabaseOptimized";
import { TempoDevtools } from "tempo-devtools";
import "@/lib/globalErrorHandler.js";
import { initDebugConsole } from "@/lib/debugConsole.js";
import "@/utils/errorUtils.js";
import "@/lib/productionOptimizer.js";
import "@/lib/healthChecker.js";
import "@/utils/resizeObserverSuppression.js";

// Initialize debug console with error handling
try {
  initDebugConsole();
} catch (debugError) {
  console.error("Failed to initialize debug console:", debugError);
  // Continue without debug console
}

TempoDevtools.init();

// Import test utilities AFTER console override is initialized
if (import.meta.env.DEV) {
  // Delay test imports to ensure console override is working
  setTimeout(() => {
    import("@/utils/errorTestUtility.js");
    import("@/utils/consoleTest.js");
    import("@/utils/immediateConsoleTest.js");
    import("@/utils/resizeObserverTest.js");
    // Comprehensive ResizeObserver testing available via window.testResizeObserverSuppression()
  }, 100);
}

// Console override is now handled by debugConsole.js

console.log("Supabase instance:", supabase);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
