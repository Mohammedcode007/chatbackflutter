"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreatePrivateChat = findOrCreatePrivateChat;
exports.createPrivateMessage = createPrivateMessage;
exports.getChatMessages = getChatMessages;
const mongoose_1 = require("mongoose");
const Chat_model_1 = require("../../models/Chat.model");
const Message_model_1 = require("../../models/Message.model");
function normalizePair(userA, userB) {
    return [userA, userB].sort();
}
async function findOrCreatePrivateChat(userA, userB) {
    const [first, second] = normalizePair(userA, userB);
    let chat = await Chat_model_1.ChatModel.findOne({
        members: {
            $all: [first, second],
            $size: 2,
        },
    });
    if (!chat) {
        chat = await Chat_model_1.ChatModel.create({
            members: [first, second],
        });
    }
    return chat;
}
async function createPrivateMessage(input) {
    const senderObjectId = new mongoose_1.Types.ObjectId(input.senderId);
    const receiverObjectId = new mongoose_1.Types.ObjectId(input.receiverId);
    const chat = await findOrCreatePrivateChat(senderObjectId.toString(), receiverObjectId.toString());
    const message = await Message_model_1.MessageModel.create({
        chat: chat._id,
        sender: senderObjectId,
        receiver: receiverObjectId,
        body: input.body,
        type: input.type || "text",
        deliveredTo: [],
        seenBy: [senderObjectId],
    });
    chat.lastMessage = message._id;
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
async function getChatMessages(input) {
    const page = input.page || 1;
    const limit = input.limit || 30;
    const skip = (page - 1) * limit;
    const messages = await Message_model_1.MessageModel.find({
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
//# sourceMappingURL=chats.service.js.map