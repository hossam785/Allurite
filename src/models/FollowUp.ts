import mongoose, { Schema, Document } from "mongoose";

export interface IHistoryLog {
  status: "Pending" | "Scheduled" | "Completed" | "Missed" | "Cancelled";
  scheduledAt: Date;
  notes?: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedEmail: string;
  updatedAt: Date;
}

export interface IFollowUp extends Document {
  client: mongoose.Types.ObjectId;
  assignedAgent: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: "Call" | "Email" | "Meeting" | "Demo" | "Other";
  scheduledAt: Date;
  status: "Pending" | "Scheduled" | "Completed" | "Missed" | "Cancelled";
  notes?: string;
  history: IHistoryLog[];
  createdAt: Date;
  updatedAt: Date;
}

const HistoryLogSchema = new Schema<IHistoryLog>(
  {
    status: {
      type: String,
      enum: ["Pending", "Scheduled", "Completed", "Missed", "Cancelled"],
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedEmail: {
      type: String,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const FollowUpSchema = new Schema<IFollowUp>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Associated Client is required"],
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Assigned Agent is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Call", "Email", "Meeting", "Demo", "Other"],
      default: "Call",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled date/time is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Scheduled", "Completed", "Missed", "Cancelled"],
      default: "Scheduled",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    history: [HistoryLogSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
FollowUpSchema.index({ status: 1 });
FollowUpSchema.index({ assignedAgent: 1 });
FollowUpSchema.index({ scheduledAt: 1 });

export default mongoose.models.FollowUp || mongoose.model<IFollowUp>("FollowUp", FollowUpSchema);
