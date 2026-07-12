// import mongoose from "mongoose";

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
import mongoose from "mongoose";

import { ensureMerchantAccount } from "../features/merchant/merchant-account.service";

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Missing MONGO_URI in .env");
  }

  await mongoose.connect(uri);

  console.log("MongoDB connected");

  /*
    التأكد من وجود حساب merchant بعد نجاح الاتصال بقاعدة البيانات.

    إذا كان الحساب موجودًا:
    يتم التأكد أن رتبته owner ونوعه merchant.

    إذا لم يكن موجودًا:
    يتم إنشاؤه باستخدام بيانات ملف .env.
  */
  await ensureMerchantAccount();

  console.log("Merchant account ready");
}