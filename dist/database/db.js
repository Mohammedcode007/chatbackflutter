"use strict";
// import mongoose from "mongoose";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
// export async function connectDatabase() {
//   const uri =
//     process.env.MONGO_URI;
//   if (!uri) {
//     throw new Error(
//       "Missing MONGO_URI in .env"
//     );
//   }
//   await mongoose.connect(
//     uri
//   );
//   console.log(
//     "MongoDB connected"
//   );
// }
const mongoose_1 = __importDefault(require("mongoose"));
const merchant_account_service_1 = require("../features/merchant/merchant-account.service");
async function connectDatabase() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("Missing MONGO_URI in .env");
    }
    await mongoose_1.default.connect(uri);
    console.log("MongoDB connected");
    /*
      التأكد من وجود حساب merchant بعد نجاح الاتصال بقاعدة البيانات.
  
      إذا كان الحساب موجودًا:
      يتم التأكد أن رتبته owner ونوعه merchant.
  
      إذا لم يكن موجودًا:
      يتم إنشاؤه باستخدام بيانات ملف .env.
    */
    await (0, merchant_account_service_1.ensureMerchantAccount)();
    console.log("Merchant account ready");
}
//# sourceMappingURL=db.js.map