import { useState, useEffect, useCallback } from "react";
import NotificationManager, { NOTIFICATION_TYPES } from "@/lib/notifications";
import { AuthManager } from "@/lib/auth";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load notifications from storage/API
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = AuthManager.getUserSession();
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      // Get notifications from NotificationManager
      const data = await NotificationManager.getNotifications({ 
        limit: 50,
        includeRead: true 
      });
      
      setNotifications(data);
      
      // Calculate unread count
      const unread = await NotificationManager.getUnreadCount();
      setUnreadCount(unread);
      
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Gagal memuat notifikasi");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
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
      return true;
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Gagal menandai notifikasi sebagai dibaca");
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read_at);
      
      const promises = unreadNotifications.map(n => 
        NotificationManager.markAsRead(n.id)
      );
      
      await Promise.all(promises);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      return true;
    } catch (err) {
      console.error("Error marking all as read:", err);
      setError("Gagal menandai semua notifikasi sebagai dibaca");
      return false;
    }
  }, [notifications]);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    if (notification && !notification.read_at) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  // Send new notification
  const sendNotification = useCallback(async (notification) => {
    try {
      const user = AuthManager.getUserSession();
      if (!user) return null;

      const result = await NotificationManager.sendNotification(user.id, notification);
      
      if (result) {
        // Add to local state
        setNotifications(prev => [result, ...prev]);
        if (!result.read_at) {
          setUnreadCount(prev => prev + 1);
        }
      }
      
      return result;
    } catch (err) {
      console.error("Error sending notification:", err);
      setError("Gagal mengirim notifikasi");
      return null;
    }
  }, []);

  // Handle new notification from subscription
  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;
      
      return [notification, ...prev.slice(0, 49)]; // Keep only 50 latest
    });
    
    if (!notification.read_at) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Initialize and subscribe to notifications
  useEffect(() => {
    const user = AuthManager.getUserSession();
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Initialize notification manager
    NotificationManager.initialize();

    // Load initial notifications
    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = NotificationManager.subscribe("new-notification", handleNewNotification);

    // Auto-refresh every 2 minutes
    const interval = setInterval(loadNotifications, 120000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadNotifications, handleNewNotification]);

  // Demo function to create sample notifications
  const createSampleNotifications = useCallback(async () => {
    const user = AuthManager.getUserSession();
    if (!user) return;

    const sampleNotifications = [
      {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED,
        title: "Cuti Disetujui",
        message: "Pengajuan cuti tahunan Anda dari tanggal 15-17 Januari 2025 telah disetujui.",
        priority: "medium"
      },
      {
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: "Pemeliharaan Sistem",
        message: "Sistem akan mengalami pemeliharaan pada hari Minggu, 12 Januari 2025 pukul 01:00-03:00 WIB.",
        priority: "high"
      },
      {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED,
        title: "Pengajuan Cuti Baru",
        message: "Terdapat pengajuan cuti baru dari Ahmad Susanto yang memerlukan persetujuan Anda.",
        priority: "medium"
      },
      {
        type: NOTIFICATION_TYPES.LEAVE_BALANCE_UPDATED,
        title: "Saldo Cuti Diperbarui",
        message: "Saldo cuti tahunan Anda telah diperbarui. Sisa cuti: 8 hari.",
        priority: "low"
      },
      {
        type: NOTIFICATION_TYPES.SECURITY_ALERT,
        title: "Login dari Perangkat Baru",
        message: "Akun Anda digunakan untuk login dari perangkat baru. Jika bukan Anda, segera ganti password.",
        priority: "high"
      }
    ];

    for (const notification of sampleNotifications) {
      await sendNotification(notification);
      // Add small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [sendNotification]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    sendNotification,
    createSampleNotifications,
    // Computed values
    hasUnread: unreadCount > 0,
    totalCount: notifications.length,
  };
};

export default useNotifications;
