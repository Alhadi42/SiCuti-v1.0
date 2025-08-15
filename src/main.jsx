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

TempoDevtools.init();
initDebugConsole();

// Additional safeguard against [object Object] errors
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const safeConsoleOutput = (originalFn, methodName) => {
  return function(...args) {
    const safeArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null && !arg.message && !arg.stack) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return `[${arg.constructor?.name || 'Object'}]`;
        }
      }
      return arg;
    });
    originalFn.apply(console, safeArgs);
  };
};

// Override console methods in development only
if (import.meta.env.DEV) {
  console.log = safeConsoleOutput(originalLog, 'log');
  console.error = safeConsoleOutput(originalError, 'error');
  console.warn = safeConsoleOutput(originalWarn, 'warn');
}

console.log("Supabase instance:", supabase);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
