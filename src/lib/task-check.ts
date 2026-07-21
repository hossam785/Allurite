import mongoose from "mongoose";
import Task from "@/models/Task";
import Employee from "@/models/Employee";

import { sendSystemNotification } from "./notification-service";

let isTaskCheckRunning = false;
let lastTaskCheckTime = 0;
const TASK_CHECK_THROTTLE_MS = 60 * 1000; // Throttle checks to once every 60 seconds

export async function checkOverdueTasks() {
  const now = new Date();
  const nowMs = now.getTime();

  // Skip if check is already running or ran within the last 60 seconds
  if (isTaskCheckRunning || nowMs - lastTaskCheckTime < TASK_CHECK_THROTTLE_MS) {
    return;
  }

  isTaskCheckRunning = true;
  lastTaskCheckTime = nowMs;

  try {
    // Find incomplete tasks that have passed their due dates
    const overdueTasks = await Task.find({
      status: { $in: ["Pending", "In Progress", "Rejected"] },
      dueDate: { $lt: now },
    });

    if (overdueTasks.length === 0) return;

    for (const tsk of overdueTasks) {
      // 1. Resolve agent's User ID
      const employee = await Employee.findById(tsk.assignedTo);
      if (!employee) continue;

      // 2. Update status to Overdue
      tsk.status = "Overdue";

      // Append entry to permanent activity history
      tsk.history.push({
        action: "Status Changed",
        details: "Automatically marked as Overdue (Due date passed)",
        updatedBy: employee.user,
        updatedEmail: "System",
        updatedAt: now,
      });

      await tsk.save();

      // 3. Create Notification for the assigned agent
      await sendSystemNotification({
        recipient: employee.user,
        title: "Task Overdue ⚠️",
        message: `The task "${tsk.title}" assigned to you has passed its due date and is now overdue.`,
        category: "Task",
        priority: "High",
        actionUrl: `/dashboard/tasks/${tsk._id}`,
      });
    }

    console.log(`Auto-checked tasks: ${overdueTasks.length} marked as Overdue.`);
  } catch (error) {
    console.error("Error in checkOverdueTasks helper:", error);
  } finally {
    isTaskCheckRunning = false;
  }
}
