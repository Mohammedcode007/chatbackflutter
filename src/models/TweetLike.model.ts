import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TweetLikeDocument =
  Document & {
    tweetId: string;
    userId: string;

    createdAt: Date;
    updatedAt: Date;
  };

const TweetLikeSchema =
  new Schema<TweetLikeDocument>(
    {
      tweetId: {
        type: String,
        required: true,
        index: true,
      },

      userId: {
        type: String,
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

TweetLikeSchema.index(
  {
    tweetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

export const TweetLikeModel =
  mongoose.model<TweetLikeDocument>(
    "TweetLike",
    TweetLikeSchema
  );