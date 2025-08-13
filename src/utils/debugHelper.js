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

/**
 * Add debug button to DOM for testing
 */
export const addDebugButton = () => {
  if (document.getElementById('debug-user-btn')) return; // Already exists
  
  const button = document.createElement('button');
  button.id = 'debug-user-btn';
  button.innerHTML = '🔍 Debug User';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #ef4444;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  button.onclick = () => {
    debugUserSession();
  };
  
  document.body.appendChild(button);
};

// Debug button removed - no longer auto-created
