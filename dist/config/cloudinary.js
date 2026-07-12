"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = void 0;
require("dotenv/config");
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
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
cloudinary_1.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
});
//# sourceMappingURL=cloudinary.js.map