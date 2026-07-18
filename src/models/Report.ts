import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  title: string;
  category: "Employee" | "Sales" | "Client" | "Follow-Up" | "Task" | "Productivity" | "Activity" | "System";
  generatedBy: mongoose.Types.ObjectId;
  generatedEmail: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  kpis: Record<string, any>;
  chartsData: Record<string, any>;
  rawMetrics: Record<string, any>;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Employee", "Sales", "Client", "Follow-Up", "Task", "Productivity", "Activity", "System"],
      required: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedEmail: {
      type: String,
      required: true,
    },
    dateRange: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    kpis: {
      type: Schema.Types.Mixed,
      default: {},
    },
    chartsData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rawMetrics: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index to optimize the 15-minute caching lookup
ReportSchema.index({ category: 1, "dateRange.start": 1, "dateRange.end": 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
