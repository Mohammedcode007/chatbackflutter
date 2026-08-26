"use strict";
// import { randomUUID } from "crypto";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfileService = updateUserProfileService;
exports.updateUserProfileImageService = updateUserProfileImageService;
exports.deleteMyAccountService = deleteMyAccountService;
exports.getFullUserProfileService = getFullUserProfileService;
exports.searchUsersService = searchUsersService;
exports.sendFriendRequestService = sendFriendRequestService;
exports.getIncomingFriendRequestsService = getIncomingFriendRequestsService;
exports.getFriendsService = getFriendsService;
exports.removeFriendService = removeFriendService;
exports.getBlockedUsersService = getBlockedUsersService;
exports.unblockUserService = unblockUserService;
exports.respondFriendRequestService = respondFriendRequestService;
// import { UserModel } from "../../models/User.model";
// import { ProfileViewModel } from "../../models/ProfileView.model";
// import { FriendRequestModel } from "../../models/FriendRequest.model";
// import {
//   deleteCloudinaryFile,
//   uploadBase64ToCloudinary,
// } from "../media/cloudinary.service";
// function sanitizeUser(user: any) {
//   const obj = user.toObject ? user.toObject() : user;
//   const { password, __v, ...safeUser } = obj;
//   return {
//     ...safeUser,
//     _id: String(obj._id),
//     mongoId: String(obj._id),
//   };
// }
// function isValidEmail(email: string) {
//   if (!email) return true;
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// }
// function todayKey() {
//   return new Date().toISOString().slice(0, 10);
// }
// function calculateAge(birthdate?: string | null) {
//   if (!birthdate) return null;
//   const date = new Date(birthdate);
//   if (Number.isNaN(date.getTime())) return null;
//   const now = new Date();
//   let age = now.getFullYear() - date.getFullYear();
//   const monthDiff = now.getMonth() - date.getMonth();
//   const dayDiff = now.getDate() - date.getDate();
//   if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
//     age--;
//   }
//   if (age < 0 || age > 120) return null;
//   return age;
// }
// function publicUserCard(user: any) {
//   const obj = user.toObject ? user.toObject() : user;
//   const hideActivityStatus =
//     obj.hideActivityStatus === true;
//   const isManualOffline =
//     obj.isManualOffline === true;
//   const isHidden =
//     hideActivityStatus || isManualOffline;
//   return {
//     userId: obj.userId,
//     username: obj.username,
//     photoUrl: obj.photoUrl || "",
//     coverUrl: obj.coverUrl || "",
//     accountColor:
//       obj.accountColor || "#2BCB00",
//     badgeKey: obj.badgeKey || "",
//     badgeName: obj.badgeName || "",
//     badgeValue: obj.badgeValue || "",
//     badges: Array.isArray(obj.inventory)
//       ? obj.inventory
//           .filter((item: any) => {
//             return (
//               item.type === "badge" &&
//               item.isActive === true
//             );
//           })
//           .map((item: any) => ({
//             itemId: item.itemId || "",
//             key: item.key || "",
//             name: item.name || "",
//             value: item.value || "",
//           }))
//       : obj.badgeValue
//       ? [
//           {
//             itemId: "",
//             key: obj.badgeKey || "",
//             name: obj.badgeName || "",
//             value: obj.badgeValue || "",
//           },
//         ]
//       : [],
//     verificationType:
//       obj.verificationType || "none",
//     /*
//       رتبة المستخدم العامة.
//     */
//     platformRole:
//       obj.platformRole || "user",
//     /*
//       نوع حساب المستخدم.
//     */
//     accountType:
//       obj.accountType || "none",
//     /*
//       تأثير دخول الغرفة.
//     */
//     roomEntryMediaUrl:
//       obj.roomEntryMediaUrl || "",
//     roomEntryEnabled:
//       obj.roomEntryEnabled === true,
//     /*
//       تأثير فتح صفحة البروفايل.
//     */
//     profileEntryMediaUrl:
//       obj.profileEntryMediaUrl || "",
//     profileEntryEnabled:
//       obj.profileEntryEnabled === true,
//     /*
//       رسالة دخول الغرفة.
//     */
//     roomWelcomeMessage:
//       obj.roomWelcomeMessage || "",
//     statusMessage:
//       obj.statusMessage || "",
//     current:
//       isHidden
//         ? "0"
//         : obj.current || "",
//     hideActivityStatus,
//     isManualOffline,
//     isOnline: isHidden
//       ? false
//       : obj.current === "1" ||
//         obj.current === "online",
//     country: obj.country || "",
//     gender: obj.gender || "",
//     birthdate: obj.birthdate || "",
//     age: calculateAge(obj.birthdate),
//     points: obj.points || 0,
//     privacy: {
//       dmPrivacy:
//         obj.privacy?.dmPrivacy || "open",
//       friendRequestPrivacy:
//         obj.privacy?.friendRequestPrivacy ||
//         "open",
//       allowCalls:
//         obj.privacy?.allowCalls || "all",
//     },
//     stats: {
//       friendsCount:
//         obj.stats?.friendsCount || 0,
//       profileViewsCount:
//         obj.stats?.profileViewsCount || 0,
//       giftsSentCount:
//         obj.stats?.giftsSentCount || 0,
//       giftsReceivedCount:
//         obj.stats?.giftsReceivedCount || 0,
//     },
//     createdAt: obj.createdAt,
//     updatedAt: obj.updatedAt,
//   };
// }
// function ensureUserStats(user: any) {
//   if (!user.stats) {
//     user.stats = {
//       friendsCount: 0,
//       profileViewsCount: 0,
//       giftsSentCount: 0,
//       giftsReceivedCount: 0,
//     };
//   }
//   if (typeof user.stats.friendsCount !== "number") {
//     user.stats.friendsCount = Array.isArray(user.friends)
//       ? user.friends.length
//       : 0;
//   }
//   if (typeof user.stats.profileViewsCount !== "number") {
//     user.stats.profileViewsCount = 0;
//   }
//   if (typeof user.stats.giftsSentCount !== "number") {
//     user.stats.giftsSentCount = 0;
//   }
//   if (typeof user.stats.giftsReceivedCount !== "number") {
//     user.stats.giftsReceivedCount = 0;
//   }
//   if (!Array.isArray(user.friends)) {
//     user.friends = [];
//   }
// }
// /*
//   Update profile
// */
// export async function updateUserProfileService(input: {
//   userId: string;
//   payload: any;
// }) {
//   const { userId, payload } = input;
//   const update: Record<string, any> = {};
//   /*
//     status message
//   */
//   if (payload.status_message !== undefined) {
//     update.statusMessage = String(payload.status_message || "").trim();
//     update.current = String(payload.status_message || "").trim();
//   }
//   if (payload.statusMessage !== undefined) {
//     update.statusMessage = String(payload.statusMessage || "").trim();
//     update.current = String(payload.statusMessage || "").trim();
//   }
//   /*
//     private lock
//   */
//   if (typeof payload.private_lock === "boolean") {
//     update.privateLock = payload.private_lock;
//   }
//   if (typeof payload.privateLock === "boolean") {
//     update.privateLock = payload.privateLock;
//   }
//   /*
//     private message / dm privacy
//     allowed: open, friends_only, closed
//   */
//   if (payload.private_message !== undefined) {
//     const value = String(payload.private_message || "").trim();
//     if (!["open", "friends_only", "closed"].includes(value)) {
//       return {
//         ok: false as const,
//         reason: "invalid_private_message_value",
//       };
//     }
//     update["privacy.dmPrivacy"] = value;
//   }
//   if (payload.dm_privacy !== undefined) {
//     const value = String(payload.dm_privacy || "").trim();
//     if (!["open", "friends_only", "closed"].includes(value)) {
//       return {
//         ok: false as const,
//         reason: "invalid_dm_privacy",
//       };
//     }
//     update["privacy.dmPrivacy"] = value;
//   }
//   /*
//     allow calls
//     allowed: all, friends_only, none
//   */
//   if (payload.allow_calls !== undefined) {
//     const value = String(payload.allow_calls || "").trim();
//     if (!["all", "friends_only", "none"].includes(value)) {
//       return {
//         ok: false as const,
//         reason: "invalid_allow_calls",
//       };
//     }
//     update["privacy.allowCalls"] = value;
//   }
//   /*
//     auto join stream
//   */
//   if (typeof payload.auto_join_stream === "boolean") {
//     update.autoJoinStream = payload.auto_join_stream;
//   }
//   if (typeof payload.autoJoinStream === "boolean") {
//     update.autoJoinStream = payload.autoJoinStream;
//   }
//   /*
//     hide activity status
//   */
//   if (typeof payload.hide_activity_status === "boolean") {
//     update.hideActivityStatus = payload.hide_activity_status;
//     update.isManualOffline = payload.hide_activity_status;
//   }
//   if (typeof payload.hideActivityStatus === "boolean") {
//     update.hideActivityStatus = payload.hideActivityStatus;
//     update.isManualOffline = payload.hideActivityStatus;
//   }
//   /*
//     email
//   */
//   if (payload.email !== undefined) {
//     const email = String(payload.email || "").trim().toLowerCase();
//     if (!isValidEmail(email)) {
//       return {
//         ok: false as const,
//         reason: "invalid_email",
//       };
//     }
//     update.email = email;
//   }
//   /*
//     birth day
//   */
//   if (payload.birth_day !== undefined) {
//     update.birthdate = String(payload.birth_day || "").trim();
//   }
//   if (payload.birthdate !== undefined) {
//     update.birthdate = String(payload.birthdate || "").trim();
//   }
//   /*
//     country
//   */
//   if (payload.country !== undefined) {
//     update.country = String(payload.country || "").trim();
//   }
//   /*
//     gender
//     allowed: male, female, other, empty
//   */
//   if (payload.gender !== undefined) {
//     const gender = String(payload.gender || "").trim();
//     if (!["male", "female", "other", ""].includes(gender)) {
//       return {
//         ok: false as const,
//         reason: "invalid_gender",
//       };
//     }
//     update.gender = gender;
//   }
//   /*
//     change password
//     لا يحتاج القديم
//   */
//   if (payload.new_password !== undefined) {
//     const newPassword = String(payload.new_password || "").trim();
//     if (newPassword.length < 6) {
//       return {
//         ok: false as const,
//         reason: "password_too_short",
//       };
//     }
//     update.password = newPassword;
//   }
//   if (payload.password !== undefined) {
//     const newPassword = String(payload.password || "").trim();
//     if (newPassword.length < 6) {
//       return {
//         ok: false as const,
//         reason: "password_too_short",
//       };
//     }
//     update.password = newPassword;
//   }
//   if (Object.keys(update).length === 0) {
//     return {
//       ok: false as const,
//       reason: "no_valid_fields",
//     };
//   }
//   const user = await UserModel.findOneAndUpdate(
//     { userId },
//     {
//       $set: update,
//     },
//     {
//       new: true,
//       runValidators: true,
//     }
//   );
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   ensureUserStats(user);
// return {
//   ok: true as const,
//   user: sanitizeUser(user),
//   publicUser: publicUserCard(user),
//   changedFields: Object.keys(update),
// };
// }
// /*
//   Update avatar / cover
// */
// export async function updateUserProfileImageService(input: {
//   userId: string;
//   imageType: "avatar" | "cover";
//   base64: string;
// }) {
//   const { userId, imageType, base64 } = input;
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   const oldUrl = imageType === "avatar" ? user.photoUrl : user.coverUrl;
//   const oldPublicId =
//     imageType === "avatar"
//       ? (user as any).photoPublicId
//       : (user as any).coverPublicId;
//   const upload = await uploadBase64ToCloudinary({
//     base64,
//     userId,
//     kind: imageType === "avatar" ? "profile_avatar" : "profile_cover",
//   });
//   if (!upload.ok) {
//     return upload;
//   }
//   /*
//     حذف القديم بعد نجاح رفع الجديد
//   */
//   if (oldUrl || oldPublicId) {
//     await deleteCloudinaryFile({
//       url: oldUrl,
//       publicId: oldPublicId,
//       resourceType: "image",
//     });
//   }
//   if (imageType === "avatar") {
//     user.photoUrl = upload.url;
//     (user as any).photoPublicId = upload.publicId;
//   } else {
//     user.coverUrl = upload.url;
//     (user as any).coverPublicId = upload.publicId;
//   }
//   ensureUserStats(user);
//   await user.save();
//   return {
//     ok: true as const,
//     user: sanitizeUser(user),
//     imageType,
//     url: upload.url,
//     publicId: upload.publicId,
//   };
// }
// /*
//   Delete account
// */
// export async function deleteMyAccountService(input: {
//   userId: string;
// }) {
//   const { userId } = input;
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   /*
//     حذف صور المستخدم من Cloudinary
//   */
//   await deleteCloudinaryFile({
//     url: user.photoUrl,
//     publicId: (user as any).photoPublicId,
//     resourceType: "image",
//   });
//   await deleteCloudinaryFile({
//     url: user.coverUrl,
//     publicId: (user as any).coverPublicId,
//     resourceType: "image",
//   });
//   /*
//     حذف علاقات الصداقة من الآخرين
//   */
//   await UserModel.updateMany(
//     {
//       friends: userId,
//     },
//     {
//       $pull: {
//         friends: userId,
//       },
//     }
//   );
//   /*
//     تحديث friendsCount للناس الذين كان عندهم هذا المستخدم
//     بسيط: هنحدثهم بعد الحذف بطريقة عامة
//   */
//   const affectedUsers = await UserModel.find({});
//   for (const affected of affectedUsers) {
//     ensureUserStats(affected);
//     affected.stats.friendsCount = affected.friends.length;
//     await affected.save();
//   }
//   /*
//     حذف طلبات الصداقة الخاصة به
//   */
//   await FriendRequestModel.deleteMany({
//     $or: [
//       {
//         fromUserId: userId,
//       },
//       {
//         toUserId: userId,
//       },
//     ],
//   });
//   /*
//     حذف زيارات البروفايل الخاصة به
//   */
//   await ProfileViewModel.deleteMany({
//     $or: [
//       {
//         targetUserId: userId,
//       },
//       {
//         viewerUserId: userId,
//       },
//     ],
//   });
//   /*
//     حذف الحساب نفسه
//   */
//   await UserModel.deleteOne({ userId });
//   return {
//     ok: true as const,
//   };
// }
// /*
//   Get full user profile
//   - يرجع اللون / البادج / التوثيق / الإحصائيات / العمر
//   - يحسب زيارة واحدة يوميًا من كل حساب
// */
// export async function getFullUserProfileService(input: {
//   viewerUserId: string;
//   targetUserId: string;
// }) {
//   const { viewerUserId, targetUserId } = input;
//   const target = await UserModel.findOne({ userId: targetUserId });
//   if (!target) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   ensureUserStats(target);
//   const viewer = await UserModel.findOne({ userId: viewerUserId });
//   if (viewer) {
//     ensureUserStats(viewer);
//   }
//   const isSelf = viewerUserId === targetUserId;
//   let viewAdded = false;
//   /*
//     لا نحسب زيارة المستخدم لنفسه
//   */
//   if (!isSelf) {
//     try {
//       await ProfileViewModel.create({
//         targetUserId,
//         viewerUserId,
//         viewedDay: todayKey(),
//       });
//       target.stats.profileViewsCount += 1;
//       await target.save();
//       viewAdded = true;
//     } catch (error: any) {
//       /*
//         11000 معناها نفس الشخص زار نفس البروفايل في نفس اليوم
//         لا نكرر العد
//       */
//       if (error?.code !== 11000) {
//         console.log("[PROFILE VIEW ERROR]", error?.message);
//       }
//     }
//   } else {
//     await target.save();
//   }
//   const isFriend =
//     !!viewer && Array.isArray(viewer.friends)
//       ? viewer.friends.includes(targetUserId)
//       : false;
//   const blockedByMe =
//     !!viewer && Array.isArray((viewer as any).blockedUsers)
//       ? (viewer as any).blockedUsers.includes(targetUserId)
//       : false;
//   const hasBlockedMe =
//     Array.isArray((target as any).blockedUsers)
//       ? (target as any).blockedUsers.includes(viewerUserId)
//       : false;
//   const isBlocked = blockedByMe || hasBlockedMe;
//   const pendingRequest = await FriendRequestModel.findOne({
//     status: "pending",
//     $or: [
//       {
//         fromUserId: viewerUserId,
//         toUserId: targetUserId,
//       },
//       {
//         fromUserId: targetUserId,
//         toUserId: viewerUserId,
//       },
//     ],
//   }).lean();
//   return {
//     ok: true as const,
//     profile: {
//       ...publicUserCard(target),
//       isSelf,
//       isFriend,
//       isBlocked,
//       blockedByMe,
//       hasBlockedMe,
//       hasPendingFriendRequest: !!pendingRequest,
//       pendingFriendRequest: pendingRequest
//         ? {
//           requestId: pendingRequest.requestId,
//           fromUserId: pendingRequest.fromUserId,
//           toUserId: pendingRequest.toUserId,
//           status: pendingRequest.status,
//           createdAt: pendingRequest.createdAt,
//         }
//         : null,
//       viewAdded,
//     },
//   };
// }
// /*
//   Search users
//   يرجع صورة / اسم / لون / بادج / توثيق
// */
// export async function searchUsersService(input: {
//   viewerUserId: string;
//   query: string;
//   limit?: number;
// }) {
//   const { viewerUserId, query } = input;
//   const q = String(query || "").trim().toLowerCase();
//   if (!q) {
//     return {
//       ok: true as const,
//       users: [],
//     };
//   }
//   const viewer = await UserModel.findOne({ userId: viewerUserId }).lean();
//   if (!viewer) {
//     return {
//       ok: false as const,
//       reason: "viewer_not_found",
//     };
//   }
//   const limit = Math.min(Math.max(input.limit || 20, 1), 50);
//   const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//   const users = await UserModel.find({
//     userId: {
//       $ne: viewerUserId,
//     },
//     username: {
//       $regex: safeRegex,
//       $options: "i",
//     },
//   })
//     .limit(limit)
//   .select(
//   [
//     "userId",
//     "username",
//     "photoUrl",
//     "coverUrl",
//     "accountColor",
//     "badgeKey",
//     "badgeName",
//     "badgeValue",
//     "verificationType",
//     "statusMessage",
//     "current",
//     "hideActivityStatus",
//     "isManualOffline",
//     "country",
//     "gender",
//     "birthdate",
//     "stats",
//     "blockedUsers",
//     "friends",
//     "privacy",
//     "createdAt",
//     "updatedAt",
//   ].join(" ")
// )
//     .lean();
//   const targetIds = users.map((u: any) => u.userId);
//   const viewerFriends = new Set(
//     Array.isArray((viewer as any).friends) ? (viewer as any).friends : []
//   );
//   const viewerBlockedUsers = new Set(
//     Array.isArray((viewer as any).blockedUsers)
//       ? (viewer as any).blockedUsers
//       : []
//   );
//   const pendingRequests = await FriendRequestModel.find({
//     status: "pending",
//     $or: [
//       {
//         fromUserId: viewerUserId,
//         toUserId: { $in: targetIds },
//       },
//       {
//         toUserId: viewerUserId,
//         fromUserId: { $in: targetIds },
//       },
//     ],
//   }).lean();
//   const pendingUserIds = new Set<string>();
//   for (const request of pendingRequests) {
//     if (request.fromUserId === viewerUserId) {
//       pendingUserIds.add(request.toUserId);
//     } else {
//       pendingUserIds.add(request.fromUserId);
//     }
//   }
//   return {
//     ok: true as const,
//     users: users.map((user: any) => {
//       const userBlockedMe = Array.isArray(user.blockedUsers)
//         ? user.blockedUsers.includes(viewerUserId)
//         : false;
//       const blockedByMe = viewerBlockedUsers.has(user.userId);
//       const hasBlockedMe = userBlockedMe;
//       const card = publicUserCard(user);
//       return {
//         ...card,
//         isFriend: viewerFriends.has(user.userId),
//         hasPendingFriendRequest: pendingUserIds.has(user.userId),
//         isBlocked: blockedByMe || hasBlockedMe,
//         blockedByMe,
//         hasBlockedMe,
//       };
//     }),
//   };
// }
// /*
//   Send friend request
// */
// export async function sendFriendRequestService(input: {
//   fromUserId: string;
//   toUserId: string;
// }) {
//   const { fromUserId, toUserId } = input;
//   if (fromUserId === toUserId) {
//     return {
//       ok: false as const,
//       reason: "cannot_add_yourself",
//     };
//   }
//   const fromUser = await UserModel.findOne({ userId: fromUserId });
//   const toUser = await UserModel.findOne({ userId: toUserId });
//   if (!fromUser || !toUser) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   ensureUserStats(fromUser);
//   ensureUserStats(toUser);
//   if (
//     Array.isArray(fromUser.blockedUsers) &&
//     fromUser.blockedUsers.includes(toUserId)
//   ) {
//     return {
//       ok: false as const,
//       reason: "you_blocked_this_user",
//     };
//   }
//   if (
//     Array.isArray(toUser.blockedUsers) &&
//     toUser.blockedUsers.includes(fromUserId)
//   ) {
//     return {
//       ok: false as const,
//       reason: "user_blocked_you",
//     };
//   }
//   if (toUser.privacy?.friendRequestPrivacy === "closed") {
//     return {
//       ok: false as const,
//       reason: "friend_requests_closed",
//     };
//   }
//   if (fromUser.friends.includes(toUserId)) {
//     return {
//       ok: false as const,
//       reason: "already_friends",
//     };
//   }
//   const existingPending = await FriendRequestModel.findOne({
//     status: "pending",
//     $or: [
//       {
//         fromUserId,
//         toUserId,
//       },
//       {
//         fromUserId: toUserId,
//         toUserId: fromUserId,
//       },
//     ],
//   });
//   if (existingPending) {
//     return {
//       ok: false as const,
//       reason: "friend_request_already_pending",
//     };
//   }
//   const request = await FriendRequestModel.create({
//     requestId: randomUUID(),
//     fromUserId,
//     toUserId,
//     status: "pending",
//   });
//   return {
//     ok: true as const,
//     request: {
//       requestId: request.requestId,
//       fromUserId: request.fromUserId,
//       toUserId: request.toUserId,
//       status: request.status,
//       createdAt: request.createdAt,
//       updatedAt: request.updatedAt,
//     },
//     fromUser: publicUserCard(fromUser),
//     toUser: publicUserCard(toUser),
//   };
// }
// export async function getIncomingFriendRequestsService(input: {
//   userId: string;
// }) {
//   const { userId } = input;
//   const requests = await FriendRequestModel.find({
//     toUserId: userId,
//     status: "pending",
//   })
//     .sort({ createdAt: -1 })
//     .lean();
//   const fromUserIds = requests.map((r) => r.fromUserId);
//   const users = await UserModel.find({
//     userId: { $in: fromUserIds },
//   })
//  .select(
//   [
//     "userId",
//     "username",
//     "photoUrl",
//     "coverUrl",
//     "accountColor",
//     "badgeKey",
//     "badgeName",
//     "badgeValue",
//     "verificationType",
//     "statusMessage",
//     "current",
//     "hideActivityStatus",
//     "isManualOffline",
//     "country",
//     "gender",
//     "birthdate",
//     "stats",
//     "blockedUsers",
//     "friends",
//     "privacy",
//     "createdAt",
//     "updatedAt",
//   ].join(" ")
// )
//     .lean();
//   const usersMap = new Map<string, any>();
//   for (const user of users) {
//     usersMap.set(user.userId, publicUserCard(user));
//   }
//   return {
//     ok: true as const,
//     requests: requests.map((request) => ({
//       requestId: request.requestId,
//       fromUserId: request.fromUserId,
//       toUserId: request.toUserId,
//       status: request.status,
//       createdAt: request.createdAt,
//       updatedAt: request.updatedAt,
//       fromUser: usersMap.get(request.fromUserId) || null,
//     })),
//   };
// }
// export async function getFriendsService(input: {
//   userId: string;
// }) {
//   const { userId } = input;
//   const user = await UserModel.findOne({ userId }).lean();
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   const friendIds = Array.isArray((user as any).friends)
//     ? (user as any).friends
//     : [];
//   const myBlockedUsers = Array.isArray((user as any).blockedUsers)
//     ? (user as any).blockedUsers
//     : [];
//   const friends = await UserModel.find({
//     userId: { $in: friendIds },
//   })
//     .select(
//       [
//         "userId",
//         "username",
//         "photoUrl",
//         "coverUrl",
//         "accountColor",
//         "badgeKey",
//         "badgeName",
//         "badgeValue",
//         "verificationType",
//         "statusMessage",
//         "current",
//         "hideActivityStatus",
//         "isManualOffline",
//         "country",
//         "gender",
//         "birthdate",
//         "stats",
//         "blockedUsers",
//         "friends",
//         "privacy",
//         "createdAt",
//         "updatedAt",
//       ].join(" ")
//     )
//     .lean();
//   return {
//     ok: true as const,
//     friends: friends.map((friend: any) => {
//       const blockedByMe = myBlockedUsers.includes(friend.userId);
//       const hasBlockedMe = Array.isArray(friend.blockedUsers)
//         ? friend.blockedUsers.includes(userId)
//         : false;
//       return {
//         ...publicUserCard(friend),
//         isFriend: true,
//         hasPendingFriendRequest: false,
//         isBlocked: blockedByMe || hasBlockedMe,
//         blockedByMe,
//         hasBlockedMe,
//       };
//     }),
//   };
// }
// export async function removeFriendService(input: {
//   userId: string;
//   friendUserId: string;
// }) {
//   const { userId, friendUserId } = input;
//   if (userId === friendUserId) {
//     return {
//       ok: false as const,
//       reason: "invalid_friend_user",
//     };
//   }
//   const user = await UserModel.findOne({ userId });
//   const friend = await UserModel.findOne({ userId: friendUserId });
//   if (!user || !friend) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   ensureUserStats(user);
//   ensureUserStats(friend);
//   user.friends = user.friends.filter((id) => id !== friendUserId);
//   friend.friends = friend.friends.filter((id) => id !== userId);
//   user.stats.friendsCount = user.friends.length;
//   friend.stats.friendsCount = friend.friends.length;
//   await user.save();
//   await friend.save();
//   await FriendRequestModel.updateMany(
//     {
//       status: "pending",
//       $or: [
//         {
//           fromUserId: userId,
//           toUserId: friendUserId,
//         },
//         {
//           fromUserId: friendUserId,
//           toUserId: userId,
//         },
//       ],
//     },
//     {
//       $set: {
//         status: "rejected",
//       },
//     }
//   );
//   return {
//     ok: true as const,
//     removedUserId: friendUserId,
//     user: publicUserCard(user),
//     friend: publicUserCard(friend),
//   };
// }
// export async function getBlockedUsersService(input: {
//   userId: string;
// }) {
//   const { userId } = input;
//   const user = await UserModel.findOne({ userId }).lean();
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   const blockedIds = Array.isArray((user as any).blockedUsers)
//     ? (user as any).blockedUsers
//     : [];
//   const users = await UserModel.find({
//     userId: { $in: blockedIds },
//   })
//  .select(
//   [
//     "userId",
//     "username",
//     "photoUrl",
//     "coverUrl",
//     "accountColor",
//     "badgeKey",
//     "badgeName",
//     "badgeValue",
//     "verificationType",
//     "statusMessage",
//     "current",
//     "hideActivityStatus",
//     "isManualOffline",
//     "country",
//     "gender",
//     "birthdate",
//     "stats",
//     "blockedUsers",
//     "friends",
//     "privacy",
//     "createdAt",
//     "updatedAt",
//   ].join(" ")
// )
//     .lean();
//   return {
//     ok: true as const,
//     blockedUsers: users.map((blockedUser: any) => ({
//       ...publicUserCard(blockedUser),
//       isBlocked: true,
//       blockedByMe: true,
//       hasBlockedMe: false,
//       isFriend: false,
//       hasPendingFriendRequest: false,
//     })),
//   };
// }
// export async function unblockUserService(input: {
//   userId: string;
//   targetUserId: string;
// }) {
//   const { userId, targetUserId } = input;
//   if (!targetUserId || userId === targetUserId) {
//     return {
//       ok: false as const,
//       reason: "invalid_target_user",
//     };
//   }
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   user.blockedUsers = user.blockedUsers.filter((id) => id !== targetUserId);
//   await user.save();
//   return {
//     ok: true as const,
//     targetUserId,
//   };
// }
// /*
//   Accept / reject friend request
// */
// export async function respondFriendRequestService(input: {
//   userId: string;
//   requestId: string;
//   action: "accept" | "reject";
// }) {
//   const { userId, requestId, action } = input;
//   const request = await FriendRequestModel.findOne({
//     requestId,
//     toUserId: userId,
//     status: "pending",
//   });
//   if (!request) {
//     return {
//       ok: false as const,
//       reason: "friend_request_not_found",
//     };
//   }
//   const fromUser = await UserModel.findOne({ userId: request.fromUserId });
//   const toUser = await UserModel.findOne({ userId: request.toUserId });
//   if (!fromUser || !toUser) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   ensureUserStats(fromUser);
//   ensureUserStats(toUser);
//   if (action === "reject") {
//     request.status = "rejected";
//     await request.save();
//     return {
//       ok: true as const,
//       action,
//       request: {
//         requestId: request.requestId,
//         fromUserId: request.fromUserId,
//         toUserId: request.toUserId,
//         status: request.status,
//         createdAt: request.createdAt,
//         updatedAt: request.updatedAt,
//       },
//       fromUser: publicUserCard(fromUser),
//       toUser: publicUserCard(toUser),
//     };
//   }
//   request.status = "accepted";
//   if (!fromUser.friends.includes(toUser.userId)) {
//     fromUser.friends.push(toUser.userId);
//   }
//   if (!toUser.friends.includes(fromUser.userId)) {
//     toUser.friends.push(fromUser.userId);
//   }
//   fromUser.stats.friendsCount = fromUser.friends.length;
//   toUser.stats.friendsCount = toUser.friends.length;
//   await fromUser.save();
//   await toUser.save();
//   await request.save();
//   return {
//     ok: true as const,
//     action,
//     request: {
//       requestId: request.requestId,
//       fromUserId: request.fromUserId,
//       toUserId: request.toUserId,
//       status: request.status,
//       createdAt: request.createdAt,
//       updatedAt: request.updatedAt,
//     },
//     fromUser: publicUserCard(fromUser),
//     toUser: publicUserCard(toUser),
//   };
// }
const crypto_1 = require("crypto");
const User_model_1 = require("../../models/User.model");
const ProfileView_model_1 = require("../../models/ProfileView.model");
const FriendRequest_model_1 = require("../../models/FriendRequest.model");
const cloudinary_service_1 = require("../media/cloudinary.service");
function sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : user;
    const { password, __v, ...safeUser } = obj;
    return {
        ...safeUser,
        _id: String(obj._id),
        mongoId: String(obj._id),
    };
}
function isValidEmail(email) {
    if (!email)
        return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
function calculateAge(birthdate) {
    if (!birthdate)
        return null;
    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime()))
        return null;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    const dayDiff = now.getDate() - date.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    if (age < 0 || age > 120)
        return null;
    return age;
}
function publicUserCard(user) {
    const obj = user.toObject ? user.toObject() : user;
    const hideActivityStatus = obj.hideActivityStatus === true;
    const isManualOffline = obj.isManualOffline === true;
    const isHidden = hideActivityStatus || isManualOffline;
    return {
        userId: obj.userId,
        username: obj.username,
        photoUrl: obj.photoUrl || "",
        coverUrl: obj.coverUrl || "",
        accountColor: obj.accountColor || "#2BCB00",
        badgeKey: obj.badgeKey || "",
        badgeName: obj.badgeName || "",
        badgeValue: obj.badgeValue || "",
        badges: Array.isArray(obj.inventory)
            ? obj.inventory
                .filter((item) => {
                return (item.type === "badge" &&
                    item.isActive === true);
            })
                .map((item) => ({
                itemId: item.itemId || "",
                key: item.key || "",
                name: item.name || "",
                value: item.value || "",
            }))
            : obj.badgeValue
                ? [
                    {
                        itemId: "",
                        key: obj.badgeKey || "",
                        name: obj.badgeName || "",
                        value: obj.badgeValue || "",
                    },
                ]
                : [],
        verificationType: obj.verificationType || "none",
        /*
          رتبة المستخدم العامة.
        */
        platformRole: obj.platformRole || "user",
        /*
          نوع حساب المستخدم.
        */
        accountType: obj.accountType || "none",
        /*
          تأثير دخول الغرفة.
        */
        roomEntryMediaUrl: obj.roomEntryMediaUrl || "",
        roomEntryEnabled: obj.roomEntryEnabled === true,
        /*
          تأثير فتح صفحة البروفايل.
        */
        profileEntryMediaUrl: obj.profileEntryMediaUrl || "",
        profileEntryEnabled: obj.profileEntryEnabled === true,
        /*
          رسالة دخول الغرفة.
        */
        roomWelcomeMessage: obj.roomWelcomeMessage || "",
        statusMessage: obj.statusMessage || "",
        current: isHidden
            ? "0"
            : obj.current || "",
        hideActivityStatus,
        isManualOffline,
        isOnline: isHidden
            ? false
            : obj.current === "1" ||
                obj.current === "online",
        country: obj.country || "",
        gender: obj.gender || "",
        birthdate: obj.birthdate || "",
        age: calculateAge(obj.birthdate),
        points: obj.points || 0,
        privacy: {
            dmPrivacy: obj.privacy?.dmPrivacy || "open",
            friendRequestPrivacy: obj.privacy?.friendRequestPrivacy ||
                "open",
            allowCalls: obj.privacy?.allowCalls || "all",
        },
        stats: {
            friendsCount: obj.stats?.friendsCount || 0,
            profileViewsCount: obj.stats?.profileViewsCount || 0,
            giftsSentCount: obj.stats?.giftsSentCount || 0,
            giftsReceivedCount: obj.stats?.giftsReceivedCount || 0,
        },
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
    };
}
function ensureUserStats(user) {
    if (!user.stats) {
        user.stats = {
            friendsCount: 0,
            profileViewsCount: 0,
            giftsSentCount: 0,
            giftsReceivedCount: 0,
        };
    }
    if (typeof user.stats.friendsCount !== "number") {
        user.stats.friendsCount = Array.isArray(user.friends)
            ? user.friends.length
            : 0;
    }
    if (typeof user.stats.profileViewsCount !== "number") {
        user.stats.profileViewsCount = 0;
    }
    if (typeof user.stats.giftsSentCount !== "number") {
        user.stats.giftsSentCount = 0;
    }
    if (typeof user.stats.giftsReceivedCount !== "number") {
        user.stats.giftsReceivedCount = 0;
    }
    if (!Array.isArray(user.friends)) {
        user.friends = [];
    }
}
/*
  Update profile
*/
async function updateUserProfileService(input) {
    const { userId, payload } = input;
    const update = {};
    /*
      status message
    */
    if (payload.status_message !== undefined) {
        update.statusMessage = String(payload.status_message || "").trim();
        update.current = String(payload.status_message || "").trim();
    }
    if (payload.statusMessage !== undefined) {
        update.statusMessage = String(payload.statusMessage || "").trim();
        update.current = String(payload.statusMessage || "").trim();
    }
    /*
      private lock
    */
    if (typeof payload.private_lock === "boolean") {
        update.privateLock = payload.private_lock;
    }
    if (typeof payload.privateLock === "boolean") {
        update.privateLock = payload.privateLock;
    }
    /*
      private message / dm privacy
      allowed: open, friends_only, closed
    */
    if (payload.private_message !== undefined) {
        const value = String(payload.private_message || "").trim();
        if (!["open", "friends_only", "closed"].includes(value)) {
            return {
                ok: false,
                reason: "invalid_private_message_value",
            };
        }
        update["privacy.dmPrivacy"] = value;
    }
    if (payload.dm_privacy !== undefined) {
        const value = String(payload.dm_privacy || "").trim();
        if (!["open", "friends_only", "closed"].includes(value)) {
            return {
                ok: false,
                reason: "invalid_dm_privacy",
            };
        }
        update["privacy.dmPrivacy"] = value;
    }
    /*
      allow calls
      allowed: all, friends_only, none
    */
    if (payload.allow_calls !== undefined) {
        const value = String(payload.allow_calls || "").trim();
        if (!["all", "friends_only", "none"].includes(value)) {
            return {
                ok: false,
                reason: "invalid_allow_calls",
            };
        }
        update["privacy.allowCalls"] = value;
    }
    /*
      auto join stream
    */
    if (typeof payload.auto_join_stream === "boolean") {
        update.autoJoinStream = payload.auto_join_stream;
    }
    if (typeof payload.autoJoinStream === "boolean") {
        update.autoJoinStream = payload.autoJoinStream;
    }
    /*
      hide activity status
    */
    if (typeof payload.hide_activity_status === "boolean") {
        update.hideActivityStatus = payload.hide_activity_status;
        update.isManualOffline = payload.hide_activity_status;
    }
    if (typeof payload.hideActivityStatus === "boolean") {
        update.hideActivityStatus = payload.hideActivityStatus;
        update.isManualOffline = payload.hideActivityStatus;
    }
    /*
      email
    */
    if (payload.email !== undefined) {
        const email = String(payload.email || "").trim().toLowerCase();
        if (!isValidEmail(email)) {
            return {
                ok: false,
                reason: "invalid_email",
            };
        }
        update.email = email;
    }
    /*
      birth day
    */
    if (payload.birth_day !== undefined) {
        update.birthdate = String(payload.birth_day || "").trim();
    }
    if (payload.birthdate !== undefined) {
        update.birthdate = String(payload.birthdate || "").trim();
    }
    /*
      country
    */
    if (payload.country !== undefined) {
        update.country = String(payload.country || "").trim();
    }
    /*
      gender
      allowed: male, female, other, empty
    */
    if (payload.gender !== undefined) {
        const gender = String(payload.gender || "").trim();
        if (!["male", "female", "other", ""].includes(gender)) {
            return {
                ok: false,
                reason: "invalid_gender",
            };
        }
        update.gender = gender;
    }
    /*
      change password
      لا يحتاج القديم
    */
    if (payload.new_password !== undefined) {
        const newPassword = String(payload.new_password || "").trim();
        if (newPassword.length < 6) {
            return {
                ok: false,
                reason: "password_too_short",
            };
        }
        update.password = newPassword;
    }
    if (payload.password !== undefined) {
        const newPassword = String(payload.password || "").trim();
        if (newPassword.length < 6) {
            return {
                ok: false,
                reason: "password_too_short",
            };
        }
        update.password = newPassword;
    }
    if (Object.keys(update).length === 0) {
        return {
            ok: false,
            reason: "no_valid_fields",
        };
    }
    const user = await User_model_1.UserModel.findOneAndUpdate({ userId }, {
        $set: update,
    }, {
        new: true,
        runValidators: true,
    });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    ensureUserStats(user);
    return {
        ok: true,
        user: sanitizeUser(user),
        publicUser: publicUserCard(user),
        changedFields: Object.keys(update),
    };
}
/*
  Update avatar / cover
*/
const ANIMATED_AVATAR_CHANGE_COST = 100;
const ANIMATED_AVATAR_ACCOUNT_TYPES = new Set([
    "merchant",
    "dealer",
    "agent",
    "partner",
    "creator",
    "broadcaster",
    "vip",
    "business",
    "official",
    "sponsor",
    "tester",
]);
function getBase64Buffer(value) {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) {
        return null;
    }
    const commaIndex = cleanValue.indexOf(",");
    const rawBase64 = cleanValue.startsWith("data:") && commaIndex >= 0
        ? cleanValue.slice(commaIndex + 1)
        : cleanValue;
    try {
        return Buffer.from(rawBase64, "base64");
    }
    catch {
        return null;
    }
}
/*
  يدعم:
  - GIF المتحرك.
  - WebP المتحرك الذي يحتوي ANIM أو ANMF.
*/
function isAnimatedProfileImage(base64) {
    const value = String(base64 || "").trim().toLowerCase();
    if (value.startsWith("data:image/gif")) {
        return true;
    }
    const buffer = getBase64Buffer(base64);
    if (!buffer || buffer.length < 6) {
        return false;
    }
    const signature = buffer.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") {
        return true;
    }
    /*
      فحص WebP المتحرك.
      نكتفي بجزء مناسب من الملف لأن ANIM/ANMF توجد قرب البداية عادةً.
    */
    if (buffer.length >= 16 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP") {
        const sample = buffer
            .subarray(0, Math.min(buffer.length, 256 * 1024))
            .toString("latin1");
        return sample.includes("ANIM") || sample.includes("ANMF");
    }
    return false;
}
async function updateUserProfileImageService(input) {
    const { userId, imageType, base64 } = input;
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const isAnimatedAvatar = imageType === "avatar" &&
        isAnimatedProfileImage(base64);
    /*
      الصورة المتحركة للبروفايل متاحة فقط للحسابات الخاصة.
      accountType = none لا يستطيع استخدامها.
    */
    if (isAnimatedAvatar) {
        const accountType = String(user.accountType || "none");
        if (!ANIMATED_AVATAR_ACCOUNT_TYPES.has(accountType)) {
            return {
                ok: false,
                reason: "animated_avatar_requires_account_type",
            };
        }
        /*
          يتم خصم 100 نقطة في كل مرة يرفع فيها المستخدم
          صورة بروفايل متحركة جديدة.
        */
        if (user.points < ANIMATED_AVATAR_CHANGE_COST) {
            return {
                ok: false,
                reason: "not_enough_points_for_animated_avatar",
                requiredPoints: ANIMATED_AVATAR_CHANGE_COST,
                currentPoints: user.points,
            };
        }
    }
    const oldUrl = imageType === "avatar"
        ? user.photoUrl
        : user.coverUrl;
    const oldPublicId = imageType === "avatar"
        ? user.photoPublicId
        : user.coverPublicId;
    const upload = await (0, cloudinary_service_1.uploadBase64ToCloudinary)({
        base64,
        userId,
        kind: imageType === "avatar"
            ? "profile_avatar"
            : "profile_cover",
    });
    if (!upload.ok) {
        return upload;
    }
    /*
      لا يتم الخصم إلا بعد نجاح رفع الصورة.
    */
    if (isAnimatedAvatar) {
        user.points -= ANIMATED_AVATAR_CHANGE_COST;
    }
    if (imageType === "avatar") {
        user.photoUrl = upload.url;
        user.photoPublicId = upload.publicId;
    }
    else {
        user.coverUrl = upload.url;
        user.coverPublicId = upload.publicId;
    }
    ensureUserStats(user);
    /*
      نحفظ الصورة والخصم في عملية حفظ واحدة.
    */
    try {
        await user.save();
    }
    catch (error) {
        /*
          لو تعذر حفظ المستخدم بعد رفع الصورة الجديدة،
          نحذف الملف الجديد حتى لا يبقى ملف غير مرتبط.
        */
        await (0, cloudinary_service_1.deleteCloudinaryFile)({
            url: upload.url,
            publicId: upload.publicId,
            resourceType: "image",
        });
        throw error;
    }
    /*
      نحذف الصورة القديمة بعد التأكد من حفظ الجديدة بنجاح.
      هذا يمنع ضياع الصورة القديمة لو فشل الحفظ.
    */
    if (oldUrl || oldPublicId) {
        await (0, cloudinary_service_1.deleteCloudinaryFile)({
            url: oldUrl,
            publicId: oldPublicId,
            resourceType: "image",
        });
    }
    return {
        ok: true,
        user: sanitizeUser(user),
        imageType,
        url: upload.url,
        publicId: upload.publicId,
        animated: isAnimatedAvatar,
        chargedPoints: isAnimatedAvatar
            ? ANIMATED_AVATAR_CHANGE_COST
            : 0,
        points: user.points,
    };
}
/*
  Delete account
*/
async function deleteMyAccountService(input) {
    const { userId } = input;
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    /*
      حذف صور المستخدم من Cloudinary
    */
    await (0, cloudinary_service_1.deleteCloudinaryFile)({
        url: user.photoUrl,
        publicId: user.photoPublicId,
        resourceType: "image",
    });
    await (0, cloudinary_service_1.deleteCloudinaryFile)({
        url: user.coverUrl,
        publicId: user.coverPublicId,
        resourceType: "image",
    });
    /*
      حذف علاقات الصداقة من الآخرين
    */
    await User_model_1.UserModel.updateMany({
        friends: userId,
    }, {
        $pull: {
            friends: userId,
        },
    });
    /*
      تحديث friendsCount للناس الذين كان عندهم هذا المستخدم
      بسيط: هنحدثهم بعد الحذف بطريقة عامة
    */
    const affectedUsers = await User_model_1.UserModel.find({});
    for (const affected of affectedUsers) {
        ensureUserStats(affected);
        affected.stats.friendsCount = affected.friends.length;
        await affected.save();
    }
    /*
      حذف طلبات الصداقة الخاصة به
    */
    await FriendRequest_model_1.FriendRequestModel.deleteMany({
        $or: [
            {
                fromUserId: userId,
            },
            {
                toUserId: userId,
            },
        ],
    });
    /*
      حذف زيارات البروفايل الخاصة به
    */
    await ProfileView_model_1.ProfileViewModel.deleteMany({
        $or: [
            {
                targetUserId: userId,
            },
            {
                viewerUserId: userId,
            },
        ],
    });
    /*
      حذف الحساب نفسه
    */
    await User_model_1.UserModel.deleteOne({ userId });
    return {
        ok: true,
    };
}
/*
  Get full user profile
  - يرجع اللون / البادج / التوثيق / الإحصائيات / العمر
  - يحسب زيارة واحدة يوميًا من كل حساب
*/
async function getFullUserProfileService(input) {
    const { viewerUserId, targetUserId } = input;
    const target = await User_model_1.UserModel.findOne({ userId: targetUserId });
    if (!target) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    ensureUserStats(target);
    const viewer = await User_model_1.UserModel.findOne({ userId: viewerUserId });
    if (viewer) {
        ensureUserStats(viewer);
    }
    const isSelf = viewerUserId === targetUserId;
    let viewAdded = false;
    /*
      لا نحسب زيارة المستخدم لنفسه
    */
    if (!isSelf) {
        try {
            await ProfileView_model_1.ProfileViewModel.create({
                targetUserId,
                viewerUserId,
                viewedDay: todayKey(),
            });
            target.stats.profileViewsCount += 1;
            await target.save();
            viewAdded = true;
        }
        catch (error) {
            /*
              11000 معناها نفس الشخص زار نفس البروفايل في نفس اليوم
              لا نكرر العد
            */
            if (error?.code !== 11000) {
                console.log("[PROFILE VIEW ERROR]", error?.message);
            }
        }
    }
    else {
        await target.save();
    }
    const isFriend = !!viewer && Array.isArray(viewer.friends)
        ? viewer.friends.includes(targetUserId)
        : false;
    const blockedByMe = !!viewer && Array.isArray(viewer.blockedUsers)
        ? viewer.blockedUsers.includes(targetUserId)
        : false;
    const hasBlockedMe = Array.isArray(target.blockedUsers)
        ? target.blockedUsers.includes(viewerUserId)
        : false;
    const isBlocked = blockedByMe || hasBlockedMe;
    const pendingRequest = await FriendRequest_model_1.FriendRequestModel.findOne({
        status: "pending",
        $or: [
            {
                fromUserId: viewerUserId,
                toUserId: targetUserId,
            },
            {
                fromUserId: targetUserId,
                toUserId: viewerUserId,
            },
        ],
    }).lean();
    return {
        ok: true,
        profile: {
            ...publicUserCard(target),
            isSelf,
            isFriend,
            isBlocked,
            blockedByMe,
            hasBlockedMe,
            hasPendingFriendRequest: !!pendingRequest,
            pendingFriendRequest: pendingRequest
                ? {
                    requestId: pendingRequest.requestId,
                    fromUserId: pendingRequest.fromUserId,
                    toUserId: pendingRequest.toUserId,
                    status: pendingRequest.status,
                    createdAt: pendingRequest.createdAt,
                }
                : null,
            viewAdded,
        },
    };
}
/*
  Search users
  يرجع صورة / اسم / لون / بادج / توثيق
*/
async function searchUsersService(input) {
    const { viewerUserId, query } = input;
    const q = String(query || "").trim().toLowerCase();
    if (!q) {
        return {
            ok: true,
            users: [],
        };
    }
    const viewer = await User_model_1.UserModel.findOne({ userId: viewerUserId }).lean();
    if (!viewer) {
        return {
            ok: false,
            reason: "viewer_not_found",
        };
    }
    const limit = Math.min(Math.max(input.limit || 20, 1), 50);
    const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User_model_1.UserModel.find({
        userId: {
            $ne: viewerUserId,
        },
        username: {
            $regex: safeRegex,
            $options: "i",
        },
    })
        .limit(limit)
        .select([
        "userId",
        "username",
        "photoUrl",
        "coverUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "statusMessage",
        "current",
        "hideActivityStatus",
        "isManualOffline",
        "country",
        "gender",
        "birthdate",
        "stats",
        "blockedUsers",
        "friends",
        "privacy",
        "createdAt",
        "updatedAt",
    ].join(" "))
        .lean();
    const targetIds = users.map((u) => u.userId);
    const viewerFriends = new Set(Array.isArray(viewer.friends) ? viewer.friends : []);
    const viewerBlockedUsers = new Set(Array.isArray(viewer.blockedUsers)
        ? viewer.blockedUsers
        : []);
    const pendingRequests = await FriendRequest_model_1.FriendRequestModel.find({
        status: "pending",
        $or: [
            {
                fromUserId: viewerUserId,
                toUserId: { $in: targetIds },
            },
            {
                toUserId: viewerUserId,
                fromUserId: { $in: targetIds },
            },
        ],
    }).lean();
    const pendingUserIds = new Set();
    for (const request of pendingRequests) {
        if (request.fromUserId === viewerUserId) {
            pendingUserIds.add(request.toUserId);
        }
        else {
            pendingUserIds.add(request.fromUserId);
        }
    }
    return {
        ok: true,
        users: users.map((user) => {
            const userBlockedMe = Array.isArray(user.blockedUsers)
                ? user.blockedUsers.includes(viewerUserId)
                : false;
            const blockedByMe = viewerBlockedUsers.has(user.userId);
            const hasBlockedMe = userBlockedMe;
            const card = publicUserCard(user);
            return {
                ...card,
                isFriend: viewerFriends.has(user.userId),
                hasPendingFriendRequest: pendingUserIds.has(user.userId),
                isBlocked: blockedByMe || hasBlockedMe,
                blockedByMe,
                hasBlockedMe,
            };
        }),
    };
}
/*
  Send friend request
*/
async function sendFriendRequestService(input) {
    const { fromUserId, toUserId } = input;
    if (fromUserId === toUserId) {
        return {
            ok: false,
            reason: "cannot_add_yourself",
        };
    }
    const fromUser = await User_model_1.UserModel.findOne({ userId: fromUserId });
    const toUser = await User_model_1.UserModel.findOne({ userId: toUserId });
    if (!fromUser || !toUser) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    ensureUserStats(fromUser);
    ensureUserStats(toUser);
    if (Array.isArray(fromUser.blockedUsers) &&
        fromUser.blockedUsers.includes(toUserId)) {
        return {
            ok: false,
            reason: "you_blocked_this_user",
        };
    }
    if (Array.isArray(toUser.blockedUsers) &&
        toUser.blockedUsers.includes(fromUserId)) {
        return {
            ok: false,
            reason: "user_blocked_you",
        };
    }
    if (toUser.privacy?.friendRequestPrivacy === "closed") {
        return {
            ok: false,
            reason: "friend_requests_closed",
        };
    }
    if (fromUser.friends.includes(toUserId)) {
        return {
            ok: false,
            reason: "already_friends",
        };
    }
    const existingPending = await FriendRequest_model_1.FriendRequestModel.findOne({
        status: "pending",
        $or: [
            {
                fromUserId,
                toUserId,
            },
            {
                fromUserId: toUserId,
                toUserId: fromUserId,
            },
        ],
    });
    if (existingPending) {
        return {
            ok: false,
            reason: "friend_request_already_pending",
        };
    }
    const request = await FriendRequest_model_1.FriendRequestModel.create({
        requestId: (0, crypto_1.randomUUID)(),
        fromUserId,
        toUserId,
        status: "pending",
    });
    return {
        ok: true,
        request: {
            requestId: request.requestId,
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            status: request.status,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        },
        fromUser: publicUserCard(fromUser),
        toUser: publicUserCard(toUser),
    };
}
async function getIncomingFriendRequestsService(input) {
    const { userId } = input;
    const requests = await FriendRequest_model_1.FriendRequestModel.find({
        toUserId: userId,
        status: "pending",
    })
        .sort({ createdAt: -1 })
        .lean();
    const fromUserIds = requests.map((r) => r.fromUserId);
    const users = await User_model_1.UserModel.find({
        userId: { $in: fromUserIds },
    })
        .select([
        "userId",
        "username",
        "photoUrl",
        "coverUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "statusMessage",
        "current",
        "hideActivityStatus",
        "isManualOffline",
        "country",
        "gender",
        "birthdate",
        "stats",
        "blockedUsers",
        "friends",
        "privacy",
        "createdAt",
        "updatedAt",
    ].join(" "))
        .lean();
    const usersMap = new Map();
    for (const user of users) {
        usersMap.set(user.userId, publicUserCard(user));
    }
    return {
        ok: true,
        requests: requests.map((request) => ({
            requestId: request.requestId,
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            status: request.status,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            fromUser: usersMap.get(request.fromUserId) || null,
        })),
    };
}
async function getFriendsService(input) {
    const { userId } = input;
    const user = await User_model_1.UserModel.findOne({ userId }).lean();
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const friendIds = Array.isArray(user.friends)
        ? user.friends
        : [];
    const myBlockedUsers = Array.isArray(user.blockedUsers)
        ? user.blockedUsers
        : [];
    const friends = await User_model_1.UserModel.find({
        userId: { $in: friendIds },
    })
        .select([
        "userId",
        "username",
        "photoUrl",
        "coverUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "statusMessage",
        "current",
        "hideActivityStatus",
        "isManualOffline",
        "country",
        "gender",
        "birthdate",
        "stats",
        "blockedUsers",
        "friends",
        "privacy",
        "createdAt",
        "updatedAt",
    ].join(" "))
        .lean();
    return {
        ok: true,
        friends: friends.map((friend) => {
            const blockedByMe = myBlockedUsers.includes(friend.userId);
            const hasBlockedMe = Array.isArray(friend.blockedUsers)
                ? friend.blockedUsers.includes(userId)
                : false;
            return {
                ...publicUserCard(friend),
                isFriend: true,
                hasPendingFriendRequest: false,
                isBlocked: blockedByMe || hasBlockedMe,
                blockedByMe,
                hasBlockedMe,
            };
        }),
    };
}
async function removeFriendService(input) {
    const { userId, friendUserId } = input;
    if (userId === friendUserId) {
        return {
            ok: false,
            reason: "invalid_friend_user",
        };
    }
    const user = await User_model_1.UserModel.findOne({ userId });
    const friend = await User_model_1.UserModel.findOne({ userId: friendUserId });
    if (!user || !friend) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    ensureUserStats(user);
    ensureUserStats(friend);
    user.friends = user.friends.filter((id) => id !== friendUserId);
    friend.friends = friend.friends.filter((id) => id !== userId);
    user.stats.friendsCount = user.friends.length;
    friend.stats.friendsCount = friend.friends.length;
    await user.save();
    await friend.save();
    await FriendRequest_model_1.FriendRequestModel.updateMany({
        status: "pending",
        $or: [
            {
                fromUserId: userId,
                toUserId: friendUserId,
            },
            {
                fromUserId: friendUserId,
                toUserId: userId,
            },
        ],
    }, {
        $set: {
            status: "rejected",
        },
    });
    return {
        ok: true,
        removedUserId: friendUserId,
        user: publicUserCard(user),
        friend: publicUserCard(friend),
    };
}
async function getBlockedUsersService(input) {
    const { userId } = input;
    const user = await User_model_1.UserModel.findOne({ userId }).lean();
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const blockedIds = Array.isArray(user.blockedUsers)
        ? user.blockedUsers
        : [];
    const users = await User_model_1.UserModel.find({
        userId: { $in: blockedIds },
    })
        .select([
        "userId",
        "username",
        "photoUrl",
        "coverUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "statusMessage",
        "current",
        "hideActivityStatus",
        "isManualOffline",
        "country",
        "gender",
        "birthdate",
        "stats",
        "blockedUsers",
        "friends",
        "privacy",
        "createdAt",
        "updatedAt",
    ].join(" "))
        .lean();
    return {
        ok: true,
        blockedUsers: users.map((blockedUser) => ({
            ...publicUserCard(blockedUser),
            isBlocked: true,
            blockedByMe: true,
            hasBlockedMe: false,
            isFriend: false,
            hasPendingFriendRequest: false,
        })),
    };
}
async function unblockUserService(input) {
    const { userId, targetUserId } = input;
    if (!targetUserId || userId === targetUserId) {
        return {
            ok: false,
            reason: "invalid_target_user",
        };
    }
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    user.blockedUsers = user.blockedUsers.filter((id) => id !== targetUserId);
    await user.save();
    return {
        ok: true,
        targetUserId,
    };
}
/*
  Accept / reject friend request
*/
async function respondFriendRequestService(input) {
    const { userId, requestId, action } = input;
    const request = await FriendRequest_model_1.FriendRequestModel.findOne({
        requestId,
        toUserId: userId,
        status: "pending",
    });
    if (!request) {
        return {
            ok: false,
            reason: "friend_request_not_found",
        };
    }
    const fromUser = await User_model_1.UserModel.findOne({ userId: request.fromUserId });
    const toUser = await User_model_1.UserModel.findOne({ userId: request.toUserId });
    if (!fromUser || !toUser) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    ensureUserStats(fromUser);
    ensureUserStats(toUser);
    if (action === "reject") {
        request.status = "rejected";
        await request.save();
        return {
            ok: true,
            action,
            request: {
                requestId: request.requestId,
                fromUserId: request.fromUserId,
                toUserId: request.toUserId,
                status: request.status,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt,
            },
            fromUser: publicUserCard(fromUser),
            toUser: publicUserCard(toUser),
        };
    }
    request.status = "accepted";
    if (!fromUser.friends.includes(toUser.userId)) {
        fromUser.friends.push(toUser.userId);
    }
    if (!toUser.friends.includes(fromUser.userId)) {
        toUser.friends.push(fromUser.userId);
    }
    fromUser.stats.friendsCount = fromUser.friends.length;
    toUser.stats.friendsCount = toUser.friends.length;
    await fromUser.save();
    await toUser.save();
    await request.save();
    return {
        ok: true,
        action,
        request: {
            requestId: request.requestId,
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            status: request.status,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        },
        fromUser: publicUserCard(fromUser),
        toUser: publicUserCard(toUser),
    };
}
//# sourceMappingURL=users.service.js.map