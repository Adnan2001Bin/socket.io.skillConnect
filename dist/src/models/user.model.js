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
const UserSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
const UserModel = mongoose_1.default.models.User ||
    mongoose_1.default.model("User", UserSchema);
exports.default = UserModel;
