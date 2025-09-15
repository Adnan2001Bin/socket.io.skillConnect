"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProposalSchema = new mongoose_1.Schema({
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
exports.default = mongoose_1.default.models.ProposalModel || mongoose_1.default.model("ProposalModel", ProposalSchema);
