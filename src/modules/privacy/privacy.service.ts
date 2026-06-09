import { UserModel } from "../../models/User.model";
import { FriendshipModel } from "../../models/Friendship.model";

function pairUsers(userA: string, userB: string) {
  return [userA, userB].sort();
}

export async function areFriends(userA: string, userB: string) {
  const [first, second] = pairUsers(userA, userB);

  const friendship = await FriendshipModel.findOne({
    userA: first,
    userB: second,
  }).lean();

  return Boolean(friendship);
}

export async function canSendPrivateMessage(input: {
  senderId: string;
  receiverId: string;
}) {
  const { senderId, receiverId } = input;

  if (senderId === receiverId) {
    return {
      ok: false as const,
      reason: "cannot_send_to_self",
    };
  }

  const [sender, receiver] = await Promise.all([
    UserModel.findOne({ userId: senderId }).lean(),
    UserModel.findOne({ userId: receiverId }).lean(),
  ]);

  if (!sender) {
    return {
      ok: false as const,
      reason: "sender_not_found",
    };
  }

  if (!receiver) {
    return {
      ok: false as const,
      reason: "receiver_not_found",
    };
  }

  if (sender.blockedUsers?.includes(receiverId)) {
    return {
      ok: false as const,
      reason: "you_blocked_this_user",
    };
  }

  if (receiver.blockedUsers?.includes(senderId)) {
    return {
      ok: false as const,
      reason: "you_are_blocked",
    };
  }

  if (receiver.privacy?.dmPrivacy === "closed") {
    return {
      ok: false as const,
      reason: "private_messages_closed",
    };
  }

  if (receiver.privacy?.dmPrivacy === "friends_only") {
    const friends = await areFriends(senderId, receiverId);

    if (!friends) {
      return {
        ok: false as const,
        reason: "private_messages_friends_only",
      };
    }
  }

  return {
    ok: true as const,
    receiver,
  };
}

export async function canSendFriendRequest(input: {
  fromUserId: string;
  toUserId: string;
}) {
  const { fromUserId, toUserId } = input;

  if (fromUserId === toUserId) {
    return {
      ok: false as const,
      reason: "cannot_add_self",
    };
  }

  const [fromUser, toUser] = await Promise.all([
    UserModel.findOne({ userId: fromUserId }).lean(),
    UserModel.findOne({ userId: toUserId }).lean(),
  ]);

  if (!fromUser) {
    return {
      ok: false as const,
      reason: "sender_not_found",
    };
  }

  if (!toUser) {
    return {
      ok: false as const,
      reason: "target_user_not_found",
    };
  }

  if (fromUser.blockedUsers?.includes(toUserId)) {
    return {
      ok: false as const,
      reason: "you_blocked_this_user",
    };
  }

  if (toUser.blockedUsers?.includes(fromUserId)) {
    return {
      ok: false as const,
      reason: "you_are_blocked",
    };
  }

  if (toUser.privacy?.friendRequestPrivacy === "closed") {
    return {
      ok: false as const,
      reason: "friend_requests_closed",
    };
  }

  const friends = await areFriends(fromUserId, toUserId);

  if (friends) {
    return {
      ok: false as const,
      reason: "already_friends",
    };
  }

  return {
    ok: true as const,
    toUser,
  };
}