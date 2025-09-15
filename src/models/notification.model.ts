import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId; // Made optional
  projectId?: mongoose.Types.ObjectId; // Added for project-related notifications
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "OrderModel", required: false },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectModel", required: false },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.NotificationModel || mongoose.model<INotification>("NotificationModel", NotificationSchema);