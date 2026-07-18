"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoomRole = getRoomRole;
exports.roleRank = roleRank;
exports.canRoomAction = canRoomAction;
exports.canChangeTargetRole = canChangeTargetRole;
exports.canModerateTarget = canModerateTarget;
exports.setRoomRoleService = setRoomRoleService;
exports.removeRoomRoleService = removeRoomRoleService;
exports.getRoomRoleLogsService = getRoomRoleLogsService;
exports.getRoomRolesSnapshotService = getRoomRolesSnapshotService;
const Room_model_1 = require("../models/Room.model");
const room_ids_1 = require("../utils/room.ids");
const room_sanitize_1 = require("../utils/room.sanitize");
const User_model_1 = require("../../../models/User.model");
/*
  تحديد رتبة المستخدم داخل الغرفة.
  مهم:
  نقرأ الدور من RoomModel المحفوظ، وليس من الذاكرة.
*/
function getRoomRole(room, userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!room || !userId)
        return "none";
    if (String(room.creatorId || "") === userId) {
        return "creator";
    }
    if (Array.isArray(room.owners) && room.owners.includes(userId)) {
        return "owner";
    }
    if (Array.isArray(room.admins) && room.admins.includes(userId)) {
        return "admin";
    }
    if (Array.isArray(room.members) && room.members.includes(userId)) {
        return "member";
    }
    return "none";
}
/*
  ترتيب الرتب.
*/
function roleRank(role) {
    switch (role) {
        case "creator":
            return 4;
        case "owner":
            return 3;
        case "admin":
            return 2;
        case "member":
            return 1;
        case "none":
        default:
            return 0;
    }
}
/*
  هل الدور يسمح بالفعل؟
*/
function canRoomAction(role, action) {
    /*
      creator يستطيع فعل كل شيء.
    */
    if (role === "creator")
        return true;
    /*
      owner:
      كل شيء تقريبًا ما عدا إنشاء creator.
    */
    if (role === "owner") {
        return [
            "set_owner",
            "set_admin",
            "set_member",
            "remove_role",
            "kick_user",
            "ban_user",
            "ban_ip",
            "unban_user",
            "unban_ip",
            "set_password",
            "remove_password",
            "lock_room",
            "unlock_room",
            "set_pinned_message",
            "send_message",
            "send_gift",
            "join_room",
            "boost_room",
            "favorite_room",
        ].includes(action);
    }
    /*
      admin:
      يحظر/يطرد member/none
      ويعطي member فقط
      ولا يتحكم في owner/admin/creator.
    */
    if (role === "admin") {
        return [
            "set_member",
            "remove_role",
            "kick_user",
            "ban_user",
            "send_message",
            "send_gift",
            "join_room",
            "boost_room",
            "favorite_room",
        ].includes(action);
    }
    /*
      member:
      يرسل ويدخل ويعمل هدايا/boost/favorite.
    */
    if (role === "member") {
        return [
            "send_message",
            "send_gift",
            "join_room",
            "boost_room",
            "favorite_room",
        ].includes(action);
    }
    /*
      none:
      ليس له دور محفوظ.
      يستطيع يدخل ويرسل فقط لو الغرفة غير مقفولة.
      هذا الشرط نفسه يتم فحصه في join/message service.
    */
    if (role === "none") {
        return [
            "send_message",
            "join_room",
            "boost_room",
            "favorite_room",
        ].includes(action);
    }
    return false;
}
/*
  هل مسموح للمستخدم أن يغير رتبة الهدف؟
*/
function canChangeTargetRole(input) {
    const { actorRole, targetRole, newRole } = input;
    /*
      لا أحد يغير creator.
    */
    if (targetRole === "creator")
        return false;
    /*
      creator يغير أي شخص لأي رتبة غير creator.
    */
    if (actorRole === "creator")
        return true;
  if (actorRole === "owner") {
  /*
    الأونر يستطيع تعديل أي مستخدم،
    بما في ذلك أونر آخر.

    الـ creator محمي مسبقًا في بداية الدالة.
    كما أن المستخدم لا يستطيع تعديل نفسه
    بسبب فحص actorId === targetUserId في السيرفس.
  */
  return ["owner", "admin", "member", "none"].includes(newRole);
}
    if (actorRole === "admin") {
        if (targetRole === "owner" || targetRole === "admin") {
            return false;
        }
        return ["member", "none"].includes(newRole);
    }
    return false;
}
/*
  هل مسموح للمستخدم أن يطرد أو يحظر الهدف؟
  تستخدم هذه الدالة في سيرفس الطرد والحظر.
*/
function canModerateTarget(input) {
    const { actorRole, targetRole } = input;
    /*
      لا أحد يطرد أو يحظر creator.
    */
    if (targetRole === "creator") {
        return false;
    }
    /*
      creator يستطيع طرد/حظر الجميع ما عدا نفسه.
      فحص actorId === targetUserId يتم في السيرفس.
    */
    if (actorRole === "creator") {
        return true;
    }
    /*
      owner لا يطرد أو يحظر owner أو creator.
      يستطيع التعامل مع admin/member/none.
    */
    if (actorRole === "owner") {
        if (targetRole === "owner") {
            return false;
        }
        return true;
    }
    /*
      admin لا يطرد أو يحظر owner/admin/creator.
      فقط member أو none.
    */
    if (actorRole === "admin") {
        if (targetRole === "owner" ||
            targetRole === "admin") {
            return false;
        }
        return true;
    }
    return false;
}
/*
  تغيير رتبة مستخدم وحفظها في RoomModel.
  هذا يحفظ الدور، لكنه لا يحفظ رسالة الشات.
  رسالة النظام ترسل live من الـ handler.
*/
async function setRoomRoleService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);

    let targetUserId = (0, room_sanitize_1.sanitizeUserId)(
        input.targetUserId
    );

    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);

    const actorUsername = (0, room_sanitize_1.cleanText)(
        input.actorUsername
    );

    let targetUsername = (0, room_sanitize_1.cleanText)(
        input.targetUsername
    );

    const newRole = String(input.newRole || "")
        .trim()
        .toLowerCase();

    /*
      يجب إرسال userId أو username على الأقل.
    */
    if (
        !actorId ||
        !roomId ||
        !newRole ||
        (!targetUserId && !targetUsername)
    ) {
        return {
            ok: false,
            reason: "invalid_role_payload",
        };
    }

    /*
      إذا وصل اسم المستخدم فقط من Flutter،
      نبحث عنه ونستخرج targetUserId.
    */
    if (!targetUserId && targetUsername) {
        const escapedUsername = targetUsername.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const targetUser = await User_model_1.UserModel.findOne({
            username: {
                $regex: `^${escapedUsername}$`,
                $options: "i",
            },
        })
            .select("userId username")
            .lean();

        if (!targetUser) {
            return {
                ok: false,
                reason: "target_user_not_found",
            };
        }

        targetUserId = (0, room_sanitize_1.sanitizeUserId)(
            targetUser.userId
        );

        targetUsername = (0, room_sanitize_1.cleanText)(
            targetUser.username
        );
    }

    /*
      تحقق نهائي بعد البحث.
    */
    if (!targetUserId) {
        return {
            ok: false,
            reason: "target_user_id_required",
        };
    }
    if (actorId === targetUserId) {
        return {
            ok: false,
            reason: "cannot_change_your_own_role",
        };
    }
    if (!["owner", "admin", "member", "none"].includes(newRole)) {
        return {
            ok: false,
            reason: "invalid_new_role",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = getRoomRole(room, actorId);
    const targetRole = getRoomRole(room, targetUserId);
    if (!canChangeTargetRole({
        actorRole,
        targetRole,
        newRole,
    })) {
        return {
            ok: false,
            reason: "no_permission",
            actorRole,
            targetRole,
        };
    }
    /*
      لا تغيّر creator نهائيًا.
    */
    if (room.creatorId === targetUserId) {
        return {
            ok: false,
            reason: "cannot_change_creator",
        };
    }
    /*
      شيل المستخدم من كل القوائم.
    */
    room.owners = room.owners.filter((id) => id !== targetUserId);
    room.admins = room.admins.filter((id) => id !== targetUserId);
    room.members = room.members.filter((id) => id !== targetUserId);
    /*
      أضفه للقائمة الجديدة.
    */
    if (newRole === "owner") {
        room.owners.push(targetUserId);
    }
    if (newRole === "admin") {
        room.admins.push(targetUserId);
    }
    if (newRole === "member") {
        room.members.push(targetUserId);
    }
    /*
      none = لا تضيفه لأي قائمة.
    */
    room.roleLogs.push({
        logId: (0, room_ids_1.makeRoomRoleLogId)(),
        action: newRole === "none" ? "role_removed" : "role_set",
        actorId,
        actorUsername,
        targetUserId,
        targetUsername,
        oldRole: targetRole,
        newRole,
        createdAt: new Date(),
    });
    await room.save();
    return {
        ok: true,
        room,
        actorRole,
        targetRole,
        oldRole: targetRole,
        newRole,
    };
}
/*
  حذف كل أدوار المستخدم وجعله none.
*/
async function removeRoomRoleService(input) {
    return setRoomRoleService({
        actorId: input.actorId,
        actorUsername: input.actorUsername,
        targetUserId: input.targetUserId,
        targetUsername: input.targetUsername,
        roomId: input.roomId,
        newRole: "none",
    });
}
/*
  جلب role logs.
  هذا لا يرجع رسائل الغرفة، فقط سجل إداري لتغييرات الأدوار.
*/
async function getRoomRoleLogsService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const limit = Math.min(Math.max(Number(input.limit || 50), 1), 100);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_role_logs_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = getRoomRole(room, actorId);
    /*
      logs يشوفها creator/owner فقط.
    */
    if (actorRole !== "creator" && actorRole !== "owner") {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    const logs = Array.isArray(room.roleLogs)
        ? [...room.roleLogs]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit)
        : [];
    return {
        ok: true,
        roomId,
        logs,
    };
}
/*
  إرجاع قائمة المستخدمين حسب الأدوار.
*/
async function getRoomRolesSnapshotService(input) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!roomId) {
        return {
            ok: false,
            reason: "invalid_room_id",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId })
        .select("roomId creatorId owners admins members")
        .lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    return {
        ok: true,
        roomId,
        creatorId: String(room.creatorId || ""),
        owners: Array.isArray(room.owners) ? room.owners : [],
        admins: Array.isArray(room.admins) ? room.admins : [],
        members: Array.isArray(room.members) ? room.members : [],
    };
}
//# sourceMappingURL=room-role.service.js.map