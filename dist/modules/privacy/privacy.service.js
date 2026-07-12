"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areFriends = areFriends;
exports.canSendPrivateMessage = canSendPrivateMessage;
exports.canSendFriendRequest = canSendFriendRequest;
const User_model_1 = require("../../models/User.model");
const Friendship_model_1 = require("../../models/Friendship.model");
function pairUsers(userA, userB) {
    return [userA, userB].sort();
}
async function areFriends(userA, userB) {
    const [first, second] = pairUsers(userA, userB);
    const friendship = await Friendship_model_1.FriendshipModel.findOne({
        userA: first,
        userB: second,
    }).lean();
    return Boolean(friendship);
}
async function canSendPrivateMessage(input) {
    const { senderId, receiverId } = input;
    if (senderId === receiverId) {
        return {
            ok: false,
            reason: "cannot_send_to_self",
        };
    }
    const [sender, receiver] = await Promise.all([
        User_model_1.UserModel.findOne({ userId: senderId }).lean(),
        User_model_1.UserModel.findOne({ userId: receiverId }).lean(),
    ]);
    if (!sender) {
        return {
            ok: false,
            reason: "sender_not_found",
        };
    }
    if (!receiver) {
        return {
            ok: false,
            reason: "receiver_not_found",
        };
    }
    if (sender.blockedUsers?.includes(receiverId)) {
        return {
            ok: false,
            reason: "you_blocked_this_user",
        };
    }
    if (receiver.blockedUsers?.includes(senderId)) {
        return {
            ok: false,
            reason: "you_are_blocked",
        };
    }
    if (receiver.privacy?.dmPrivacy === "closed") {
        return {
            ok: false,
            reason: "private_messages_closed",
        };
    }
    if (receiver.privacy?.dmPrivacy === "friends_only") {
        const friends = await areFriends(senderId, receiverId);
        if (!friends) {
            return {
                ok: false,
                reason: "private_messages_friends_only",
            };
        }
    }
    return {
        ok: true,
        receiver,
    };
}
async function canSendFriendRequest(input) {
    const { fromUserId, toUserId } = input;
    if (fromUserId === toUserId) {
        return {
            ok: false,
            reason: "cannot_add_self",
        };
    }
    const [fromUser, toUser] = await Promise.all([
        User_model_1.UserModel.findOne({ userId: fromUserId }).lean(),
        User_model_1.UserModel.findOne({ userId: toUserId }).lean(),
    ]);
    if (!fromUser) {
        return {
            ok: false,
            reason: "sender_not_found",
        };
    }
    if (!toUser) {
        return {
            ok: false,
            reason: "target_user_not_found",
        };
    }
    if (fromUser.blockedUsers?.includes(toUserId)) {
        return {
            ok: false,
            reason: "you_blocked_this_user",
        };
    }
    if (toUser.blockedUsers?.includes(fromUserId)) {
        return {
            ok: false,
            reason: "you_are_blocked",
        };
    }
    if (toUser.privacy?.friendRequestPrivacy === "closed") {
        return {
            ok: false,
            reason: "friend_requests_closed",
        };
    }
    const friends = await areFriends(fromUserId, toUserId);
    if (friends) {
        return {
            ok: false,
            reason: "already_friends",
        };
    }
    return {
        ok: true,
        toUser,
    };
}
//# sourceMappingURL=privacy.service.js.map