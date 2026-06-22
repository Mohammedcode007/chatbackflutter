import type {
  UploadApiOptions,
  UploadApiResponse,
} from "cloudinary";

import {
  cloudinary,
} from "../../config/cloudinary";

export type TweetUploadMediaType =
  | "image"
  | "video";

export type TweetMediaUploadInput = {
  type: TweetUploadMediaType;

  /*
    يقبل Base64 بالشكل:

    data:image/jpeg;base64,AAAA

    أو Base64 فقط بدون data URL.
  */
  base64: string;

  fileName?: string;
  mimeType?: string;
};

export type UploadedTweetMedia = {
  type: TweetUploadMediaType;

  url: string;

  publicId: string;

  thumbnailUrl: string;

  width?: number;

  height?: number;

  duration?: number;
};

type DeleteTweetMediaInput = {
  type?: string;

  publicId?: string;

  public_id?: string;
};

const MAX_IMAGES_PER_TWEET = 4;

const MAX_IMAGE_SIZE_BYTES = Number(
  process.env.TWEET_IMAGE_MAX_SIZE_BYTES ??
    10 * 1024 * 1024
);

const MAX_VIDEO_SIZE_BYTES = Number(
  process.env.TWEET_VIDEO_MAX_SIZE_BYTES ??
    30 * 1024 * 1024
);

const CLOUDINARY_TWEETS_FOLDER = String(
  process.env.CLOUDINARY_TWEETS_FOLDER ??
    "bimo/tweets"
).trim();

