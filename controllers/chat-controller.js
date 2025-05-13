import mongoose from "mongoose";
import { getOnlineUsers as getOnlineUsersFromSocket } from "../config/socket/chat-namespace.js";
import ChatMessage from "../models/chat.js";
import User from "../models/user.js";

// Get chat history between two users
export async function getChatHistory(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const userExists = await User.findById(userId);

    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const messages = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            {
              sender: mongoose.Types.ObjectId.createFromHexString(req.user._id.toString()),
              recipient: mongoose.Types.ObjectId.createFromHexString(userId),
            },
            {
              sender: mongoose.Types.ObjectId.createFromHexString(userId),
              recipient: mongoose.Types.ObjectId.createFromHexString(req.user._id.toString()),
            },
          ],
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "recipient",
          foreignField: "_id",
          as: "recipientInfo",
        },
      },
      { $unwind: "$senderInfo" },
      { $unwind: "$recipientInfo" },
      {
        $project: {
          _id: 1,
          message: 1,
          messageType: 1,
          createdAt: 1,
          updatedAt: 1,
          roomId: 1,
          sender: {
            _id: "$senderInfo._id",
            name: "$senderInfo.name",
            email: "$senderInfo.email",
          },
          recipient: {
            _id: "$recipientInfo._id",
            name: "$recipientInfo.name",
            email: "$recipientInfo.email",
          },
        },
      },
    ]);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get all users who have chatted with the current user
export async function getChatUsers(req, res) {
  try {
    const currentUserId = mongoose.Types.ObjectId.createFromHexString(req.user._id.toString());

    const chatUsers = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { recipient: currentUserId }],
        },
      },
      {
        $project: {
          otherUser: {
            $cond: {
              if: { $eq: ["$sender", currentUserId] },
              then: "$recipient",
              else: "$sender",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          email: "$userDetails.email",
        },
      },
    ]);

    res.json(chatUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get all online users
export async function getOnlineUsers(req, res) {
  try {
    const onlineUserIds = getOnlineUsersFromSocket();

    if (onlineUserIds.length === 0) {
      return res.json([]);
    }

    // Convert string IDs to ObjectId
    const objectIds = onlineUserIds.map((id) => mongoose.Types.ObjectId.createFromHexString(id));

    // Get user details for online users
    const users = await User.find({
      _id: { $in: objectIds },
    }).select("name email");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
