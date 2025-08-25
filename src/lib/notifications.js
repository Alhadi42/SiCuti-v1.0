import { supabase } from "./supabaseOptimized";
import { AuthManager } from "./auth";

/**
 * Real-time notification system for the application
 */

export const NOTIFICATION_TYPES = {
  LEAVE_REQUEST_SUBMITTED: "leave_request_submitted",
  LEAVE_REQUEST_APPROVED: "leave_request_approved",
  LEAVE_REQUEST_REJECTED: "leave_request_rejected",
  LEAVE_BALANCE_UPDATED: "leave_balance_updated",
  SYSTEM_ANNOUNCEMENT: "system_announcement",
  SECURITY_ALERT: "security_alert",
  USER_MENTION: "user_mention",
};

export class NotificationManager {
  static instance = null;
  static subscribers = new Map();
  static subscription = null;
  static isConnected = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  static async initialize() {
    const user = AuthManager.getUserSession();
    if (!user) return;

    try {
      // For now, just mark as connected (real-time features can be added later when DB is ready)
      this.isConnected = true;
      console.log("🔔 Notification system initialized (basic mode)");

      // Could add real-time subscriptions here when database tables are ready
    } catch (error) {
      console.warn("Notification initialization warning:", error.message);
      this.isConnected = false;
    }
  }

  static handleNewNotification(notification) {
    console.log("🔔 New notification:", notification);

    // Emit to subscribers
    this.emitToSubscribers("new-notification", notification);

    // Show browser notification if permission granted
    this.showBrowserNotification(notification);

    // Show toast notification
    this.showToastNotification(notification);
  }

  static handleUpdatedNotification(notification) {
    console.log("🔄 Updated notification:", notification);
    this.emitToSubscribers("updated-notification", notification);
  }

  static handleSystemAnnouncement(announcement) {
    console.log("📢 System announcement:", announcement);

    const notification = {
      id: announcement.id,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      created_at: announcement.created_at,
    };

    this.showSystemNotification(notification);
  }

  static showBrowserNotification(notification) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: notification.id,
        data: notification,
      });
    }
  }

  static showToastNotification(notification) {
    // Use the global toast function if available
    if (window.toast) {
      const variant = this.getToastVariant(notification.type);
      window.toast({
        title: notification.title,
        description: notification.message,
        variant,
        duration: this.getToastDuration(notification.priority),
      });
    }
  }

  static showSystemNotification(notification) {
    // System notifications are more prominent
    if (window.toast) {
      window.toast({
        title: `📢 ${notification.title}`,
        description: notification.message,
        variant: notification.priority === "high" ? "destructive" : "default",
        duration: 10000, // Longer duration for system messages
      });
    }
  }

  static getToastVariant(type) {
    switch (type) {
      case NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED:
        return "success";
      case NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED:
        return "destructive";
      case NOTIFICATION_TYPES.SECURITY_ALERT:
        return "destructive";
      default:
        return "default";
    }
  }

  static getToastDuration(priority) {
    switch (priority) {
      case "high":
        return 8000;
      case "medium":
        return 5000;
      case "low":
        return 3000;
      default:
        return 5000;
    }
  }

  static emitToSubscribers(event, data) {
    const eventSubscribers = this.subscribers.get(event) || [];
    eventSubscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in notification subscriber:", error);
      }
    });
  }

  static subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const eventSubscribers = this.subscribers.get(event) || [];
      const index = eventSubscribers.indexOf(callback);
      if (index > -1) {
        eventSubscribers.splice(index, 1);
      }
    };
  }

  static async requestPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      return permission === "granted";
    }
    return false;
  }

  static async sendNotification(userId, notification) {
    try {
      // For now, just store locally and show toast
      const localNotification = {
        id: Date.now(),
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority || "medium",
        data: notification.data || {},
        created_at: new Date().toISOString(),
        read_at: null,
      };

      // Store in localStorage as fallback
      this.storeNotificationLocally(localNotification);

      // Show immediate notification
      this.showToastNotification(localNotification);

      return localNotification;
    } catch (error) {
      console.warn("Failed to send notification:", error.message);
      return null;
    }
  }

  static storeNotificationLocally(notification) {
    try {
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      notifications.unshift(notification); // Add to beginning

      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(50);
      }

      localStorage.setItem("user_notifications", JSON.stringify(notifications));
    } catch (error) {
      console.warn("Failed to store notification locally:", error.message);
    }
  }

  static async markAsRead(notificationId) {
    try {
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      const updated = notifications.map((n) =>
        n.id === notificationId
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      );
      localStorage.setItem("user_notifications", JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to mark notification as read:", error.message);
    }
  }

  static async getUnreadCount() {
    const user = AuthManager.getUserSession();
    if (!user) return 0;

    try {
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      const unreadCount = notifications.filter(
        (n) => n.user_id === user.id && !n.read_at,
      ).length;
      return unreadCount;
    } catch (error) {
      console.warn("Failed to get unread count:", error.message);
      return 0;
    }
  }

  static async getNotifications(options = {}) {
    const user = AuthManager.getUserSession();
    if (!user) return [];

    const { limit = 20, offset = 0, unreadOnly = false, includeRead = true } = options;

    try {
      // Get from localStorage for now
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      let filtered = notifications.filter((n) => n.user_id === user.id);

      // Sort by created_at descending (newest first)
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply filters
      if (unreadOnly) {
        filtered = filtered.filter((n) => !n.read_at);
      } else if (!includeRead) {
        filtered = filtered.filter((n) => !n.read_at);
      }

      // Apply pagination
      const result = filtered.slice(offset, offset + limit);

      return result;
    } catch (error) {
      console.warn("Failed to get notifications:", error.message);
      return [];
    }
  }

  static async clearAllNotifications() {
    const user = AuthManager.getUserSession();
    if (!user) return false;

    try {
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      const filtered = notifications.filter((n) => n.user_id !== user.id);
      localStorage.setItem("user_notifications", JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("Failed to clear notifications:", error.message);
      return false;
    }
  }

  static async deleteNotification(notificationId) {
    try {
      const notifications = JSON.parse(
        localStorage.getItem("user_notifications") || "[]",
      );
      const filtered = notifications.filter((n) => n.id !== notificationId);
      localStorage.setItem("user_notifications", JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("Failed to delete notification:", error.message);
      return false;
    }
  }

  static disconnect() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    if (this.systemSubscription) {
      supabase.removeChannel(this.systemSubscription);
      this.systemSubscription = null;
    }

    this.isConnected = false;
    this.subscribers.clear();
  }

  static getStatus() {
    return {
      connected: this.isConnected,
      subscriberCount: Array.from(this.subscribers.values()).reduce(
        (total, subs) => total + subs.length,
        0,
      ),
      browserNotificationsEnabled:
        "Notification" in window && Notification.permission === "granted",
    };
  }
}

// Auto-initialize notifications when user is logged in
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (AuthManager.isAuthenticated()) {
      NotificationManager.initialize();
      // Request notification permission
      NotificationManager.requestPermission();
    }
  });

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    NotificationManager.disconnect();
  });
}

export default NotificationManager;
