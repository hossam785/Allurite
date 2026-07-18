import AuditLog from "@/models/AuditLog";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

export interface AuditLogPayload {
  action: string;
  entityType: string;
  entityId?: string | mongoose.Types.ObjectId;
  details?: string;
  performedBy: string | mongoose.Types.ObjectId;
  performedEmail: string;
  performedName?: string;
  performedRole?: string;
  ipAddress?: string;
  deviceInfo?: string;
  severity?: "Low" | "Medium" | "High" | "Critical";
  metadata?: Record<string, any>;
}

export async function logAuditEvent(payload: AuditLogPayload, request?: NextRequest) {
  try {
    let resolvedIp = payload.ipAddress || "127.0.0.1";
    let resolvedUserAgent = payload.deviceInfo || "System/Browser Agent";

    if (request) {
      const forwarded = request.headers.get("x-forwarded-for");
      if (forwarded) {
        resolvedIp = forwarded.split(",")[0].trim();
      } else {
        resolvedIp = (request as any).ip || request.headers.get("x-real-ip") || "127.0.0.1";
      }
      resolvedUserAgent = request.headers.get("user-agent") || "System/Browser Agent";
    }

    const log = new AuditLog({
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId ? new mongoose.Types.ObjectId(payload.entityId) : undefined,
      details: payload.details,
      performedBy: new mongoose.Types.ObjectId(payload.performedBy),
      performedEmail: payload.performedEmail,
      performedName: payload.performedName || payload.performedEmail.split("@")[0],
      performedRole: payload.performedRole || "Staff",
      ipAddress: resolvedIp,
      deviceInfo: resolvedUserAgent,
      severity: payload.severity || "Low",
      metadata: payload.metadata || {},
    });
    
    await log.save();
    console.log(`[AUDIT LOG] ${payload.action} on ${payload.entityType} by ${payload.performedEmail} (${resolvedIp})`);
  } catch (err) {
    console.error("Failed writing audit log:", err);
  }
}
