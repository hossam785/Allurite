import mongoose, { Schema, Document } from "mongoose";

export interface INote {
  _id: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  creatorEmail: string;
  createdAt: Date;
}

export interface IClient extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  status: "Lead" | "Qualified" | "ActiveCustomer" | "Churned";
  source: string;
  assignedAgent: mongoose.Types.ObjectId;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const ClientSchema = new Schema<IClient>(
  {
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
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Lead", "Qualified", "ActiveCustomer", "Churned"],
      default: "Lead",
      required: true,
    },
    source: {
      type: String,
      default: "Other",
      required: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Assigned Agent is required"],
    },
    notes: [NoteSchema],
  },
  {
    timestamps: true,
  }
);

// Performance single-field indexes for frequently queried filters
ClientSchema.index({ status: 1 });
ClientSchema.index({ assignedAgent: 1 });
ClientSchema.index({ email: 1 });

export default mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
