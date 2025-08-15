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
import "@/utils/errorTestUtility.js";
import "@/utils/consoleTest.js";

TempoDevtools.init();
initDebugConsole();

// Console override is now handled by debugConsole.js

console.log("Supabase instance:", supabase);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
