import mongoose, { Schema, Document } from "mongoose";

export interface IRatePlan {
  type: "Basic" | "Standard" | "Premium";
  price: number;
  description: string;
  whatsIncluded: string[];
  deliveryDays: number;
}

export interface IPortfolioItem {
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  password: string;
  profilePicture?: string | null;
  bio?: string | null;
  location?: string | null;
  industry?: string | null;
  preferences?: string[];
  role: "user" | "talent" | "admin";
  category?: string;
  services?: string[];
  skills?: string[];
  portfolio?: IPortfolioItem[];
  ratePlans?: IRatePlan[];
  aboutThisGig?: string | null;
  whatIOffer?: string[];
  socialLinks?: { platform: string; url: string }[];
  languageProficiency?: string[];
  verificationCode: string;
  verificationCodeExpires: Date;
  isVerified: boolean;
  isAdminApproved: boolean;
  isEmailVerified: boolean;
  rejectionReason?:string | null
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [2, "Username must be at least 2 characters"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    profilePicture: {
      type: String,
      trim: true,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: null,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
      default: null,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, "Industry cannot exceed 100 characters"],
      default: null,
    },
    preferences: {
      type: [String],
      default: [],
    },
    role: {
      type: String,
      enum: ["user", "talent", "admin"],
      default: "user",
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    isAdminApproved: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    services: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    portfolio: {
      type: [
        {
          title: { type: String, required: true },
          description: { type: String, required: true },
          imageUrl: { type: String, default: null },
          projectUrl: { type: String, default: null },
        },
      ],
      default: [],
    },
    ratePlans: {
      type: [
        {
          type: {
            type: String,
            enum: ["Basic", "Standard", "Premium"],
            required: true,
          },
          price: { type: Number, required: true, min: 0 },
          description: { type: String, required: true },
          whatsIncluded: { type: [String], required: true },
          deliveryDays: { type: Number, required: true, min: 1 },
        },
      ],
      default: [],
    },
    aboutThisGig: {
      type: String,
      trim: true,
      maxlength: [1000, "About this Gig cannot exceed 1000 characters"],
      default: null,
    },
    whatIOffer: {
      type: [String],
      default: [],
    },
    socialLinks: {
      type: [{ platform: String, url: String }],
      default: [],
    },
    languageProficiency: {
      type: [String],
      default: [],
    },
    verificationCode: {
      type: String,
      default: null,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    rejectionReason: { type: String, default: null },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const UserModel =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default UserModel;
