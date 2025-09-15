import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  conversationId: { type: String, required: true }, 
  isRead: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }, // Ensure default is null
}, {
  timestamps: true 
});


messageSchema.virtual("isDeleted").get(function() {
  return this.deletedAt !== null;
});

export default mongoose.models.Message || mongoose.model("Message", messageSchema);