import mongoose, { Schema, Document } from "mongoose";

export interface ICompanySettings extends Document {
  key: string;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
  country: string;
  timezone: string;
  language: string;
  currency: string;
  workWeekStart: number; // 0 = Sunday, 1 = Monday, etc.
  workWeekEnd: number;   // 4 = Thursday, 5 = Friday, etc.
  followupIntervalDays: number;
  reminderOffsetMinutes: number;
  notificationRetentionDays: number;
  emailNotificationsEnabled: boolean;
  passwordMinLength: number;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    key: {
      type: String,
      default: "global_settings",
      unique: true,
      required: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      default: "الشركة اللوريتية المحدودة",
      trim: true,
    },
    companyEmail: {
      type: String,
      trim: true,
      default: "info@alluritesolutions.com.eg",
    },
    companyPhone: {
      type: String,
      trim: true,
      default: "+20 100 123 4567",
    },
    companyAddress: {
      type: String,
      trim: true,
      default: "المعادي، القاهرة، جمهورية مصر العربية",
    },
    companyWebsite: {
      type: String,
      trim: true,
      default: "https://alluritesolutions.com.eg",
    },
    country: {
      type: String,
      default: "Egypt",
      required: true,
    },
    timezone: {
      type: String,
      default: "Africa/Cairo",
      required: true,
    },
    language: {
      type: String,
      default: "ar",
      required: true,
    },
    currency: {
      type: String,
      default: "EGP",
      required: true,
    },
    workWeekStart: {
      type: Number,
      default: 0, // Sunday
      required: true,
    },
    workWeekEnd: {
      type: Number,
      default: 4, // Thursday
      required: true,
    },
    followupIntervalDays: {
      type: Number,
      default: 3,
      required: true,
    },
    reminderOffsetMinutes: {
      type: Number,
      default: 30,
      required: true,
    },
    notificationRetentionDays: {
      type: Number,
      default: 90,
      required: true,
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
      required: true,
    },
    passwordMinLength: {
      type: Number,
      default: 8,
      required: true,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      required: true,
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 60,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CompanySettings || 
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);
