"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = void 0;
const zod_1 = require("zod");
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Invalid email address" }).optional(),
    password: zod_1.z.string().min(6, { message: "Password must be at least 6 characters" }).optional(),
    token: zod_1.z.string().nullable().optional(), // Allow string, null, or undefined
    action: zod_1.z.enum(["request", "reset"]),
});
