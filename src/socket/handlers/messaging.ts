import { Server } from "socket.io";
import UserModel from "@/src/models/user.model";
import messageModel from "@/src/models/message.model";
import { AuthenticatedSocket, LeanMessage } from "../../type";
import { getConversationId } from "../utils/conversation";

export const setupMessagingHandlers = (
  io: Server,
  socket: AuthenticatedSocket
) => {
  socket.on("sendMessage", async ({ receiverId, content }) => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");
      if (!receiverId || !content) throw new Error("Invalid message data");

      const sender = await UserModel.findById(socket.userId);
      const receiver = await UserModel.findById(receiverId);
      if (!sender || !receiver) throw new Error("Sender or receiver not found");

      if (
        (sender.role === "user" && receiver.role !== "talent") ||
        (sender.role === "talent" && receiver.role !== "user")
      ) {
        throw new Error("Invalid role combination for messaging");
      }

      const conversationId = getConversationId(socket.userId, receiverId);
      const message = await messageModel.create({
        senderId: socket.userId,
        receiverId,
        content,
        conversationId,
      });

      const populatedMessage = await messageModel
        .findById(message._id)
        .populate<{ senderId: { userName: string | null } }>({
          path: "senderId",
          select: "userName",
        })
        .lean<LeanMessage>();
      if (!populatedMessage) throw new Error("Failed to populate message");
      io.to(socket.userId).emit("newMessage", populatedMessage);
      io.to(receiverId).emit("newMessage", populatedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("editMessage", async ({ messageId, content }) => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");
      if (!messageId || !content) throw new Error("Invalid message data");

      const message = await messageModel.findById(messageId);
      if (!message) throw new Error("Message not found");
      if (message.senderId.toString() !== socket.userId)
        throw new Error("Unauthorized to edit this message");

      message.content = content;
      message.updatedAt = new Date();
      await message.save();

      const populatedMessage = await messageModel
        .findById(message._id)
        .populate<{ senderId: { userName: string | null } }>({
          path: "senderId",
          select: "userName",
        })
        .lean<LeanMessage>();
      if (!populatedMessage) throw new Error("Failed to populate message");
      io.to(message.senderId.toString()).emit("messageUpdated", populatedMessage);
      io.to(message.receiverId.toString()).emit("messageUpdated", populatedMessage);
    } catch (error) {
      console.error("Error editing message:", error);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });

  socket.on("deleteMessage", async ({ messageId }) => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");
      if (!messageId) throw new Error("Invalid message ID");

      const message = await messageModel.findById(messageId);
      if (!message) throw new Error("Message not found");
      if (message.senderId.toString() !== socket.userId)
        throw new Error("Unauthorized to delete this message");

      message.deletedAt = new Date();
      message.content = "[This message was deleted]";
      await message.save();

      io.to(message.senderId.toString()).emit("messageDeleted", { messageId });
      io.to(message.receiverId.toString()).emit("messageDeleted", { messageId });
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  socket.on("getMessages", async ({ otherUserId }) => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");
      if (!otherUserId) throw new Error("Other user ID required");

      const conversationId = getConversationId(socket.userId, otherUserId);

      // Update isRead for messages where the current user is the receiver
      await messageModel.updateMany(
        {
          conversationId,
          receiverId: socket.userId,
          isRead: false,
          deletedAt: null, // Only update non-deleted messages
        },
        { $set: { isRead: true } }
      );

      const messages = await messageModel
        .find({ conversationId })
        .populate<{ senderId: { userName: string | null } }>({
          path: "senderId",
          select: "userName",
        })
        .sort({ createdAt: 1 })
        .lean<LeanMessage[]>();

      const messagesWithPlaceholder = messages.map((message) => {
        if (message.deletedAt) {
          return { ...message, content: "[This message was deleted]" };
        }
        return message;
      });

      socket.emit("messages", messagesWithPlaceholder);
    } catch (error) {
      console.error("Error fetching messages:", error);
      socket.emit("error", { message: "Failed to fetch messages" });
    }
  });

  socket.on("getAllMessagesForAdmin", async ({ conversationId }) => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");
      if (!conversationId) throw new Error("Conversation ID required");

      const user = await UserModel.findById(socket.userId);
      if (!user || user.role !== "admin")
        throw new Error("Unauthorized: Admin access required");

      const messages = await messageModel
        .find({ conversationId })
        .populate<{ senderId: { userName: string | null } }>({
          path: "senderId",
          select: "userName",
        })
        .sort({ createdAt: 1 })
        .lean<LeanMessage[]>();

      socket.emit("allMessages", messages);
    } catch (error) {
      console.error("Error fetching all messages for admin:", error);
      socket.emit("error", { message: "Failed to fetch messages for admin" });
    }
  });

  socket.on("getConversationsForAdmin", async () => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");

      const user = await UserModel.findById(socket.userId);
      if (!user || user.role !== "admin")
        throw new Error("Unauthorized: Admin access required");

      const conversations = await messageModel.aggregate([
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
        participants: conv.participants.map(
          (name: string | null) => name || "Unknown User"
        ),
      }));

      socket.emit("conversations", formattedConversations);
    } catch (error) {
      console.error("Error fetching conversations for admin:", error);
      socket.emit("error", {
        message: "Failed to fetch conversations for admin",
      });
    }
  });

  socket.on("getConversations", async () => {
    try {
      if (!socket.userId) throw new Error("User not authenticated");

      const user = await UserModel.findById(socket.userId);
      if (!user || !["user", "talent"].includes(user.role)) {
        throw new Error("Unauthorized: User or talent access required");
      }

      const conversations = await messageModel.aggregate([
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
    } catch (error) {
      console.error("Error fetching conversations:", error);
      socket.emit("error", { message: "Failed to fetch conversations" });
    }
  });
};