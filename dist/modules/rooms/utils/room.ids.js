"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRoomId = makeRoomId;
exports.makeRoomMessageId = makeRoomMessageId;
exports.makeRoomBoostId = makeRoomBoostId;
exports.makeRoomRoleLogId = makeRoomRoleLogId;
exports.makeRoomGiftMessageId = makeRoomGiftMessageId;
exports.makeRoomSystemMessageId = makeRoomSystemMessageId;
exports.makeRoomEntryVideoMessageId = makeRoomEntryVideoMessageId;
exports.makeRoomUserStateKey = makeRoomUserStateKey;
exports.makeRoomUserSocketKey = makeRoomUserSocketKey;
exports.makeRoomRequestId = makeRoomRequestId;
const crypto_1 = require("crypto");
function clean(value) {
    return String(value || "").trim();
}
/*
  Room ID
*/
function makeRoomId() {
    return `room_${(0, crypto_1.randomUUID)()}`;
}
/*
  Live message ID
  يستخدم لرسائل الغرفة اللايف فقط.
  لا يتم حفظها في MongoDB.
*/
function makeRoomMessageId() {
    return `room_msg_${(0, crypto_1.randomUUID)()}`;
}
/*
  Boost ID
*/
function makeRoomBoostId() {
    return `room_boost_${(0, crypto_1.randomUUID)()}`;
}
/*
  Role log ID
*/
function makeRoomRoleLogId() {
    return `room_role_log_${(0, crypto_1.randomUUID)()}`;
}
/*
  Gift message ID
*/
function makeRoomGiftMessageId() {
    return `room_gift_${(0, crypto_1.randomUUID)()}`;
}
/*
  System message ID
*/
function makeRoomSystemMessageId() {
    return `room_system_${(0, crypto_1.randomUUID)()}`;
}
/*
  Entry video message ID
*/
function makeRoomEntryVideoMessageId() {
    return `room_entry_${(0, crypto_1.randomUUID)()}`;
}
/*
  Favorite / user state key
  ليس ID رسمي، فقط مفتاح مساعد لو احتجته.
*/
function makeRoomUserStateKey(roomId, userId) {
    return `${clean(roomId)}_${clean(userId)}`;
}
/*
  ترتيب ثابت للـ chat room users أو active users.
*/
function makeRoomUserSocketKey(roomId, userId) {
    return `${clean(roomId)}:${clean(userId)}`;
}
/*
  يستخدم للـ request_id لو احتجت.
*/
function makeRoomRequestId() {
    return `room_req_${(0, crypto_1.randomUUID)()}`;
}
//# sourceMappingURL=room.ids.js.map