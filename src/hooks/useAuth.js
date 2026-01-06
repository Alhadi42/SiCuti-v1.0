import { useState, useEffect } from "react";
import { AuthManager } from "@/lib/auth";

/**
 * React hook for accessing current user authentication state
 * Uses AuthManager to get user session data
 * 
 * @returns {Object} - { profile, isLoading, isAuthenticated }
 */
export const useAuth = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial user session
    const user = AuthManager.getUserSession();
    setProfile(user);
    setIsLoading(false);

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === "user_data" || e.key === "auth_token") {
        const updatedUser = AuthManager.getUserSession();
        setProfile(updatedUser);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes (in case of same-tab login/logout)
    const interval = setInterval(() => {
      const currentUser = AuthManager.getUserSession();
      setProfile((prevProfile) => {
        if (currentUser?.id !== prevProfile?.id) {
          return currentUser;
        }
        return prevProfile;
      });
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return {
    profile,
    isLoading,
    isAuthenticated: !!profile,
  };
};

export default useAuth;
