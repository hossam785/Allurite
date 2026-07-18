import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  user: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phone?: string;
  department: string;
  position: string;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema<IEmployee> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Associated User account is required"],
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance single-field indexes for frequently queried filters
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ department: 1 });

export default mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);
