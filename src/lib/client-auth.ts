import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { dbConnect } from "@/lib/db";

export async function verifyClientAccess(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    await dbConnect();
    const user = await User.findById(payload.userId);
    if (!user || user.status !== "Active") return null;

    if (user.role === "SuperAdmin") {
      return {
        user,
        employee: null,
        employeeId: null,
        role: "SuperAdmin" as const,
      };
    }

    if (user.role === "Employee") {
      const employee = await Employee.findOne({ user: user._id });
      if (!employee || employee.status !== "Active") {
        return null; // Employee profile must be active
      }
      return {
        user,
        employee,
        employeeId: employee._id.toString(),
        role: "Employee" as const,
      };
    }

    return null;
  } catch (error) {
    console.error("Client authorization check error:", error);
    return null;
  }
}
