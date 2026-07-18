import mongoose, { Schema, Document } from "mongoose";

export interface IRolePermission {
  category: "Users" | "Employees" | "Clients" | "Follow-Ups" | "Tasks" | "Notifications" | "Files" | "Reports" | "Settings" | "Backups";
  actions: ("View" | "Create" | "Edit" | "Delete" | "Approve" | "Export")[];
}

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: IRolePermission[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    category: {
      type: String,
      enum: ["Users", "Employees", "Clients", "Follow-Ups", "Tasks", "Notifications", "Files", "Reports", "Settings", "Backups"],
      required: true,
    },
    actions: {
      type: [String],
      enum: ["View", "Create", "Edit", "Delete", "Approve", "Export"],
      default: [],
    },
  },
  { _id: false }
);

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [RolePermissionSchema],
    isDefault: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Role || 
  mongoose.model<IRole>("Role", RoleSchema);
