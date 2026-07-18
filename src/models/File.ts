import mongoose, { Schema, Document } from "mongoose";

export interface IFileActivityLog {
  action: "Upload" | "Rename" | "Archive" | "Restore" | "Delete";
  details?: string;
  performedBy: mongoose.Types.ObjectId;
  performedEmail: string;
  performedAt: Date;
}

export interface IFile extends Document {
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedEmail: string;
  owner: mongoose.Types.ObjectId;
  relatedModule?: "Tasks" | "Clients" | "Employees" | "Reports" | "Backups";
  relatedId?: mongoose.Types.ObjectId;
  category: "PDF" | "Image" | "Document" | "Spreadsheet" | "Archive" | "Other";
  tags: string[];
  archived: boolean;
  archivedAt?: Date;
  activityLogs: IFileActivityLog[];
  createdAt: Date;
  updatedAt: Date;
}

const FileActivityLogSchema = new Schema<IFileActivityLog>(
  {
    action: {
      type: String,
      enum: ["Upload", "Rename", "Archive", "Restore", "Delete"],
      required: true,
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
    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const FileSchema = new Schema<IFile>(
  {
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    blobUrl: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedEmail: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    relatedModule: {
      type: String,
      enum: ["Tasks", "Clients", "Employees", "Reports", "Backups"],
    },
    relatedId: {
      type: Schema.Types.ObjectId,
    },
    category: {
      type: String,
      enum: ["PDF", "Image", "Document", "Spreadsheet", "Archive", "Other"],
      default: "Other",
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    archived: {
      type: Boolean,
      default: false,
      required: true,
    },
    archivedAt: {
      type: Date,
    },
    activityLogs: [FileActivityLogSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
FileSchema.index({ owner: 1 });
FileSchema.index({ archived: 1 });
FileSchema.index({ relatedModule: 1, relatedId: 1 });
FileSchema.index({ category: 1 });
FileSchema.index({ tags: 1 });

export default mongoose.models.File || mongoose.model<IFile>("File", FileSchema);
