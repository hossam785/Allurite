import mongoose, { Schema, Document } from "mongoose";

export interface IBackup extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdEmail: string;
  size: number;
  status: "Pending" | "Completed" | "Failed" | "Restored";
  blobUrl: string;
  restoredAt?: Date;
  restoredBy?: mongoose.Types.ObjectId;
  restoredEmail?: string;
  createdAt: Date;
}

const BackupSchema = new Schema<IBackup>(
  {
    name: {
      type: String,
      required: [true, "Backup name is required"],
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdEmail: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Restored"],
      default: "Pending",
      required: true,
    },
    blobUrl: {
      type: String,
      required: true,
    },
    restoredAt: {
      type: Date,
    },
    restoredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    restoredEmail: {
      type: String,
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

BackupSchema.index({ createdAt: -1 });

export default mongoose.models.Backup || mongoose.model<IBackup>("Backup", BackupSchema);
