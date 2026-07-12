"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDatabase() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("Missing MONGO_URI in .env");
    }
    await mongoose_1.default.connect(uri);
    console.log("MongoDB connected");
}
//# sourceMappingURL=db.js.map