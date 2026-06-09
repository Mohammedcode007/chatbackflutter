import { Types } from "mongoose";
import { ChatModel } from "../../models/Chat.model";
import { MessageModel } from "../../models/Message.model";

function normalizePair(userA: string, userB: string) {
  return [userA, userB].sort();
}

export async function findOrCreatePrivateChat(userA: string, userB: string) {
  const [first, second] = normalizePair(userA, userB);

  let chat = await ChatModel.findOne({
    members: {
      $all: [first, second],
      $size: 2,
    },
  });

  if (!chat) {
    chat = await ChatModel.create({
      members: [first, second],
    });
  }

  return chat;
}

export async function createPrivateMessage(input: {
  senderId: string;
  receiverId: string;
  body: string;
  type?: "text" | "image" | "audio" | "video" | "file";
}) {
  const senderObjectId = new Types.ObjectId(input.senderId);
  const receiverObjectId = new Types.ObjectId(input.receiverId);

  const chat = await findOrCreatePrivateChat(
    senderObjectId.toString(),
    receiverObjectId.toString()
  );

  const message = await MessageModel.create({
    chat: chat._id,
    sender: senderObjectId,
    receiver: receiverObjectId,
    body: input.body,
    type: input.type || "text",
    deliveredTo: [],
    seenBy: [senderObjectId],
  });

  chat.lastMessage = message._id as any;
  chat.lastMessageText = input.body;
  chat.lastMessageAt = message.createdAt;
  await chat.save();

  return {
    message_id: String(message._id),
    chat_id: String(chat._id),
    sender_id: String(message.sender),
    receiver_id: String(message.receiver),
    body: message.body,
    type: message.type,
    created_at: message.createdAt.toISOString(),
  };
}

export async function getChatMessages(input: {
  chatId: string;
  userId: string;
  page?: number;
  limit?: number;
}) {
  const page = input.page || 1;
  const limit = input.limit || 30;
  const skip = (page - 1) * limit;

  const messages = await MessageModel.find({
    chat: input.chatId,
    deletedFor: {
      $ne: input.userId,
    },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return messages.reverse().map((message) => {
    return {
      message_id: String(message._id),
      chat_id: String(message.chat),
      sender_id: String(message.sender),
      receiver_id: String(message.receiver),
      body: message.body,
      type: message.type,
      created_at: message.createdAt.toISOString(),
    };
  });
}