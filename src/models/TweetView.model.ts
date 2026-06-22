import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TweetViewDocument =
  Document & {
    tweetId: string;
    userId: string;

    createdAt: Date;
    updatedAt: Date;
  };

const TweetViewSchema =
  new Schema<TweetViewDocument>(
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

TweetViewSchema.index(
  {
    tweetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

export const TweetViewModel =
  mongoose.model<TweetViewDocument>(
    "TweetView",
    TweetViewSchema
  );