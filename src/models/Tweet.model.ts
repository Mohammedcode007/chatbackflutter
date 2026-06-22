import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TweetMediaType =
  | "none"
  | "images"
  | "video";

export type TweetMediaItem = {
  type: "image" | "video";

  url: string;
  publicId: string;

  thumbnailUrl?: string;

  width?: number;
  height?: number;
  duration?: number;
};

export type TweetDocument = Document & {
  tweetId: string;

  authorId: string;
  authorUsername: string;

  text: string;

  mediaType: TweetMediaType;
  media: TweetMediaItem[];

  mentions: string[];

  likesCount: number;
  commentsCount: number;
  retweetsCount: number;
  viewsCount: number;

  isDeleted: boolean;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
};

const TweetMediaSchema =
  new Schema<TweetMediaItem>(
    {
      type: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },

      url: {
        type: String,
        required: true,
        trim: true,
      },

      publicId: {
        type: String,
        default: "",
        trim: true,
      },

      thumbnailUrl: {
        type: String,
        default: "",
        trim: true,
      },

      width: {
        type: Number,
        default: undefined,
      },

      height: {
        type: Number,
        default: undefined,
      },

      duration: {
        type: Number,
        default: undefined,
      },
    },
    {
      _id: false,
    }
  );

const TweetSchema =
  new Schema<TweetDocument>(
    {
      tweetId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      authorId: {
        type: String,
        required: true,
        index: true,
      },

      authorUsername: {
        type: String,
        required: true,
        trim: true,
      },

      text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },

      mediaType: {
        type: String,
        enum: ["none", "images", "video"],
        default: "none",
      },

      media: {
        type: [TweetMediaSchema],
        default: [],
      },

      mentions: {
        type: [String],
        default: [],
        index: true,
      },

      likesCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      commentsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      retweetsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      viewsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },

      deletedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

TweetSchema.index({
  createdAt: -1,
});

TweetSchema.index({
  authorId: 1,
  createdAt: -1,
});

TweetSchema.index({
  isDeleted: 1,
  createdAt: -1,
});

export const TweetModel =
  mongoose.model<TweetDocument>(
    "Tweet",
    TweetSchema
  );