import Task from "@/models/Task";
import Client from "@/models/Client";
import FollowUp from "@/models/FollowUp";
import Employee from "@/models/Employee";
import mongoose from "mongoose";

export interface AnalyticsResult {
  kpis: Record<string, any>;
  chartsData: Record<string, any>;
  rawMetrics: Record<string, any>;
}

export async function calculateAnalytics(
  category: string,
  start: Date,
  end: Date,
  employeeId?: string
): Promise<AnalyticsResult> {
  const employeeFilterObj = employeeId ? new mongoose.Types.ObjectId(employeeId) : null;

  // 1. Task Metrics
  const taskQuery: any = { createdAt: { $gte: start, $lte: end } };
  if (employeeFilterObj) taskQuery.assignedTo = employeeFilterObj;
  const tasks = await Task.find(taskQuery);

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "Completed").length,
    pending: tasks.filter(t => t.status === "Pending").length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    overdue: tasks.filter(t => t.status === "Overdue" || (t.status !== "Completed" && t.dueDate < new Date())).length,
    rejected: tasks.filter(t => t.status === "Rejected").length,
    cancelled: tasks.filter(t => t.status === "Cancelled").length,
  };

  // 2. Follow-Up Metrics
  const fuQuery: any = { scheduledAt: { $gte: start, $lte: end } };
  if (employeeFilterObj) fuQuery.assignedAgent = employeeFilterObj;
  const followups = await FollowUp.find(fuQuery);

  const fuStats = {
    total: followups.length,
    completed: followups.filter(f => f.status === "Completed").length,
    scheduled: followups.filter(f => f.status === "Scheduled").length,
    pending: followups.filter(f => f.status === "Pending").length,
    missed: followups.filter(f => f.status === "Missed").length,
    cancelled: followups.filter(f => f.status === "Cancelled").length,
    overdue: followups.filter(f => f.status !== "Completed" && f.scheduledAt && f.scheduledAt < new Date()).length,
  };

  // 3. Client Metrics
  const cliQuery: any = { createdAt: { $gte: start, $lte: end } };
  if (employeeFilterObj) cliQuery.assignedAgent = employeeFilterObj;
  const clients = await Client.find(cliQuery);

  const sourceCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  clients.forEach(c => {
    const src = c.source || "Other";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    const stat = c.status || "Pending";
    statusCounts[stat] = (statusCounts[stat] || 0) + 1;
  });

  const clientStats = {
    total: clients.length,
    active: statusCounts["Active"] || 0,
    inactive: statusCounts["Inactive"] || 0,
    pending: statusCounts["Pending"] || 0,
    conversionRate: clients.length > 0 
      ? parseFloat((( (statusCounts["Active"] || 0) / clients.length) * 100).toFixed(2)) 
      : 0,
  };

  // 4. Employee Productivity Scores (Optimized in-memory filtering)
  let employeesList: any[] = [];
  if (employeeFilterObj) {
    const emp = await Employee.findById(employeeFilterObj);
    if (emp) employeesList = [emp];
  } else {
    employeesList = await Employee.find({ status: "Active" }).lean();
  }

  const productivityDetails = employeesList.map(emp => {
    const empIdStr = emp._id.toString();
    const empTasks = tasks.filter(t => t.assignedTo && t.assignedTo.toString() === empIdStr);
    const empFUs = followups.filter(f => f.assignedAgent && f.assignedAgent.toString() === empIdStr);
    const empClientsCount = clients.filter(c => c.assignedAgent && c.assignedAgent.toString() === empIdStr).length;

    const tComp = empTasks.filter(t => t.status === "Completed").length;
    const fComp = empFUs.filter(f => f.status === "Completed").length;
    const tOver = empTasks.filter(t => t.status === "Overdue" || (t.status !== "Completed" && t.dueDate && t.dueDate < new Date())).length;
    const fMiss = empFUs.filter(f => f.status === "Missed").length;

    const totalItems = empTasks.length + empFUs.length;
    // Formula: weighted completed actions divided by totals, scaled to 100
    const score = totalItems > 0
      ? parseFloat((( (tComp * 10 + fComp * 5) / (empTasks.length * 10 + empFUs.length * 5) ) * 100).toFixed(1))
      : 100.0; // Defaults to 100 if no items assigned

    return {
      employeeId: empIdStr,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      tasksCompleted: tComp,
      tasksPending: empTasks.filter(t => t.status === "Pending" || t.status === "In Progress").length,
      tasksOverdue: tOver,
      followupsCompleted: fComp,
      followupsMissed: fMiss,
      clientsCount: empClientsCount,
      productivityScore: Math.min(100, Math.max(0, score)),
    };
  });

  const avgProductivityScore = productivityDetails.length > 0
    ? parseFloat((productivityDetails.reduce((acc, curr) => acc + curr.productivityScore, 0) / productivityDetails.length).toFixed(1))
    : 100.0;

  // 5. Caching Chart Intervals (Trend of completions)
  // Split time-range into 6 segments
  const intervalsCount = 6;
  const timeDiff = end.getTime() - start.getTime();
  const stepMs = Math.max(1000, timeDiff / intervalsCount);
  const trendPoints: { label: string; tasksCompleted: number; followupsCompleted: number }[] = [];

  for (let i = 0; i <= intervalsCount; i++) {
    const ptDate = new Date(start.getTime() + stepMs * i);
    const label = ptDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    
    // Find count completed before this date point
    const completedTasksAtPt = tasks.filter(t => t.status === "Completed" && t.updatedAt <= ptDate).length;
    const completedFUsAtPt = followups.filter(f => f.status === "Completed" && f.updatedAt <= ptDate).length;

    trendPoints.push({
      label,
      tasksCompleted: completedTasksAtPt,
      followupsCompleted: completedFUsAtPt,
    });
  }

  // Aggregate results based on requested report category
  const singleEmpScore = productivityDetails.length > 0 ? productivityDetails[0].productivityScore : 100.0;
  const kpis: Record<string, any> = {
    avgProductivityScore: employeeFilterObj ? singleEmpScore : avgProductivityScore,
    totalEmployeesCount: employeeFilterObj ? 1 : await Employee.countDocuments({ status: "Active" }),
    tasks: taskStats,
    followups: fuStats,
    clients: clientStats,
  };

  const chartsData: Record<string, any> = {
    trend: trendPoints,
    sources: Object.entries(sourceCounts).map(([name, value]) => ({ name, value })),
    clientStatuses: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    taskStatuses: [
      { name: "Completed", value: taskStats.completed },
      { name: "Pending", value: taskStats.pending },
      { name: "In Progress", value: taskStats.inProgress },
      { name: "Overdue", value: taskStats.overdue },
      { name: "Rejected", value: taskStats.rejected },
    ],
    fuStatuses: [
      { name: "Completed", value: fuStats.completed },
      { name: "Scheduled", value: fuStats.scheduled },
      { name: "Missed", value: fuStats.missed },
      { name: "Cancelled", value: fuStats.cancelled },
    ],
  };

  const rawMetrics: Record<string, any> = {
    productivityDetails,
  };

  return {
    kpis,
    chartsData,
    rawMetrics,
  };
}
