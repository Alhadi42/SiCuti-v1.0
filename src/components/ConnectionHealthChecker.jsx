import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getSafeErrorMessage } from "@/utils/errorUtils";

const ConnectionHealthChecker = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dbHealth, setDbHealth] = useState({ healthy: true, latency: 0 });
  const [lastCheck, setLastCheck] = useState(Date.now());

  const checkDatabaseHealth = async () => {
    try {
      const start = Date.now();
      const { error } = await supabase
        .from("employees")
        .select("count")
        .limit(1)
        .single();

      const latency = Date.now() - start;

      setDbHealth({
        healthy: !error,
        latency,
        error: error ? getSafeErrorMessage(error) : null,
      });
      setLastCheck(Date.now());
    } catch (error) {
      setDbHealth({
        healthy: false,
        latency: 0,
        error: getSafeErrorMessage(error),
      });
      setLastCheck(Date.now());
    }
  };

  useEffect(() => {
    // Check database health on mount
    checkDatabaseHealth();

    // Set up periodic health checks (every 30 seconds)
    const interval = setInterval(checkDatabaseHealth, 30000);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      checkDatabaseHealth();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Only show status indicators when there are issues
  const shouldShowStatus = !isOnline || !dbHealth.healthy;

  if (!shouldShowStatus) {
    return children;
  }

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-1">
        {/* Internet Connection */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium opacity-75 hover:opacity-100 transition-opacity ${
            isOnline
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
          title={isOnline ? "Internet: Online" : "Internet: Offline"}
        >
          {isOnline ? (
            <Wifi className="w-2.5 h-2.5" />
          ) : (
            <WifiOff className="w-2.5 h-2.5" />
          )}
          <span className="text-xs">{isOnline ? "ON" : "OFF"}</span>
        </div>

        {/* Database Connection */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium opacity-75 hover:opacity-100 transition-opacity ${
            dbHealth.healthy
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
          title={`Database: ${dbHealth.healthy ? `Healthy (${dbHealth.latency}ms)` : "Unhealthy"}`}
        >
          {dbHealth.healthy ? (
            <CheckCircle className="w-2.5 h-2.5" />
          ) : (
            <AlertTriangle className="w-2.5 h-2.5" />
          )}
          <span className="text-xs">DB</span>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="fixed top-16 left-4 right-4 z-40 bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              Anda sedang offline. Beberapa fitur mungkin tidak tersedia.
            </span>
          </div>
        </div>
      )}

      {/* Database Error Banner */}
      {!dbHealth.healthy && isOnline && (
        <div className="fixed top-16 left-4 right-4 z-40 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <div>
              <div className="text-sm font-medium">
                Koneksi database bermasalah
              </div>
              {import.meta.env.DEV && dbHealth.error && (
                <div className="text-xs opacity-70">{dbHealth.error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
};

export default ConnectionHealthChecker;
