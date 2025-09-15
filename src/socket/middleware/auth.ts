import UserModel from "@/src/models/user.model";
import { AuthenticatedSocket } from "@/src/type";


export const authMiddleware = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId || typeof userId !== "string") {
      throw new Error("User ID required and must be a string");
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isVerified) {
      throw new Error("User not found or not verified");
    }

    socket.userId = user._id.toString();
    next();
  } catch (error: any) {
    console.error("Authentication error:", error.message, {
      userId: socket.handshake.auth.userId,
    });
    next(new Error(`Authentication error: ${error.message}`));
  }
};