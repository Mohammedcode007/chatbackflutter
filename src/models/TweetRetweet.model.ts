import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TweetRetweetDocument =
  Document & {
    tweetId: string;
    userId: string;
    username: string;

    createdAt: Date;
    updatedAt: Date;
  };

const TweetRetweetSchema =
  new Schema<TweetRetweetDocument>(
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

      username: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

TweetRetweetSchema.index(
  {
    tweetId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

TweetRetweetSchema.index({
  userId: 1,
  createdAt: -1,
});

export const TweetRetweetModel =
  mongoose.model<TweetRetweetDocument>(
    "TweetRetweet",
    TweetRetweetSchema
  );