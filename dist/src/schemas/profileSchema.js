"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.talentProfileSchema = exports.userProfileSchema = void 0;
const zod_1 = require("zod");
exports.userProfileSchema = zod_1.z.object({
    profilePicture: zod_1.z.string().url({ message: "Invalid URL for profile picture" }).optional().nullable(),
    bio: zod_1.z.string().max(500, { message: "Bio cannot exceed 500 characters" }).optional().nullable(),
    location: zod_1.z.string().max(100, { message: "Location cannot exceed 100 characters" }).optional().nullable(),
    industry: zod_1.z.string().max(100, { message: "Industry cannot exceed 100 characters" }).optional().nullable(),
    preferences: zod_1.z.array(zod_1.z.string()).optional(),
    languageProficiency: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.talentProfileSchema = zod_1.z.object({
    profilePicture: zod_1.z.string().url({ message: "Invalid URL for profile picture" }).optional().nullable(),
    bio: zod_1.z.string().max(500, { message: "Bio cannot exceed 500 characters" }).optional().nullable(),
    location: zod_1.z.string().max(100, { message: "Location cannot exceed 100 characters" }).optional().nullable(),
    category: zod_1.z.string().min(1, { message: "Category is required" }).optional(),
    services: zod_1.z.array(zod_1.z.string()).optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    portfolio: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1, { message: "Portfolio title is required" }),
        description: zod_1.z.string().min(1, { message: "Portfolio description is required" }),
        imageUrl: zod_1.z.string().url({ message: "Invalid image URL" }).optional().nullable(),
        projectUrl: zod_1.z.string().url({ message: "Invalid project URL" }).optional().nullable(),
    })).optional(),
    ratePlans: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(["Basic", "Standard", "Premium"]),
        price: zod_1.z.number().min(0, { message: "Price must be non-negative" }),
        description: zod_1.z.string().min(1, { message: "Description is required" }),
        whatsIncluded: zod_1.z.array(zod_1.z.string()).min(1, { message: "At least one item must be included" }),
        deliveryDays: zod_1.z.number().min(1, { message: "Delivery days must be at least 1" }),
    })).optional(),
    aboutThisGig: zod_1.z.string().max(1000, { message: "About this Gig cannot exceed 1000 characters" }).optional().nullable(),
    whatIOffer: zod_1.z.array(zod_1.z.string()).optional(),
    socialLinks: zod_1.z.array(zod_1.z.object({
        platform: zod_1.z.string().min(1, { message: "Platform name is required" }),
        url: zod_1.z.string().url({ message: "Invalid URL" }),
    })).optional(),
    languageProficiency: zod_1.z.array(zod_1.z.string()).optional(),
});
