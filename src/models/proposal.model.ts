import mongoose, { Schema, Document } from "mongoose";

export interface IProposal extends Document {
  _id: string;
  projectId: string;
  talentId: string;
  bid: number;
  coverLetter: string;
  files?: string[];
  proposalStatus: "pending" | "accepted" | "rejected" | "delivered" | "revision-requested";
  deliverables?: {
    files: string[];
    note: string | null;
    submittedAt: Date;
  };
  revisionCount: number;
  revisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalSchema: Schema = new Schema({
  projectId: { type: String, required: true },
  talentId: { type: String, required: true },
  bid: { type: Number, required: true, min: 10 },
  coverLetter: { type: String, required: true, minlength: 10, maxlength: 1000 },
  files: { type: [String], default: [] },
  proposalStatus: {
    type: String,
    enum: ["pending", "accepted", "rejected", "delivered", "revision-requested"],
    default: "pending",
  },
  deliverables: {
    files: { type: [String], default: [] },
    note: { type: String, maxlength: 1000, default: null },
    submittedAt: { type: Date },
  },
  revisionCount: { type: Number, default: 0 },
  revisionNote: { type: String, maxlength: 1000, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save
ProposalSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProposalModel || mongoose.model<IProposal>("ProposalModel", ProposalSchema);