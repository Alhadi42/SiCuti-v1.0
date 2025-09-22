import { supabase } from "./supabaseOptimized";
import { AuthManager } from "./auth";

/**
 * Real-time notification system for the application (DB-backed)
 * Uses `notifications` and optional `system_announcements` tables in Supabase.
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
  static systemSubscription = null;
  static isConnected = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  // Initialize realtime subscriptions and state
  static async initialize() {
    const user = AuthManager.getUserSession();
    if (!user) return;

    try {
      // Cleanup existing
      if (this.subscription) {
        try {
          await supabase.removeChannel(this.subscription);
        } catch (e) {
          console.warn("Failed to remove old subscription:", e);
        }
        this.subscription = null;
      }

      // Subscribe to user notifications (INSERT/UPDATE)
      this.subscription = supabase
        .channel(`public:notifications:user:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload?.new) this.handleNewNotification(payload.new);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload?.new) this.handleUpdatedNotification(payload.new);
          },
        )
        .subscribe();

      // Subscribe to system announcements if table exists
      try {
        this.systemSubscription = supabase
          .channel(`public:system_announcements`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "system_announcements" },
            (payload) => {
              if (payload?.new) this.handleSystemAnnouncement(payload.new);
            },
          )
          .subscribe();
      } catch (e) {
        console.warn("System announcements subscription skipped:", e?.message || e);
      }

      this.isConnected = true;
      console.log("🔔 Notification system initialized (DB-backed)");
    } catch (error) {
      console.warn("Notification initialization warning:", error?.message || error);
      this.isConnected = false;
    }
  }

  static handleNewNotification(notification) {
    console.log("🔔 New notification:", notification);
    this.emitToSubscribers("new-notification", notification);
    this.showBrowserNotification(notification);
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
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: String(notification.id),
          data: notification,
        });
      } catch (e) {
        console.warn("Browser notification failed:", e?.message || e);
      }
    }
  }

  static showToastNotification(notification) {
    if (typeof window === "undefined") return;
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
    if (typeof window === "undefined") return;
    if (window.toast) {
      window.toast({
        title: `📢 ${notification.title}`,
        description: notification.message,
        variant: notification.priority === "high" ? "destructive" : "default",
        duration: 10000,
      });
    }
  }

  static getToastVariant(type) {
    switch (type) {
      case NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED:
        return "success";
      case NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED:
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
      } catch (err) {
        // Fix: Use 'err' instead of 'error' to avoid conflict
        console.error("Error in notification subscriber:", err);
      }
    });
  }

  static subscribe(event, callback) {
    if (!this.subscribers.has(event)) this.subscribers.set(event, []);
    this.subscribers.get(event).push(callback);
    return () => {
      const eventSubscribers = this.subscribers.get(event) || [];
      const index = eventSubscribers.indexOf(callback);
      if (index > -1) eventSubscribers.splice(index, 1);
    };
  }

  static async requestPermission() {
    if (typeof window === "undefined") return false;
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      return permission === "granted";
    }
    return false;
  }

  // Persist notification to DB and return inserted row
  static async sendNotification(userId, notification) {
    try {
      const payload = {
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority || "medium",
        data: notification.data || {},
      };

      const { data, error } = await supabase.from("notifications").insert(payload).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn("Failed to send notification via DB, showing local toast:", error?.message || error);
      this.showToastNotification(notification);
      return null;
    }
  }

  // Mark notification as read in DB
  static async markAsRead(notificationId) {
    try {
      const user = AuthManager.getUserSession();
      if (!user) return false;

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .match({ id: notificationId, user_id: user.id });

      if (error) {
        console.warn("Failed to mark as read:", error.message || error);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Error marking notification as read:", error?.message || error);
      return false;
    }
  }

  static async getUnreadCount() {
    const user = AuthManager.getUserSession();
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .eq("user_id", user.id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.warn("Failed to get unread count from DB:", error?.message || error);
      return 0;
    }
  }

  // Get notifications from DB with pagination and filters
  static async getNotifications(options = {}) {
    const user = AuthManager.getUserSession();
    if (!user) return [];

    const { limit = 20, offset = 0, unreadOnly = false, includeRead = true } = options;

    try {
      let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly || !includeRead) query = query.is("read_at", null);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn("Failed to get notifications from DB:", error?.message || error);
      return [];
    }
  }

  static async clearAllNotifications() {
    const user = AuthManager.getUserSession();
    if (!user) return false;

    try {
      const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn("Failed to clear notifications:", error?.message || error);
      return false;
    }
  }

  static async deleteNotification(notificationId) {
    try {
      const user = AuthManager.getUserSession();
      if (!user) return false;

      const { error } = await supabase.from("notifications").delete().match({ id: notificationId, user_id: user.id });
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn("Failed to delete notification:", error?.message || error);
      return false;
    }
  }

  static disconnect() {
    try {
      if (this.subscription) {
        supabase.removeChannel(this.subscription);
        this.subscription = null;
      }

      if (this.systemSubscription) {
        supabase.removeChannel(this.systemSubscription);
        this.systemSubscription = null;
      }
    } catch (e) {
      console.warn("Error while disconnecting subscriptions:", e);
    }

    this.isConnected = false;
    this.subscribers.clear();
  }

  static getStatus() {
    return {
      connected: this.isConnected,
      subscriberCount: Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0),
      browserNotificationsEnabled: typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted",
    };
  }
}

// Auto-initialize notifications when user is logged in
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (AuthManager.isAuthenticated()) {
      NotificationManager.initialize();
      NotificationManager.requestPermission();
    }
  });

  window.addEventListener("beforeunload", () => {
    NotificationManager.disconnect();
  });
}

export default NotificationManager;