const ALLOWED_IMAGE_MIME_TYPES =
  new Set<string>([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

const ALLOWED_VIDEO_MIME_TYPES =
  new Set<string>([
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",
  ]);

function cleanText(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizeMimeType(
  value: unknown
): string {
  return cleanText(value)
    .toLowerCase()
    .split(";")[0]
    .trim();
}

function normalizeMediaType(
  value: unknown
): TweetUploadMediaType {
  const type = cleanText(
    value
  ).toLowerCase();

  if (
    type !== "image" &&
    type !== "video"
  ) {
    throw new Error(
      "invalid_tweet_media_type"
    );
  }

  return type;
}

function getMimeTypeFromDataUrl(
  value: string
): string {
  const match = value.match(
    /^data:([^;,]+);base64,/i
  );

  if (!match) {
    return "";
  }

  return normalizeMimeType(
    match[1]
  );
}

function ensureBase64DataUrl(
  base64Value: unknown,
  mimeTypeValue: unknown
): string {
  const base64 = cleanText(
    base64Value
  );

  if (!base64) {
    throw new Error(
      "tweet_media_base64_required"
    );
  }

  if (
    base64
      .toLowerCase()
      .startsWith("data:")
  ) {
    return base64;
  }

  const mimeType =
    normalizeMimeType(
      mimeTypeValue
    );

  if (!mimeType) {
    throw new Error(
      "tweet_media_mime_type_required"
    );
  }

  return `data:${mimeType};base64,${base64}`;
}

function getBase64Content(
  value: string
): string {
  const commaIndex =
    value.indexOf(",");

  const content =
    commaIndex >= 0
      ? value.substring(
          commaIndex + 1
        )
      : value;

  return content.replace(
    /\s/g,
    ""
  );
}

function getBase64SizeBytes(
  value: string
): number {
  const cleanBase64 =
    getBase64Content(value);

  if (!cleanBase64) {
    return 0;
  }

  const padding =
    cleanBase64.endsWith("==")
      ? 2
      : cleanBase64.endsWith("=")
        ? 1
        : 0;

  return (
    Math.floor(
      cleanBase64.length *
        3 /
        4
    ) - padding
  );
}

function validateBase64Content(
  value: string
): void {
  const cleanBase64 =
    getBase64Content(value);

  if (!cleanBase64) {
    throw new Error(
      "empty_tweet_media_file"
    );
  }

  /*
    يسمح بأحرف Base64 العادية.
  */
  const isValid =
    /^[A-Za-z0-9+/]*={0,2}$/.test(
      cleanBase64
    );

  if (!isValid) {
    throw new Error(
      "invalid_tweet_media_base64"
    );
  }
}

function validateTweetMedia({
  type,
  mimeType,
  sizeBytes,
}: {
  type: TweetUploadMediaType;
  mimeType: string;
  sizeBytes: number;
}): void {
  if (!sizeBytes) {
    throw new Error(
      "empty_tweet_media_file"
    );
  }

  if (type === "image") {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.has(
        mimeType
      )
    ) {
      throw new Error(
        "unsupported_tweet_image_type"
      );
    }

    if (
      sizeBytes >
      MAX_IMAGE_SIZE_BYTES
    ) {
      throw new Error(
        "tweet_image_too_large"
      );
    }

    return;
  }

  if (
    !ALLOWED_VIDEO_MIME_TYPES.has(
      mimeType
    )
  ) {
    throw new Error(
      "unsupported_tweet_video_type"
    );
  }

  if (
    sizeBytes >
    MAX_VIDEO_SIZE_BYTES
  ) {
    throw new Error(
      "tweet_video_too_large"
    );
  }
}

function createUploadOptions(
  type: TweetUploadMediaType
): UploadApiOptions {
  return {
    folder:
      CLOUDINARY_TWEETS_FOLDER,

    resource_type:
      type === "video"
        ? "video"
        : "image",

    overwrite: false,

    unique_filename: true,

    use_filename: false,
  };
}

function uploadBase64ToCloudinary(
  dataUrl: string,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  return new Promise(
    (resolve, reject) => {
      cloudinary.uploader.upload(
        dataUrl,
        options,
        (
          error,
          result
        ) => {
          if (error) {
            console.error(
              "[TWEET CLOUDINARY UPLOAD ERROR]",
              error
            );

            reject(
              new Error(
                error.message ||
                  "cloudinary_upload_failed"
              )
            );

            return;
          }

          if (!result) {
            reject(
              new Error(
                "cloudinary_empty_upload_result"
              )
            );

            return;
          }

          resolve(result);
        }
      );
    }
  );
}

function createVideoThumbnailUrl(
  publicId: string
): string {
  return cloudinary.url(
    publicId,
    {
      secure: true,

      resource_type:
        "video",

      format: "jpg",

      transformation: [
        {
          width: 900,

          height: 506,

          crop: "fill",

          gravity: "auto",

          quality: "auto",
        },
      ],
    }
  );
}

export async function uploadTweetMedia(
  input: TweetMediaUploadInput
): Promise<UploadedTweetMedia> {
  const type =
    normalizeMediaType(
      input.type
    );

  const dataUrl =
    ensureBase64DataUrl(
      input.base64,
      input.mimeType
    );

  validateBase64Content(
    dataUrl
  );

  const mimeType =
    getMimeTypeFromDataUrl(
      dataUrl
    ) ||
    normalizeMimeType(
      input.mimeType
    );

  if (!mimeType) {
    throw new Error(
      "tweet_media_mime_type_required"
    );
  }

  const sizeBytes =
    getBase64SizeBytes(
      dataUrl
    );

  validateTweetMedia({
    type,
    mimeType,
    sizeBytes,
  });

  console.log(
    "[TWEET MEDIA UPLOAD START]",
    {
      type,
      mimeType,
      sizeBytes,
      folder:
        CLOUDINARY_TWEETS_FOLDER,
    }
  );

  const result =
    await uploadBase64ToCloudinary(
      dataUrl,
      createUploadOptions(type)
    );

  const url = cleanText(
    result.secure_url
  );

  const publicId = cleanText(
    result.public_id
  );

  if (!url || !publicId) {
    throw new Error(
      "invalid_cloudinary_upload_result"
    );
  }

  const thumbnailUrl =
    type === "video"
      ? createVideoThumbnailUrl(
          publicId
        )
      : url;

  console.log(
    "[TWEET MEDIA UPLOAD SUCCESS]",
    {
      type,
      url,
      publicId,
      width: result.width,
      height: result.height,
      duration: result.duration,
    }
  );

  return {
    type,

    url,

    publicId,

    thumbnailUrl,

    width:
      typeof result.width ===
      "number"
        ? result.width
        : undefined,

    height:
      typeof result.height ===
      "number"
        ? result.height
        : undefined,

    duration:
      typeof result.duration ===
      "number"
        ? result.duration
        : undefined,
  };
}

export async function uploadTweetMediaList(
  mediaValue: unknown
): Promise<UploadedTweetMedia[]> {
  if (
    !Array.isArray(
      mediaValue
    ) ||
    mediaValue.length === 0
  ) {
    return [];
  }

  const media =
    mediaValue.map(
      (
        item
      ): TweetMediaUploadInput => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          throw new Error(
            "invalid_tweet_media_item"
          );
        }

        const source =
          item as Record<
            string,
            unknown
          >;

        return {
          type:
            normalizeMediaType(
              source.type
            ),

          base64:
            cleanText(
              source.base64
            ),

          fileName:
            cleanText(
              source.fileName ??
                source.file_name
            ),

          mimeType:
            cleanText(
              source.mimeType ??
                source.mime_type
            ),
        };
      }
    );

  const images =
    media.filter(
      (item) =>
        item.type === "image"
    );

  const videos =
    media.filter(
      (item) =>
        item.type === "video"
    );

  if (
    images.length > 0 &&
    videos.length > 0
  ) {
    throw new Error(
      "tweet_media_cannot_mix_images_and_video"
    );
  }

  if (
    images.length >
    MAX_IMAGES_PER_TWEET
  ) {
    throw new Error(
      "tweet_images_limit_exceeded"
    );
  }

  if (videos.length > 1) {
    throw new Error(
      "tweet_video_limit_exceeded"
    );
  }

  const uploadedFiles:
    UploadedTweetMedia[] = [];

  try {
    /*
      نرفع بالتتابع حتى لا نضغط على الذاكرة
      عند إرسال عدة صور Base64.
    */
    for (
      const item of media
    ) {
      const uploaded =
        await uploadTweetMedia(
          item
        );

      uploadedFiles.push(
        uploaded
      );
    }

    return uploadedFiles;
  } catch (error) {
    console.error(
      "[TWEET MEDIA LIST UPLOAD ERROR]",
      error
    );

    /*
      إذا فشل ملف نحذف الملفات التي
      تم رفعها في نفس العملية.
    */
    await deleteTweetMediaList(
      uploadedFiles
    );

    throw error;
  }
}

