import mongoose, { Schema, models, Document, Types } from "mongoose";

export interface Iuser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: "hr" | "admin";
  password?: string;
  age?: number;
  verifyCode?: string;
  verified: boolean;
  forgotCode?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["hr", "admin"], required: true },
    password: { type: String },
    age: { type: Number },
    verifyCode: { type: String },
    forgotCode: { type: String }, // newly added
    avatar: { type: String }, // newly added
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = models.User || mongoose.model("User", UserSchema);
