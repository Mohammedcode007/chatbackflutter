require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI not found in .env");
  }

  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;

  console.log("Connected to MongoDB");
  console.log("Database:", db.databaseName);

  console.log("\nOld indexes:");
  const oldIndexes = await db.collection("users").indexes();
  console.log(oldIndexes);

  try {
    await db.collection("users").dropIndex("atUsername_1");
    console.log("\nDropped index: atUsername_1");
  } catch (error) {
    console.log("\natUsername_1 not found or already removed");
  }

  try {
    await db.collection("users").dropIndex("email_1");
    console.log("Dropped index: email_1");
  } catch (error) {
    console.log("email_1 not found or already removed");
  }

  console.log("\nNew indexes:");
  const newIndexes = await db.collection("users").indexes();
  console.log(newIndexes);

  await mongoose.disconnect();
  console.log("\nDone");
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
