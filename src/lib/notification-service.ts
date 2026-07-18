import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

interface INotificationParams {
  recipient: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  category: "Task" | "Follow-Up" | "Client" | "Employee" | "System" | "Security";
  priority?: "Low" | "Normal" | "High" | "Critical";
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export async function sendSystemNotification({
  recipient,
  title,
  message,
  category,
  priority = "Normal",
  actionUrl,
  metadata,
}: INotificationParams) {
  try {
    // 1. Fetch user preferences
    const user = await User.findById(recipient);
    if (!user) {
      console.warn(`Cannot send notification. Recipient User ID ${recipient.toString()} not found.`);
      return null;
    }

    // 2. Resolve preferences check (bypassed if Critical priority or Security category)
    let shouldDeliver = true;

    if (priority !== "Critical" && category !== "Security") {
      const prefs = user.notificationPreferences || {
        taskAlerts: true,
        followUpAlerts: true,
        clientAlerts: true,
        systemAlerts: true,
      };

      if (category === "Task" && !prefs.taskAlerts) shouldDeliver = false;
      if (category === "Follow-Up" && !prefs.followUpAlerts) shouldDeliver = false;
      if (category === "Client" && !prefs.clientAlerts) shouldDeliver = false;
      if (category === "System" && !prefs.systemAlerts) shouldDeliver = false;
    }

    if (!shouldDeliver) {
      console.log(`Notification to user ${user.email} suppressed by notification preference rules.`);
      return null;
    }

    // Map categories to basic type for legacy bell counts compatibility
    let mappedType: "Reminder" | "Overdue" | "System" = "System";
    if (priority === "High" || priority === "Critical") {
      mappedType = "Overdue";
    } else if (category === "Task" || category === "Follow-Up") {
      mappedType = "Reminder";
    }

    // 3. Insert notification
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type: mappedType,
      category,
      priority,
      read: false,
      actionUrl,
      metadata,
      deleted: false,
    });

    console.log(`Delivered notification: "${title}" to user ${user.email}`);
    return notification;
  } catch (error) {
    console.error("Error in sendSystemNotification helper:", error);
    return null;
  }
}
