/**
 * Integration utilities for connecting notifications with leave request workflows
 */

import NotificationManager, { NOTIFICATION_TYPES } from "@/lib/notifications";
import { AuthManager } from "@/lib/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export class NotificationIntegration {
  
  /**
   * Send notification when a leave request is submitted
   */
  static async notifyLeaveRequestSubmitted(leaveRequest, managerId) {
    try {
      if (!managerId) {
        console.warn("Manager ID not provided for leave request notification");
        return;
      }

      const startDate = format(new Date(leaveRequest.start_date), "dd MMMM yyyy", { locale: id });
      const endDate = format(new Date(leaveRequest.end_date), "dd MMMM yyyy", { locale: id });
      const employeeName = leaveRequest.employees?.name || leaveRequest.employee_name || "Karyawan";
      const leaveType = leaveRequest.leave_types?.name || leaveRequest.leave_type || "Cuti";

      const notification = {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED,
        title: "📋 Pengajuan Cuti Baru",
        message: `${employeeName} mengajukan ${leaveType} dari ${startDate} hingga ${endDate}. Menunggu persetujuan Anda.`,
        priority: "medium",
        data: {
          leave_request_id: leaveRequest.id,
          employee_id: leaveRequest.employee_id,
          leave_type: leaveType,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          action_required: true
        }
      };

      await NotificationManager.sendNotification(managerId, notification);
      
      // Also send to the employee confirming submission
      const confirmationNotification = {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED,
        title: "✅ Cuti Berhasil Diajukan",
        message: `Pengajuan ${leaveType} Anda dari ${startDate} hingga ${endDate} telah dikirim dan menunggu persetujuan.`,
        priority: "low",
        data: {
          leave_request_id: leaveRequest.id,
          status: "pending"
        }
      };

      await NotificationManager.sendNotification(leaveRequest.employee_id, confirmationNotification);

      console.log("✅ Leave request submission notifications sent");
    } catch (error) {
      console.error("Failed to send leave request submission notifications:", error);
    }
  }

  /**
   * Send notification when a leave request is approved
   */
  static async notifyLeaveRequestApproved(leaveRequest, approvedBy) {
    try {
      const startDate = format(new Date(leaveRequest.start_date), "dd MMMM yyyy", { locale: id });
      const endDate = format(new Date(leaveRequest.end_date), "dd MMMM yyyy", { locale: id });
      const leaveType = leaveRequest.leave_types?.name || leaveRequest.leave_type || "Cuti";
      const approverName = approvedBy?.name || "Atasan";

      const notification = {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED,
        title: "🎉 Cuti Disetujui",
        message: `Pengajuan ${leaveType} Anda dari ${startDate} hingga ${endDate} telah disetujui oleh ${approverName}.`,
        priority: "medium",
        data: {
          leave_request_id: leaveRequest.id,
          approved_by: approvedBy?.id,
          approved_at: new Date().toISOString(),
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date
        }
      };

      await NotificationManager.sendNotification(leaveRequest.employee_id, notification);
      console.log("✅ Leave request approval notification sent");
    } catch (error) {
      console.error("Failed to send leave request approval notification:", error);
    }
  }

  /**
   * Send notification when a leave request is rejected
   */
  static async notifyLeaveRequestRejected(leaveRequest, rejectedBy, reason = "") {
    try {
      const startDate = format(new Date(leaveRequest.start_date), "dd MMMM yyyy", { locale: id });
      const endDate = format(new Date(leaveRequest.end_date), "dd MMMM yyyy", { locale: id });
      const leaveType = leaveRequest.leave_types?.name || leaveRequest.leave_type || "Cuti";
      const rejectorName = rejectedBy?.name || "Atasan";

      const notification = {
        type: NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED,
        title: "❌ Cuti Ditolak",
        message: `Pengajuan ${leaveType} Anda dari ${startDate} hingga ${endDate} ditolak oleh ${rejectorName}. ${reason ? `Alasan: ${reason}` : "Silakan hubungi atasan untuk informasi lebih lanjut."}`,
        priority: "high",
        data: {
          leave_request_id: leaveRequest.id,
          rejected_by: rejectedBy?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date
        }
      };

      await NotificationManager.sendNotification(leaveRequest.employee_id, notification);
      console.log("✅ Leave request rejection notification sent");
    } catch (error) {
      console.error("Failed to send leave request rejection notification:", error);
    }
  }

  /**
   * Send notification when leave balance is updated
   */
  static async notifyLeaveBalanceUpdated(employeeId, balanceInfo) {
    try {
      const notification = {
        type: NOTIFICATION_TYPES.LEAVE_BALANCE_UPDATED,
        title: "📊 Saldo Cuti Diperbarui",
        message: `Saldo cuti Anda telah diperbarui. Sisa cuti tahunan: ${balanceInfo.annual_leave || 0} hari, cuti bersama: ${balanceInfo.collective_leave || 0} hari.`,
        priority: "low",
        data: {
          employee_id: employeeId,
          updated_at: new Date().toISOString(),
          balance: balanceInfo
        }
      };

      await NotificationManager.sendNotification(employeeId, notification);
      console.log("✅ Leave balance update notification sent");
    } catch (error) {
      console.error("Failed to send leave balance update notification:", error);
    }
  }

  /**
   * Send system announcement to all users or specific groups
   */
  static async sendSystemAnnouncement(announcement, targetUsers = null) {
    try {
      const notification = {
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: `📢 ${announcement.title}`,
        message: announcement.message,
        priority: announcement.priority || "medium",
        data: {
          announcement_id: announcement.id,
          category: announcement.category || "general",
          valid_until: announcement.valid_until
        }
      };

      if (targetUsers && Array.isArray(targetUsers)) {
        // Send to specific users
        for (const userId of targetUsers) {
          await NotificationManager.sendNotification(userId, notification);
        }
      } else {
        // For now, we don't have a broadcast mechanism
        // This would require a different approach when we have user management
        console.log("System announcement ready to be sent to all users");
      }

      console.log("✅ System announcement notifications prepared");
    } catch (error) {
      console.error("Failed to send system announcement:", error);
    }
  }

  /**
   * Send security alert notification
   */
  static async sendSecurityAlert(userId, alertInfo) {
    try {
      const notification = {
        type: NOTIFICATION_TYPES.SECURITY_ALERT,
        title: "🔒 Peringatan Keamanan",
        message: alertInfo.message,
        priority: "high",
        data: {
          alert_type: alertInfo.type,
          ip_address: alertInfo.ip_address,
          user_agent: alertInfo.user_agent,
          timestamp: new Date().toISOString(),
          action_required: alertInfo.action_required || false
        }
      };

      await NotificationManager.sendNotification(userId, notification);
      console.log("✅ Security alert notification sent");
    } catch (error) {
      console.error("Failed to send security alert:", error);
    }
  }

  /**
   * Integration hook for leave request form submissions
   */
  static async handleLeaveRequestSubmission(formData, managerId) {
    try {
      // This would be called from the leave request form component
      await this.notifyLeaveRequestSubmitted(formData, managerId);
      
      // You can add additional logic here like:
      // - Email notifications
      // - Slack/Teams integration
      // - Calendar integration
      // - Audit logging
      
    } catch (error) {
      console.error("Error in leave request submission handler:", error);
    }
  }

  /**
   * Integration hook for batch leave proposal completion
   */
  static async handleBatchProposalCompletion(unitName, proposalDate, completedBy, proposalCount) {
    try {
      const user = AuthManager.getUserSession();
      if (!user) return;

      const notification = {
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: "📋 Usulan Batch Selesai",
        message: `Usulan cuti batch dari ${unitName} tanggal ${format(new Date(proposalDate), "dd MMMM yyyy", { locale: id })} telah selesai diproses. Total: ${proposalCount} pengajuan.`,
        priority: "medium",
        data: {
          unit_name: unitName,
          proposal_date: proposalDate,
          completed_by: completedBy?.id || user.id,
          proposal_count: proposalCount,
          completed_at: new Date().toISOString()
        }
      };

      // Send to the person who completed it
      await NotificationManager.sendNotification(user.id, notification);
      
      // In a real system, you might also notify:
      // - HR department
      // - Unit managers
      // - System administrators

      console.log("✅ Batch proposal completion notification sent");
    } catch (error) {
      console.error("Failed to send batch proposal completion notification:", error);
    }
  }

  /**
   * Demo function to create realistic workflow notifications
   */
  static async createWorkflowDemo() {
    const user = AuthManager.getUserSession();
    if (!user) return;

    try {
      // Simulate a complete leave request workflow
      await this.notifyLeaveRequestSubmitted({
        id: Date.now(),
        employee_id: user.id,
        employees: { name: user.name || "Demo User" },
        leave_types: { name: "Cuti Tahunan" },
        start_date: "2025-01-20",
        end_date: "2025-01-22"
      }, user.id);

      // Simulate approval after 2 seconds
      setTimeout(async () => {
        await this.notifyLeaveRequestApproved({
          id: Date.now(),
          employee_id: user.id,
          leave_types: { name: "Cuti Tahunan" },
          start_date: "2025-01-20",
          end_date: "2025-01-22"
        }, { id: "manager123", name: "Manager Demo" });
      }, 2000);

      // Simulate balance update after 4 seconds
      setTimeout(async () => {
        await this.notifyLeaveBalanceUpdated(user.id, {
          annual_leave: 8,
          collective_leave: 2
        });
      }, 4000);

      console.log("✅ Workflow demo notifications created");
    } catch (error) {
      console.error("Failed to create workflow demo:", error);
    }
  }

}

export default NotificationIntegration;
