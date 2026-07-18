import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  details?: string;
  performedBy: mongoose.Types.ObjectId;
  performedEmail: string;
  performedName?: string;
  performedRole?: string;
  ipAddress?: string;
  deviceInfo?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    details: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedEmail: {
      type: String,
      required: true,
    },
    performedName: {
      type: String,
      trim: true,
    },
    performedRole: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "127.0.0.1",
    },
    deviceInfo: {
      type: String,
      trim: true,
      default: "System/Browser Agent",
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for fast history searching and filtering
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entityType: 1 });
AuditLogSchema.index({ performedEmail: 1 });
AuditLogSchema.index({ severity: 1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog || 
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
