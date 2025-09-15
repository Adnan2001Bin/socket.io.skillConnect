"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailConfig = void 0;
const zod_1 = require("zod");
const emailConfigSchema = zod_1.z.object({
    SMTP_HOST: zod_1.z.string().min(1, 'SMTP_HOST is required'),
    SMTP_PORT: zod_1.z.number().int().min(1, 'SMTP_PORT must be a valid port number'),
    SMTP_USER: zod_1.z.string().min(1, 'SMTP_USER is required'),
    SMTP_PASS: zod_1.z.string().min(1, 'SMTP_PASS is required'),
    SENDER_EMAIL: zod_1.z.string().email('SENDER_EMAIL must be a valid email address'),
});
const getEmailConfig = () => {
    const config = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SENDER_EMAIL: process.env.SENDER_EMAIL,
    };
    try {
        return emailConfigSchema.parse(config);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errorMessage = error.errors
                .map((err) => `${err.path}: ${err.message}`)
                .join(', ');
            throw new Error(`Email configuration error: ${errorMessage}`);
        }
        throw new Error('Unknown error validating email configuration');
    }
};
exports.getEmailConfig = getEmailConfig;
