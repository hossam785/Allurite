import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import User from "@/models/User";
import { dbConnect } from "@/lib/db";

export async function verifySuperAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SuperAdmin") return null;

    await dbConnect();
    const user = await User.findById(payload.userId);
    
    // Ensure the user account is Active and is still a SuperAdmin
    if (!user || user.role !== "SuperAdmin" || user.status !== "Active") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Authorization check error:", error);
    return null;
  }
}
