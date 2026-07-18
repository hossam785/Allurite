import mongoose, { Schema, Document } from "mongoose";

export interface ITaskAttachment {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedEmail: string;
  uploadedAt: Date;
}

export interface ITaskComment {
  content: string;
  createdBy: mongoose.Types.ObjectId;
  creatorEmail: string;
  createdAt: Date;
}

export interface ITaskHistory {
  action: string;
  details?: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedEmail: string;
  updatedAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "Pending" | "In Progress" | "Under Review" | "Completed" | "Rejected" | "Cancelled" | "Overdue";
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate: Date;
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  followUp?: mongoose.Types.ObjectId;
  attachments: ITaskAttachment[];
  comments: ITaskComment[];
  history: ITaskHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<ITaskAttachment>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedEmail: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommentSchema = new Schema<ITaskComment>(
  {
    content: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorEmail: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskHistorySchema = new Schema<ITaskHistory>(
  {
    action: { type: String, required: true },
    details: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedEmail: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Under Review", "Completed", "Rejected", "Cancelled", "Overdue"],
      default: "Pending",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Task due date is required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Assigned employee is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
    },
    followUp: {
      type: Schema.Types.ObjectId,
      ref: "FollowUp",
    },
    attachments: [AttachmentSchema],
    comments: [CommentSchema],
    history: [TaskHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
TaskSchema.index({ status: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ dueDate: 1 });

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
