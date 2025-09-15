"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    talentId: zod_1.z.string().min(1, "Talent ID is required"),
    ratePlan: zod_1.z.object({
        type: zod_1.z.string().min(1, "Rate plan type is required"),
        price: zod_1.z.number().min(0, "Price must be non-negative"),
        description: zod_1.z.string().min(1, "Rate plan description is required"),
        whatsIncluded: zod_1.z.array(zod_1.z.string()).optional(),
        deliveryDays: zod_1.z.number().min(1, "Delivery days must be positive"),
    }),
    projectDetails: zod_1.z.object({
        title: zod_1.z.string().min(1, "Project title is required"),
        description: zod_1.z.string().min(1, "Project description is required"),
    }),
});
