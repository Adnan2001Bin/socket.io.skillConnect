import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  talentId: string;
  clientId: string;
  ratePlan: {
    type: string;
    price: number;
    description: string;
    whatsIncluded: string[];
    deliveryDays: number;
    revisions: number;
  };
  projectDetails: {
    title: string;
    description: string;
  };
  status: "pending" | "in-progress" | "accepted" | "rejected" | "delivered" | "cancelled" | "completed";
  paymentStatus: "pending" | "completed" | "failed" | "cancelled";
  revisionStatus: "none" | "requested" | "submitted";
  revisionCount: number;
  deliverables?: {
    files: string[];
    note?: string;
    submittedAt: Date;
  };
  revisionRequest?: {
    files: string[];
    note?: string;
    requestedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  review?: {
    rating: number;
    comment?: string;
    reviewedAt: Date;
  };
}

const OrderSchema: Schema = new Schema(
  {
    talentId: { type: String, required: true },
    clientId: { type: String, required: true },
    ratePlan: {
      type: { type: String, required: true },
      price: { type: Number, required: true },
      description: { type: String, required: true },
      whatsIncluded: [{ type: String }],
      deliveryDays: { type: Number, required: true },
      revisions: { type: Number, required: true, min: 0 },
    },
    projectDetails: {
      title: { type: String, required: true },
      description: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "accepted", "rejected", "delivered", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    revisionStatus: {
      type: String,
      enum: ["none", "requested", "submitted"],
      default: "none",
    },
    revisionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliverables: {
      files: { type: [String], default: [] },
      note: { type: String, maxlength: 1000, default: null },
      submittedAt: { type: Date, default: null },
    },
    revisionRequest: {
      files: { type: [String], default: [] },
      note: { type: String, maxlength: 1000, default: null },
      requestedAt: { type: Date, default: null },
    },
    review: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, maxlength: 1000, default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Prevent model redefinition
const OrderModel = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default OrderModel;