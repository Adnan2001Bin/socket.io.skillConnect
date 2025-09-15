"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMessagingHandlers = void 0;
const user_model_1 = __importDefault(require("../../../src/models/user.model"));
const message_model_1 = __importDefault(require("../../../src/models/message.model"));
const conversation_1 = require("../utils/conversation");
const setupMessagingHandlers = (io, socket) => {
    socket.on("sendMessage", async ({ receiverId, content }) => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            if (!receiverId || !content)
                throw new Error("Invalid message data");
            const sender = await user_model_1.default.findById(socket.userId);
            const receiver = await user_model_1.default.findById(receiverId);
            if (!sender || !receiver)
                throw new Error("Sender or receiver not found");
            if ((sender.role === "user" && receiver.role !== "talent") ||
                (sender.role === "talent" && receiver.role !== "user")) {
                throw new Error("Invalid role combination for messaging");
            }
            const conversationId = (0, conversation_1.getConversationId)(socket.userId, receiverId);
            const message = await message_model_1.default.create({
                senderId: socket.userId,
                receiverId,
                content,
                conversationId,
            });
            const populatedMessage = await message_model_1.default
                .findById(message._id)
                .populate({
                path: "senderId",
                select: "userName",
            })
                .lean();
            if (!populatedMessage)
                throw new Error("Failed to populate message");
            io.to(socket.userId).emit("newMessage", populatedMessage);
            io.to(receiverId).emit("newMessage", populatedMessage);
        }
        catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });
    socket.on("editMessage", async ({ messageId, content }) => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            if (!messageId || !content)
                throw new Error("Invalid message data");
            const message = await message_model_1.default.findById(messageId);
            if (!message)
                throw new Error("Message not found");
            if (message.senderId.toString() !== socket.userId)
                throw new Error("Unauthorized to edit this message");
            message.content = content;
            message.updatedAt = new Date();
            await message.save();
            const populatedMessage = await message_model_1.default
                .findById(message._id)
                .populate({
                path: "senderId",
                select: "userName",
            })
                .lean();
            if (!populatedMessage)
                throw new Error("Failed to populate message");
            io.to(message.senderId.toString()).emit("messageUpdated", populatedMessage);
            io.to(message.receiverId.toString()).emit("messageUpdated", populatedMessage);
        }
        catch (error) {
            console.error("Error editing message:", error);
            socket.emit("error", { message: "Failed to edit message" });
        }
    });
    socket.on("deleteMessage", async ({ messageId }) => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            if (!messageId)
                throw new Error("Invalid message ID");
            const message = await message_model_1.default.findById(messageId);
            if (!message)
                throw new Error("Message not found");
            if (message.senderId.toString() !== socket.userId)
                throw new Error("Unauthorized to delete this message");
            message.deletedAt = new Date();
            message.content = "[This message was deleted]";
            await message.save();
            io.to(message.senderId.toString()).emit("messageDeleted", { messageId });
            io.to(message.receiverId.toString()).emit("messageDeleted", { messageId });
        }
        catch (error) {
            console.error("Error deleting message:", error);
            socket.emit("error", { message: "Failed to delete message" });
        }
    });
    socket.on("getMessages", async ({ otherUserId }) => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            if (!otherUserId)
                throw new Error("Other user ID required");
            const conversationId = (0, conversation_1.getConversationId)(socket.userId, otherUserId);
            // Update isRead for messages where the current user is the receiver
            await message_model_1.default.updateMany({
                conversationId,
                receiverId: socket.userId,
                isRead: false,
                deletedAt: null, // Only update non-deleted messages
            }, { $set: { isRead: true } });
            const messages = await message_model_1.default
                .find({ conversationId })
                .populate({
                path: "senderId",
                select: "userName",
            })
                .sort({ createdAt: 1 })
                .lean();
            const messagesWithPlaceholder = messages.map((message) => {
                if (message.deletedAt) {
                    return Object.assign(Object.assign({}, message), { content: "[This message was deleted]" });
                }
                return message;
            });
            socket.emit("messages", messagesWithPlaceholder);
        }
        catch (error) {
            console.error("Error fetching messages:", error);
            socket.emit("error", { message: "Failed to fetch messages" });
        }
    });
    socket.on("getAllMessagesForAdmin", async ({ conversationId }) => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            if (!conversationId)
                throw new Error("Conversation ID required");
            const user = await user_model_1.default.findById(socket.userId);
            if (!user || user.role !== "admin")
                throw new Error("Unauthorized: Admin access required");
            const messages = await message_model_1.default
                .find({ conversationId })
                .populate({
                path: "senderId",
                select: "userName",
            })
                .sort({ createdAt: 1 })
                .lean();
            socket.emit("allMessages", messages);
        }
        catch (error) {
            console.error("Error fetching all messages for admin:", error);
            socket.emit("error", { message: "Failed to fetch messages for admin" });
        }
    });
    socket.on("getConversationsForAdmin", async () => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            const user = await user_model_1.default.findById(socket.userId);
            if (!user || user.role !== "admin")
                throw new Error("Unauthorized: Admin access required");
            const conversations = await message_model_1.default.aggregate([
                {
                    $group: {
                        _id: "$conversationId",
                        senderId: { $first: "$senderId" },
                        receiverId: { $first: "$receiverId" },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "senderId",
                        foreignField: "_id",
                        as: "sender",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "receiverId",
                        foreignField: "_id",
                        as: "receiver",
                    },
                },
                {
                    $project: {
                        conversationId: "$_id",
                        participants: [
                            { $arrayElemAt: ["$sender.userName", 0] },
                            { $arrayElemAt: ["$receiver.userName", 0] },
                        ],
                    },
                },
            ]);
            const formattedConversations = conversations.map((conv) => ({
                conversationId: conv.conversationId,
                participants: conv.participants.map((name) => name || "Unknown User"),
            }));
            socket.emit("conversations", formattedConversations);
        }
        catch (error) {
            console.error("Error fetching conversations for admin:", error);
            socket.emit("error", {
                message: "Failed to fetch conversations for admin",
            });
        }
    });
    socket.on("getConversations", async () => {
        try {
            if (!socket.userId)
                throw new Error("User not authenticated");
            const user = await user_model_1.default.findById(socket.userId);
            if (!user || !["user", "talent"].includes(user.role)) {
                throw new Error("Unauthorized: User or talent access required");
            }
            const conversations = await message_model_1.default.aggregate([
                {
                    $match: {
                        $or: [{ senderId: user._id }, { receiverId: user._id }],
                    },
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: "$conversationId",
                        senderId: { $first: "$senderId" },
                        receiverId: { $first: "$receiverId" },
                        lastMessage: { $first: "$$ROOT" },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$receiverId", user._id] },
                                            { $eq: ["$isRead", false] },
                                            { $eq: ["$deletedAt", null] }, // Exclude deleted messages
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "senderId",
                        foreignField: "_id",
                        as: "sender",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "receiverId",
                        foreignField: "_id",
                        as: "receiver",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "lastMessage.senderId",
                        foreignField: "_id",
                        as: "lastMessageSender",
                    },
                },
                {
                    $project: {
                        conversationId: "$_id",
                        participants: [
                            { $arrayElemAt: ["$sender.userName", 0] },
                            { $arrayElemAt: ["$receiver.userName", 0] },
                        ],
                        lastMessage: {
                            $ifNull: [
                                {
                                    _id: "$lastMessage._id",
                                    senderId: {
                                        _id: "$lastMessage.senderId",
                                        userName: { $arrayElemAt: ["$lastMessageSender.userName", 0] },
                                    },
                                    receiverId: "$lastMessage.receiverId",
                                    content: "$lastMessage.content",
                                    conversationId: "$lastMessage.conversationId",
                                    createdAt: "$lastMessage.createdAt",
                                    isRead: "$lastMessage.isRead",
                                    updatedAt: "$lastMessage.updatedAt",
                                    deletedAt: "$lastMessage.deletedAt",
                                },
                                null,
                            ],
                        },
                        unreadCount: 1,
                    },
                },
                {
                    $sort: { "lastMessage.createdAt": -1 }
                },
            ]);
            socket.emit("conversations", conversations);
        }
        catch (error) {
            console.error("Error fetching conversations:", error);
            socket.emit("error", { message: "Failed to fetch conversations" });
        }
    });
};
exports.setupMessagingHandlers = setupMessagingHandlers;
