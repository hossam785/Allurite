import mongoose from "mongoose";
import FollowUp from "@/models/FollowUp";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import { sendSystemNotification } from "./notification-service";

let isFollowUpCheckRunning = false;
let lastFollowUpCheckTime = 0;
const FOLLOWUP_CHECK_THROTTLE_MS = 60 * 1000; // Throttle checks to once every 60 seconds

export async function checkOverdueFollowUps() {
  const now = new Date();
  const nowMs = now.getTime();

  // Skip if check is already running or ran within the last 60 seconds
  if (isFollowUpCheckRunning || nowMs - lastFollowUpCheckTime < FOLLOWUP_CHECK_THROTTLE_MS) {
    return;
  }

  isFollowUpCheckRunning = true;
  lastFollowUpCheckTime = nowMs;

  try {
    // Find scheduled follow-ups that have passed their schedule date
    const overdueFollowUps = await FollowUp.find({
      status: "Scheduled",
      scheduledAt: { $lt: now },
    });

    if (overdueFollowUps.length === 0) return;

    for (const fup of overdueFollowUps) {
      // 1. Resolve agent's User ID
      const employee = await Employee.findById(fup.assignedAgent);
      if (!employee) continue;

      // 2. Resolve client name
      const clientObj = await Client.findById(fup.client);
      const clientName = clientObj 
        ? `${clientObj.firstName} ${clientObj.lastName}`
        : "Unknown Client";

      // 3. Update status to Missed
      fup.status = "Missed";
      
      // Use the agent's User ID as the modifier for the audit history log
      fup.history.push({
        status: "Missed",
        scheduledAt: fup.scheduledAt,
        notes: "Automatically marked as Missed (Overdue)",
        updatedBy: employee.user,
        updatedEmail: "System",
        updatedAt: now,
      });

      await fup.save();

      // 4. Create Overdue Notification for the agent
      await sendSystemNotification({
        recipient: employee.user,
        title: "Follow-Up Overdue ⚠️",
        message: `The scheduled ${fup.type.toLowerCase()} follow-up "${fup.title}" for client ${clientName} is overdue.`,
        category: "Follow-Up",
        priority: "High",
        actionUrl: `/dashboard/followups/${fup._id}`,
      });
    }

    console.log(`Auto-checked follow-ups: ${overdueFollowUps.length} marked as Missed.`);
  } catch (error) {
    console.error("Error in checkOverdueFollowUps helper:", error);
  } finally {
    isFollowUpCheckRunning = false;
  }
}
