import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: "SuperAdmin" | "Employee";
  status: "Active" | "Suspended" | "Pending";
  theme: "dark" | "light";
  notificationPreferences: {
    taskAlerts: boolean;
    followUpAlerts: boolean;
    clientAlerts: boolean;
    systemAlerts: boolean;
    securityAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["SuperAdmin", "Employee"],
      default: "Employee",
    },
    status: {
      type: String,
      enum: ["Active", "Suspended", "Pending"],
      default: "Active",
    },
    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
    notificationPreferences: {
      taskAlerts: { type: Boolean, default: true },
      followUpAlerts: { type: Boolean, default: true },
      clientAlerts: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent compiling model multiple times in Next.js hot-reloads
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
