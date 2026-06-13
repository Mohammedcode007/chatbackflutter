import { randomUUID } from "crypto";

function clean(value: any) {
  return String(value || "").trim();
}

/*
  Room ID
*/
export function makeRoomId() {
  return `room_${randomUUID()}`;
}

/*
  Live message ID
  يستخدم لرسائل الغرفة اللايف فقط.
  لا يتم حفظها في MongoDB.
*/
export function makeRoomMessageId() {
  return `room_msg_${randomUUID()}`;
}

/*
  Boost ID
*/
export function makeRoomBoostId() {
  return `room_boost_${randomUUID()}`;
}

/*
  Role log ID
*/
export function makeRoomRoleLogId() {
  return `room_role_log_${randomUUID()}`;
}

/*
  Gift message ID
*/
export function makeRoomGiftMessageId() {
  return `room_gift_${randomUUID()}`;
}

/*
  System message ID
*/
export function makeRoomSystemMessageId() {
  return `room_system_${randomUUID()}`;
}

/*
  Entry video message ID
*/
export function makeRoomEntryVideoMessageId() {
  return `room_entry_${randomUUID()}`;
}

/*
  Favorite / user state key
  ليس ID رسمي، فقط مفتاح مساعد لو احتجته.
*/
export function makeRoomUserStateKey(roomId: string, userId: string) {
  return `${clean(roomId)}_${clean(userId)}`;
}

/*
  ترتيب ثابت للـ chat room users أو active users.
*/
export function makeRoomUserSocketKey(roomId: string, userId: string) {
  return `${clean(roomId)}:${clean(userId)}`;
}

/*
  يستخدم للـ request_id لو احتجت.
*/
export function makeRoomRequestId() {
  return `room_req_${randomUUID()}`;
}