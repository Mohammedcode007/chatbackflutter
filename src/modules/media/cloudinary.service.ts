import { cloudinary } from "../../config/cloudinary";

export type MediaKind =
  | "profile_avatar"
  | "profile_cover"
  | "chat_image"
  | "chat_video"
  | "chat_audio"
  | "chat_file"
  | "gift_gif";

function folderByKind(kind: MediaKind) {
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

function resourceTypeByKind(kind: MediaKind): "image" | "video" | "raw" | "auto" {
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

export function extractCloudinaryPublicId(url?: string | null) {
  if (!url) return null;

  try {
    const cleanUrl = url.split("?")[0];
    const marker = "/upload/";
    const uploadIndex = cleanUrl.indexOf(marker);

    if (uploadIndex === -1) return null;

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
  } catch (_) {
    return null;
  }
}

export async function uploadBase64ToCloudinary(input: {
  base64: string;
  kind: MediaKind;
  userId?: string;
}) {
  const { base64, kind, userId } = input;

  if (!base64 || !base64.startsWith("data:")) {
    return {
      ok: false as const,
      reason: "invalid_base64_file",
    };
  }

  const folder = folderByKind(kind);
  const resourceType = resourceTypeByKind(kind);

  const publicIdPrefix = userId ? `${userId}_${Date.now()}` : `${Date.now()}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: resourceType,
    public_id: publicIdPrefix,
    overwrite: false,
  });

  return {
    ok: true as const,
    url: result.secure_url,
    publicId: result.public_id,
    resourceType,
    bytes: result.bytes,
    format: result.format,
  };
}

export async function deleteCloudinaryFile(input: {
  url?: string | null;
  publicId?: string | null;
  resourceType?: "image" | "video" | "raw";
}) {
  const publicId = input.publicId || extractCloudinaryPublicId(input.url);

  if (!publicId) {
    return {
      ok: false as const,
      reason: "missing_public_id",
    };
  }

  const resourceType = input.resourceType || "image";

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return {
      ok: true as const,
      result,
    };
  } catch (error: any) {
    return {
      ok: false as const,
      reason: error?.message || "cloudinary_delete_failed",
    };
  }
}