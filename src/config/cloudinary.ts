import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log("[CLOUDINARY ENV CHECK]", {
  cloudName: cloudName ? "OK" : "MISSING",
  apiKey: apiKey ? "OK" : "MISSING",
  apiSecret: apiSecret ? "OK" : "MISSING",
});

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Missing Cloudinary env variables");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };