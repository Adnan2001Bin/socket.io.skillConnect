"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpSchema = void 0;
const zod_1 = require("zod");
exports.signUpSchema = zod_1.z.object({
    userName: zod_1.z
        .string()
        .min(2, { message: "Username must be at least 2 characters" })
        .max(50, { message: "Username cannot exceed 50 characters" })
        .trim(),
    email: zod_1.z
        .string()
        .email({ message: "Invalid email address" })
        .trim(),
    password: zod_1.z
        .string()
        .min(6, { message: "Password must be at least 6 characters" }),
    role: zod_1.z.enum(["user", "talent"], { message: "Invalid role selected" }), // Admin excluded for security
});
