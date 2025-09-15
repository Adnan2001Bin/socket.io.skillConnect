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
const OrderSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
// Prevent model redefinition
const OrderModel = mongoose_1.default.models.Order || mongoose_1.default.model("Order", OrderSchema);
exports.default = OrderModel;