export async function deleteTweetMedia(
  media: DeleteTweetMediaInput
): Promise<boolean> {
  const publicId =
    cleanText(
      media.publicId ??
        media.public_id
    );

  if (!publicId) {
    return false;
  }

  const type =
    cleanText(
      media.type
    ).toLowerCase();

  const resourceType =
    type === "video"
      ? "video"
      : "image";

  try {
    const result =
      await cloudinary.uploader.destroy(
        publicId,
        {
          resource_type:
            resourceType,

          invalidate: true,
        }
      );

    console.log(
      "[TWEET MEDIA DELETE RESULT]",
      {
        publicId,
        resourceType,
        result:
          result.result,
      }
    );

    return (
      result.result === "ok" ||
      result.result ===
        "not found"
    );
  } catch (error) {
    console.error(
      "[TWEET MEDIA DELETE ERROR]",
      {
        publicId,
        resourceType,
        error,
      }
    );

    return false;
  }
}

export async function deleteTweetMediaList(
  mediaValue: unknown
): Promise<void> {
  if (
    !Array.isArray(
      mediaValue
    ) ||
    mediaValue.length === 0
  ) {
    return;
  }

  const media =
    mediaValue.filter(
      (item) =>
        item &&
        typeof item === "object"
    ) as DeleteTweetMediaInput[];

  await Promise.allSettled(
    media.map(
      (item) =>
        deleteTweetMedia(
          item
        )
    )
  );
}