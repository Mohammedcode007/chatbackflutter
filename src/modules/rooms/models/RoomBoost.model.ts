import mongoose, { Schema, Document } from "mongoose";

export type RoomBoostDocument = Document & {
  boostId: string;
  roomId: string;
  userId: string;

  /*
    قيمة البوست.
    ممكن تخليها دائمًا 1، أو تخلي المستخدم يشتري أكثر من boost مرة واحدة.
  */
  value: number;

  /*
    تاريخ انتهاء البوست.
    بعده MongoDB سيحذف البوست تلقائيًا.
  */
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
};

const RoomBoostSchema = new Schema<RoomBoostDocument>(
  {
    boostId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

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

    value: {
      type: Number,
      default: 1,
      min: 1,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
  مهم جدًا:
  هذا يجعل MongoDB يحذف البوست تلقائيًا بعد expiresAt.

  ملاحظة:
  الحذف ليس في نفس الثانية بالضبط.
  MongoDB TTL monitor قد يتأخر دقيقة تقريبًا.
*/
RoomBoostSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

/*
  Index لترتيب public rooms حسب أكثر بوستات فعالة.
*/
RoomBoostSchema.index({
  roomId: 1,
  expiresAt: 1,
});

/*
  Index لو أردت تعرف المستخدم عمل boost لأي غرف.
*/
RoomBoostSchema.index({
  userId: 1,
  expiresAt: 1,
});

export const RoomBoostModel = mongoose.model<RoomBoostDocument>(
  "RoomBoost",
  RoomBoostSchema
);