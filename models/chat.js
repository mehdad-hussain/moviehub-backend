import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    messageType: {
      type: String,
      enum: ["direct", "room"],
      default: "direct",
    },
  },
  {
    timestamps: true,
  },
);

// Create an index to optimize queries for chat history between two users
chatMessageSchema.index({ sender: 1, recipient: 1 });
chatMessageSchema.index({ recipient: 1, sender: 1 });
chatMessageSchema.index({ roomId: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
