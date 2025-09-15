"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const emailConfigSchema_1 = require("@/schemas/emailConfigSchema");
let transporter = null;
const createTransporter = async () => {
    if (transporter) {
        try {
            await transporter.verify();
            console.log('Existing transporter verified successfully');
            return transporter;
        }
        catch (error) {
            console.error('Existing transporter verification failed:', error);
            transporter = null;
        }
    }
    try {
        const config = (0, emailConfigSchema_1.getEmailConfig)();
        // Create new transporter
        transporter = nodemailer_1.default.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_PORT === 465,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        });
        // Verify transporter
        await transporter.verify();
        console.log('Transporter verified successfully');
        return transporter;
    }
    catch (error) {
        console.error('Transporter verification failed:', error);
        throw new Error(`Failed to configure email transporter: ${error}`);
    }
};
exports.createTransporter = createTransporter;
