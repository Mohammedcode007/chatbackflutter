import mongoose, { Schema, Document } from "mongoose";

export type RoomRole = "creator" | "owner" | "admin" | "member" | "none";

export type RoomRoleLog = {
  logId: string;

  action: "role_set" | "role_removed";

  actorId: string;
  actorUsername: string;

  targetUserId: string;
  targetUsername: string;

  oldRole: RoomRole;

  /*
    لا نسمح بإعطاء creator لأي شخص.
    لذلك newRole لا يحتوي creator.
  */
  newRole: "owner" | "admin" | "member" | "none";

  createdAt: Date;
};

export type RoomDocument = Document & {
  roomId: string;

  name: string;
  description: string;

  /*
    creator واحد فقط.
    لا يتم وضعه داخل owners.
  */
  creatorId: string;

  /*
    هذه القوائم محفوظة دائمًا.
    لو المستخدم خرج ودخل تاني، دوره يظل موجود.
  */
  owners: string[];
  admins: string[];
  members: string[];

  /*
    logs للأدوار فقط.
    لا تحفظ رسائل الشات هنا.
  */
  roleLogs: RoomRoleLog[];

  bannedUsers: string[];
  bannedIps: string[];

  passwordHash: string;
  hasPassword: boolean;

  /*
    لو true:
    none لا يدخل الغرفة.
    member/admin/owner/creator يدخلون.
  */
  isLockedForNone: boolean;

  maxUsers: number;

  /*
    الأفضل لاحقًا تخلي activeUsers في memory store فقط.
    لكن لو تريدها محفوظة مؤقتًا هنا عادي.
    المهم لا تعتمد عليها كدور.
  */
  activeUsers: string[];

  favoriteCount: number;

  pinnedMessage: {
    text: string;
    updatedBy: string;
    updatedAt: Date | null;
  };

  voiceEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const RoleLogSchema = new Schema<RoomRoleLog>(
  {
    logId: {
      type: String,
      required: true,
    },

    action: {
      type: String,
      enum: ["role_set", "role_removed"],
      required: true,
    },

    actorId: {
      type: String,
      required: true,
      index: true,
    },

    actorUsername: {
      type: String,
      default: "",
    },

    targetUserId: {
      type: String,
      required: true,
      index: true,
    },

    targetUsername: {
      type: String,
      default: "",
    },

    oldRole: {
      type: String,
      enum: ["creator", "owner", "admin", "member", "none"],
      required: true,
    },

    newRole: {
      type: String,
      enum: ["owner", "admin", "member", "none"],
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const RoomSchema = new Schema<RoomDocument>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    creatorId: {
      type: String,
      required: true,
      index: true,
    },

    owners: {
      type: [String],
      default: [],
      index: true,
    },

    admins: {
      type: [String],
      default: [],
      index: true,
    },

    members: {
      type: [String],
      default: [],
      index: true,
    },

    roleLogs: {
      type: [RoleLogSchema],
      default: [],
    },

    bannedUsers: {
      type: [String],
      default: [],
      index: true,
    },

    bannedIps: {
      type: [String],
      default: [],
    },

    passwordHash: {
      type: String,
      default: "",
    },

    hasPassword: {
      type: Boolean,
      default: false,
    },

    isLockedForNone: {
      type: Boolean,
      default: false,
    },

    maxUsers: {
      type: Number,
      default: 50,
      min: 1,
      max: 50,
    },

    activeUsers: {
      type: [String],
      default: [],
      index: true,
    },

    favoriteCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pinnedMessage: {
      text: {
        type: String,
        default: "",
      },

      updatedBy: {
        type: String,
        default: "",
      },

      updatedAt: {
        type: Date,
        default: null,
      },
    },

    voiceEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/*
  Indexes مهمة للبحث والترتيب.
*/
RoomSchema.index({ roomId: 1, creatorId: 1 });
RoomSchema.index({ roomId: 1, owners: 1 });
RoomSchema.index({ roomId: 1, admins: 1 });
RoomSchema.index({ roomId: 1, members: 1 });
RoomSchema.index({ roomId: 1, bannedUsers: 1 });
RoomSchema.index({ roomId: 1, "roleLogs.createdAt": -1 });
RoomSchema.index({ roomId: 1, "roleLogs.actorId": 1 });
RoomSchema.index({ roomId: 1, "roleLogs.targetUserId": 1 });

/*
  تنظيف بسيط قبل الحفظ:
  - creator لا يكون داخل owners/admins/members.
  - أي مستخدم لا يتكرر في أكثر من قائمة.
*/
RoomSchema.pre("save", function () {
  const room = this as RoomDocument;

  const creatorId = String(room.creatorId || "").trim();

  function uniqueWithoutCreator(list: string[]) {
    return Array.from(
      new Set(
        (list || [])
          .map((id) => String(id || "").trim())
          .filter((id) => id && id !== creatorId)
      )
    );
  }

  room.owners = uniqueWithoutCreator(room.owners);
  room.admins = uniqueWithoutCreator(room.admins);
  room.members = uniqueWithoutCreator(room.members);

  /*
    لا تجعل نفس الشخص في أكثر من رتبة.
    الأولوية:
    owner ثم admin ثم member.
  */
  const ownersSet = new Set(room.owners);
  const adminsSet = new Set(room.admins);

  room.admins = room.admins.filter((id) => !ownersSet.has(id));

  room.members = room.members.filter(
    (id) => !ownersSet.has(id) && !adminsSet.has(id)
  );

  room.bannedUsers = Array.from(
    new Set(
      (room.bannedUsers || [])
        .map((id) => String(id || "").trim())
        .filter((id) => id && id !== creatorId)
    )
  );

  room.bannedIps = Array.from(
    new Set(
      (room.bannedIps || [])
        .map((ip) => String(ip || "").trim())
        .filter(Boolean)
    )
  );

  room.activeUsers = Array.from(
    new Set(
      (room.activeUsers || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );

  if (room.maxUsers > 50) {
    room.maxUsers = 50;
  }

  if (room.maxUsers < 1) {
    room.maxUsers = 1;
  }
});

export const RoomModel = mongoose.model<RoomDocument>("Room", RoomSchema);