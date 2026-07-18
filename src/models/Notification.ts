import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "Reminder" | "Overdue" | "System"; // Backwards compatibility for basic type
  category: "Task" | "Follow-Up" | "Client" | "Employee" | "System" | "Security";
  priority: "Low" | "Normal" | "High" | "Critical";
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient user is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Reminder", "Overdue", "System"],
      default: "System",
      required: true,
    },
    category: {
      type: String,
      enum: ["Task", "Follow-Up", "Client", "Employee", "System", "Security"],
      default: "System",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Critical"],
      default: "Normal",
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      required: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    deleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ deleted: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
