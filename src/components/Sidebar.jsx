import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  PieChart,
  FileText,
  Settings,
  Menu,
  Building2,
  History,
  UserCheck,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthManager } from "@/lib/auth";

const menuItems = [
  { icon: Users, label: "Data Pegawai", path: "/employees" },
  { icon: Calendar, label: "Pengajuan Cuti", path: "/leave-requests" },
  { icon: Layers, label: "Usulan per Unit", path: "/batch-leave-proposals" },
  { icon: History, label: "Riwayat Cuti", path: "/leave-history" },
  {
    type: "group",
    label: "Surat Keterangan",
    items: [
      { icon: FileText, label: "Buat Surat", path: "/surat-keterangan" },
      {
        icon: FileText,
        label: "Kelola Template",
        path: "/template-management",
      },
    ],
  },
  { icon: UserCheck, label: "User Management", path: "/user-management" },
  { icon: Settings, label: "Pengaturan", path: "/settings" },
];

const getMenuItemsByPermissions = (permissions = []) => {
  if (permissions.includes("all")) return menuItems;
  return menuItems.filter((item) => {
    if (item.label === "Dashboard" && permissions.includes("dashboard"))
      return true;
    if (item.label === "Data Pegawai" && permissions.includes("employees_unit"))
      return true;
    if (
      item.label === "Pengajuan Cuti" &&
      permissions.includes("leave_requests_unit")
    )
      return true;
    if (
      item.label === "Usulan per Unit" &&
      permissions.includes("batch_proposals_master")
    )
      return true;
    if (
      item.label === "Riwayat Cuti" &&
      permissions.includes("leave_history_unit")
    )
      return true;
    if (
      item.label === "User Management" &&
      permissions.includes("user_management")
    )
      return true;
    if (item.label === "Pengaturan" && permissions.includes("settings"))
      return true;
    if (
      item.type === "group" &&
      item.label === "Surat Keterangan" &&
      permissions.includes("surat_keterangan")
    )
      return true;
    return false;
  });
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const user = AuthManager.getUserSession();

  const handleLogout = () => {
    AuthManager.logout();
    window.location.href = "/login";
  };

  return (
    <motion.div
      className={cn(
        "bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col",
        isOpen ? "w-64" : "w-16",
      )}
      animate={{ width: isOpen ? 256 : 64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {isOpen && (
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">SiCuti v{import.meta.env.VITE_APP_VERSION || "1.0"}</span>
            </motion.div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {(getMenuItemsByPermissions(user?.permissions) || []).map((item) => {
          if (item.type === "group") {
            return (
              <div key={item.label} className="space-y-1">
                {isOpen && (
                  <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </div>
                )}
                <div className="space-y-1">
                  {item.items.map((subItem) => {
                    const isActive = location.pathname === subItem.path;
                    return (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
                          isActive
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border border-blue-500/30"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50 text-base",
                        )}
                      >
                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                        {isOpen && (
                          <motion.span
                            className="font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            {subItem.label}
                          </motion.span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border border-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && (
                <motion.span
                  className="font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>
      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.name?.[0] || "A"}
            </span>
          </div>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-white text-sm font-medium">
                {user?.name || "-"}
              </p>
              <p className="text-slate-400 text-xs">
                {user?.role
                  ? user.role
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "-"}
              </p>
              <button
                onClick={handleLogout}
                className="mt-2 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold w-full text-left"
              >
                Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
