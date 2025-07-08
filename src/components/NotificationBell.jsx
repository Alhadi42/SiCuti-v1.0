import React, { useState, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(3); // Mock data for now
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Mock: Simulate new notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        // 20% chance of new notification
        setUnreadCount((prev) => prev + 1);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    // For now, just show alert - can be enhanced later
    alert(`You have ${unreadCount} unread notifications`);
    setUnreadCount(0);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="relative text-slate-300 hover:text-white hover:bg-slate-700/50"
    >
      <motion.div
        animate={
          unreadCount > 0 && isAnimating
            ? {
                scale: [1, 1.2, 1],
                rotate: [0, 15, -15, 0],
              }
            : {}
        }
        transition={{
          duration: 0.6,
          ease: "easeInOut",
        }}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </motion.div>

      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export default NotificationBell;
