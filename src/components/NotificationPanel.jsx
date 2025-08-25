import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import NotificationManager, { NOTIFICATION_TYPES } from "@/lib/notifications";
import { AuthManager } from "@/lib/auth";

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
    
    // Subscribe to new notifications
    const unsubscribe = NotificationManager.subscribe("new-notification", handleNewNotification);
    
    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const user = AuthManager.getUserSession();
      
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Get notifications from NotificationManager
      const data = await NotificationManager.getNotifications({ 
        limit: 20,
        includeRead: true 
      });
      
      setNotifications(data);
      
      // Calculate unread count
      const unread = await NotificationManager.getUnreadCount();
      setUnreadCount(unread);
      
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 19)]);
    setUnreadCount(prev => prev + 1);
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const markAsRead = async (notificationId) => {
    try {
      await NotificationManager.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read_at);
      
      for (const notification of unreadNotifications) {
        await NotificationManager.markAsRead(notification.id);
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read_at) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED:
      case NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED:
      case NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED:
        return <Calendar className="h-4 w-4" />;
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return <Info className="h-4 w-4" />;
      case NOTIFICATION_TYPES.SECURITY_ALERT:
        return <AlertTriangle className="h-4 w-4" />;
      case NOTIFICATION_TYPES.USER_MENTION:
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type, isRead) => {
    const baseColor = isRead ? "text-slate-400" : "text-slate-200";
    
    switch (type) {
      case NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED:
        return isRead ? "text-green-400" : "text-green-300";
      case NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED:
      case NOTIFICATION_TYPES.SECURITY_ALERT:
        return isRead ? "text-red-400" : "text-red-300";
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return isRead ? "text-blue-400" : "text-blue-300";
      default:
        return baseColor;
    }
  };

  const formatNotificationTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      if (diffDays < 7) return `${diffDays} hari yang lalu`;
      
      return format(date, "dd MMM yyyy", { locale: id });
    } catch (error) {
      return "Waktu tidak valid";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
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
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 bg-slate-800 border-slate-700"
        sideOffset={8}
      >
        <DropdownMenuHeader className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold text-white">Notifikasi</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-slate-400 hover:text-white"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tandai Semua
            </Button>
          )}
        </DropdownMenuHeader>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
              <p className="mt-2 text-sm">Memuat notifikasi...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-0 focus:bg-slate-700/50"
                >
                  <div
                    className={`flex items-start gap-3 p-3 w-full border-l-2 ${
                      notification.read_at 
                        ? "border-transparent bg-slate-800/50" 
                        : "border-blue-500 bg-slate-700/30"
                    }`}
                  >
                    <div className={`flex-shrink-0 mt-1 ${getNotificationColor(notification.type, !!notification.read_at)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        notification.read_at ? "text-slate-300" : "text-white"
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {!notification.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator className="bg-slate-700" />
        
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-3 w-3 mr-2" />
            Pengaturan Notifikasi
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationPanel;
