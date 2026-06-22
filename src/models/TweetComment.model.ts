import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TweetCommentDocument =
  Document & {
    commentId: string;
    tweetId: string;

    authorId: string;
    authorUsername: string;

    text: string;

    mentions: string[];

    isEdited: boolean;
    editedAt?: Date | null;

    isDeleted: boolean;
    deletedAt?: Date | null;

    createdAt: Date;
    updatedAt: Date;
  };

const TweetCommentSchema =
  new Schema<TweetCommentDocument>(
    {
      commentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      tweetId: {
        type: String,
        required: true,
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
        required: true,
        trim: true,
        maxlength: 500,
      },

      mentions: {
        type: [String],
        default: [],
      },

      isEdited: {
        type: Boolean,
        default: false,
      },

      editedAt: {
        type: Date,
        default: null,
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

TweetCommentSchema.index({
  tweetId: 1,
  createdAt: -1,
});

TweetCommentSchema.index({
  authorId: 1,
  createdAt: -1,
});

export const TweetCommentModel =
  mongoose.model<TweetCommentDocument>(
    "TweetComment",
    TweetCommentSchema
  );