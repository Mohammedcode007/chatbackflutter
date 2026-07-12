"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCloudinaryPublicId = extractCloudinaryPublicId;
exports.uploadBase64ToCloudinary = uploadBase64ToCloudinary;
exports.deleteCloudinaryFile = deleteCloudinaryFile;
const cloudinary_1 = require("../../config/cloudinary");
function folderByKind(kind) {
    switch (kind) {
        case "profile_avatar":
            return "bimo/users/avatars";
        case "profile_cover":
            return "bimo/users/covers";
        case "chat_image":
            return "bimo/chats/images";
        case "chat_video":
            return "bimo/chats/videos";
        case "chat_audio":
            return "bimo/chats/audio";
        case "gift_gif":
            return "bimo/gifs";
        case "chat_file":
        default:
            return "bimo/files";
    }
}
function resourceTypeByKind(kind) {
    switch (kind) {
        case "profile_avatar":
        case "profile_cover":
        case "chat_image":
        case "gift_gif":
            return "image";
        case "chat_video":
        case "chat_audio":
            return "video";
        case "chat_file":
            return "raw";
        default:
            return "auto";
    }
}
function extractCloudinaryPublicId(url) {
    if (!url)
        return null;
    try {
        const cleanUrl = url.split("?")[0];
        const marker = "/upload/";
        const uploadIndex = cleanUrl.indexOf(marker);
        if (uploadIndex === -1)
            return null;
        let path = cleanUrl.substring(uploadIndex + marker.length);
        /*
          لو الرابط فيه version مثل:
          /upload/v123456/bimo/users/avatars/file.jpg
          نحذف v123456
        */
        path = path.replace(/^v\d+\//, "");
        /*
          نحذف الامتداد
        */
        path = path.replace(/\.[^/.]+$/, "");
        return path;
    }
    catch (_) {
        return null;
    }
}
async function uploadBase64ToCloudinary(input) {
    const { base64, kind, userId } = input;
    if (!base64 || !base64.startsWith("data:")) {
        return {
            ok: false,
            reason: "invalid_base64_file",
        };
    }
    const folder = folderByKind(kind);
    const resourceType = resourceTypeByKind(kind);
    const publicIdPrefix = userId ? `${userId}_${Date.now()}` : `${Date.now()}`;
    const result = await cloudinary_1.cloudinary.uploader.upload(base64, {
        folder,
        resource_type: resourceType,
        public_id: publicIdPrefix,
        overwrite: false,
    });
    return {
        ok: true,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
        bytes: result.bytes,
        format: result.format,
    };
}
async function deleteCloudinaryFile(input) {
    const publicId = input.publicId || extractCloudinaryPublicId(input.url);
    if (!publicId) {
        return {
            ok: false,
            reason: "missing_public_id",
        };
    }
    const resourceType = input.resourceType || "image";
    try {
        const result = await cloudinary_1.cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return {
            ok: true,
            result,
        };
    }
    catch (error) {
        return {
            ok: false,
            reason: error?.message || "cloudinary_delete_failed",
        };
    }
}
//# sourceMappingURL=cloudinary.service.js.map