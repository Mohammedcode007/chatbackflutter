require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

const OLD_URL = "https://te-bot.site/chatbackflutter/uploads/badges/lion.png";
// ضع هنا الرابط الجديد الصحيح
const NEW_URL = "https://te-bot.site/chatbackflutter/uploads/badges/lion.png?v=101";

async function main() {
  if (!MONGO_URI) {
    console.error("❌ Missing MONGO_URI in .env");
    process.exit(1);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 Connecting to MongoDB...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await mongoose.connect(MONGO_URI);

  const db = mongoose.connection.db;
  const users = db.collection("users");

  console.log("✅ Connected");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OLD_URL:", OLD_URL);
  console.log("NEW_URL:", NEW_URL);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
    1) تحديث أي inventory.value قديم مطابق للرابط القديم
  */
  const result1 = await users.updateMany(
    {
      "inventory.value": OLD_URL,
    },
    {
      $set: {
        "inventory.$[item].value": NEW_URL,
      },
    },
    {
      arrayFilters: [
        {
          "item.value": OLD_URL,
        },
      ],
    }
  );

  console.log("✅ Updated inventory.value by OLD_URL");
  console.log({
    matchedCount: result1.matchedCount,
    modifiedCount: result1.modifiedCount,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
    2) تحديث badgeImageUrl لو كان محفوظًا بالرابط القديم
  */
  const result2 = await users.updateMany(
    {
      badgeImageUrl: OLD_URL,
    },
    {
      $set: {
        badgeImageUrl: NEW_URL,
      },
    }
  );

  console.log("✅ Updated badgeImageUrl by OLD_URL");
  console.log({
    matchedCount: result2.matchedCount,
    modifiedCount: result2.modifiedCount,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
    3) تحديث عنصر image_badge_lion داخل inventory حتى لو قيمته ليست OLD_URL
    هذا مهم لو كان المستخدم اشترى الأسد قديمًا.
  */
  const result3 = await users.updateMany(
    {
      "inventory.itemId": "image_badge_lion",
    },
    {
      $set: {
        "inventory.$[item].value": NEW_URL,
        "inventory.$[item].key": "lion",
        "inventory.$[item].name": "Lion Badge",
        "inventory.$[item].type": "image_badge",
      },
    },
    {
      arrayFilters: [
        {
          "item.itemId": "image_badge_lion",
        },
      ],
    }
  );

  console.log("✅ Synced inventory item image_badge_lion");
  console.log({
    matchedCount: result3.matchedCount,
    modifiedCount: result3.modifiedCount,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
    4) تحديث الحقول المباشرة للمستخدمين الذين عندهم بادج الأسد نشط
  */
  const result4 = await users.updateMany(
    {
      badgeImageKey: "lion",
    },
    {
      $set: {
        badgeImageName: "Lion Badge",
        badgeImageUrl: NEW_URL,
      },
    }
  );

  console.log("✅ Synced active lion badge fields");
  console.log({
    matchedCount: result4.matchedCount,
    modifiedCount: result4.modifiedCount,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  /*
    5) فحص سريع بعد التحديث
  */
  const stillOldInventory = await users.countDocuments({
    "inventory.value": OLD_URL,
  });

  const stillOldActive = await users.countDocuments({
    badgeImageUrl: OLD_URL,
  });

  console.log("🔎 Remaining old inventory links:", stillOldInventory);
  console.log("🔎 Remaining old active badge links:", stillOldActive);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("🎉 Done");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("❌ Script failed");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch (_) {}

  process.exit(1);
});