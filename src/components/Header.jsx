import React from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "./NotificationBell";

const Header = ({ toggleSidebar }) => {
  return (
    <motion.header
      className="bg-slate-800/30 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-4">
          <NotificationBell />

          <div className="text-right">
            <p className="text-white text-sm font-medium">Selamat Datang!</p>
            <p className="text-slate-400 text-xs">
              SiCuti - Binalavotas
            </p>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
