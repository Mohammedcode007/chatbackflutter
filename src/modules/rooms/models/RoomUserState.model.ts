import mongoose, { Schema, Document } from "mongoose";

export type RoomUserStateDocument = Document & {
  roomId: string;
  userId: string;

  /*
    هل الغرفة في المفضلة عند هذا المستخدم.
  */
  isFavorite: boolean;

  /*
    اختياري:
    لو المستخدم لا يريد إشعارات من هذه الغرفة.
  */
  isMuted: boolean;

  /*
    آخر مرة دخل الغرفة.
    هذا ليس للرسائل، فقط معلومات حالة.
  */
  lastJoinedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
};

const RoomUserStateSchema = new Schema<RoomUserStateDocument>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },

    isMuted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastJoinedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
  كل مستخدم له state واحد فقط لكل غرفة.
*/
RoomUserStateSchema.index({ roomId: 1, userId: 1 }, { unique: true });

/*
  لجلب غرف المفضلة بسرعة.
*/
RoomUserStateSchema.index({ userId: 1, isFavorite: 1 });

/*
  لجلب الغرف المكتومة للمستخدم لو احتجتها.
*/
RoomUserStateSchema.index({ userId: 1, isMuted: 1 });

export const RoomUserStateModel = mongoose.model<RoomUserStateDocument>(
  "RoomUserState",
  RoomUserStateSchema
);