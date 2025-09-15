"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCodeSchema = void 0;
const zod_1 = require("zod");
exports.verifyCodeSchema = zod_1.z.object({
    verificationCode: zod_1.z
        .string()
        .length(6, { message: "Verification code must be 6 digits" })
        .regex(/^\d+$/, { message: "Verification code must be numeric" }),
});
