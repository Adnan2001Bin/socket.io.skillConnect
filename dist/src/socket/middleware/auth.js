"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const user_model_1 = __importDefault(require("../../models/user.model"));
const authMiddleware = async (socket, next) => {
    try {
        const userId = socket.handshake.auth.userId;
        if (!userId || typeof userId !== "string") {
            throw new Error("User ID required and must be a string");
        }
        const user = await user_model_1.default.findById(userId);
        if (!user || !user.isVerified) {
            throw new Error("User not found or not verified");
        }
        socket.userId = user._id.toString();
        next();
    }
    catch (error) {
        console.error("Authentication error:", error.message, {
            userId: socket.handshake.auth.userId,
        });
        next(new Error(`Authentication error: ${error.message}`));
    }
};
exports.authMiddleware = authMiddleware;
