import { AuthManager } from "@/lib/auth";

/**
 * Debug helper to log current user session data
 */
export const debugUserSession = () => {
  const user = AuthManager.getUserSession();
  
  console.log("🔍 =================================");
  console.log("🔍 DEBUG USER SESSION DATA:");
  console.log("🔍 =================================");
  console.log("🔍 Raw user object:", user);
  console.log("🔍 User ID:", user?.id);
  console.log("🔍 User name:", user?.name);
  console.log("🔍 User role:", user?.role);
  console.log("🔍 User unit_kerja:", user?.unit_kerja);
  console.log("🔍 User unitKerja:", user?.unitKerja);
  console.log("🔍 User permissions:", user?.permissions);
  console.log("🔍 User status:", user?.status);
  console.log("🔍 =================================");
  
  // Test role checks
  console.log("🔍 Role checks:");
  console.log("🔍 - Is admin_unit:", user?.role === 'admin_unit');
  console.log("🔍 - Is master_admin:", user?.role === 'master_admin');
  console.log("🔍 - Has unit data:", !!(user?.unit_kerja || user?.unitKerja));
  console.log("🔍 =================================");
  
  return user;
};

// Debug button functionality removed for production

// Debug button removed - no longer auto-created
