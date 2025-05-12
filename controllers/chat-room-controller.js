import mongoose from "mongoose";
import { getChatNamespace } from "../config/socket.js";
import ChatRoom from "../models/chat-room.js";
import ChatMessage from "../models/chat.js";
import User from "../models/user.js";

// Create a new chat room
export async function createChatRoom(req, res) {
  try {
    const { name, description, isPrivate, members = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    if (!members.includes(req.user._id.toString())) {
      members.push(req.user._id.toString());
    }

    const newRoom = await ChatRoom.create({
      name,
      description,
      creator: req.user._id,
      members,
      isPrivate: !!isPrivate,
    });

    const chatNamespace = getChatNamespace();
    members.forEach((memberId) => {
      chatNamespace.to(memberId).emit("room-added", {
        room: {
          _id: newRoom._id,
          name: newRoom.name,
          description: newRoom.description,
          isPrivate: newRoom.isPrivate,
          creator: req.user._id,
        },
        message: `You've been added to ${newRoom.name} by ${req.user.name}`,
      });
    });

    await newRoom.populate("members", "name email");
    await newRoom.populate("creator", "name email");

    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get all chat rooms the user is a member of
export async function getUserChatRooms(req, res) {
  try {
    const rooms = await ChatRoom.find({ members: req.user._id })
      .populate("creator", "name email")
      .populate("members", "name email")
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get a specific chat room by ID
export async function getChatRoomById(req, res) {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room ID format" });
    }

    const room = await ChatRoom.findById(roomId)
      .populate("creator", "name email")
      .populate("members", "name email");

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (!room.members.some((member) => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "You are not a member of this chat room" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Add members to a chat room
export async function addRoomMembers(req, res) {
  try {
    const { roomId } = req.params;
    const { members } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room ID format" });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members array is required" });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (room.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the room creator can add members" });
    }

    // Validate all member IDs
    const validMembers = [];
    for (const memberId of members) {
      if (mongoose.Types.ObjectId.isValid(memberId)) {
        const user = await User.findById(memberId);
        if (user) validMembers.push(memberId);
      }
    }

    const newMembers = validMembers.filter((member) => !room.members.includes(member));

    if (newMembers.length === 0) {
      return res.status(400).json({ message: "No new valid members to add" });
    }

    room.members = [...room.members, ...newMembers];
    await room.save();

    const chatNamespace = getChatNamespace();
    newMembers.forEach((memberId) => {
      chatNamespace.to(memberId).emit("room-added", {
        room: {
          _id: room._id,
          name: room.name,
          description: room.description,
          isPrivate: room.isPrivate,
          creator: room.creator,
        },
        message: `You've been added to ${room.name} by ${req.user.name}`,
      });
    });

    await room.populate("members", "name email");
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Leave a chat room
export async function leaveChatRoom(req, res) {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room ID format" });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    if (!room.members.includes(req.user._id)) {
      return res.status(400).json({ message: "You are not a member of this room" });
    }

    if (room.creator.toString() === req.user._id.toString()) {
      const otherMembers = room.members.filter(
        (member) => member.toString() !== req.user._id.toString(),
      );

      if (otherMembers.length > 0) {
        room.creator = otherMembers[0];
        room.members = room.members.filter(
          (member) => member.toString() !== req.user._id.toString(),
        );
        await room.save();
      } else {
        await ChatRoom.findByIdAndDelete(roomId);
      }
    } else {
      room.members = room.members.filter((member) => member.toString() !== req.user._id.toString());
      await room.save();
    }

    const chatNamespace = getChatNamespace();
    chatNamespace.to(roomId).emit("room-member-left", {
      roomId,
      userId: req.user._id,
      userName: req.user.name,
    });

    res.json({ message: "You have left the chat room" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get room chat history
export async function getRoomChatHistory(req, res) {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room ID format" });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Check if user is a member
    if (!room.members.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not a member of this chat room" });
    }

    const messages = await ChatMessage.find({
      roomId: mongoose.Types.ObjectId.createFromHexString(roomId),
      messageType: "room",
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name email");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
