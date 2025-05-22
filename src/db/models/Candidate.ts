import mongoose, { Schema, models, Document, Types } from "mongoose";

export interface ICandidate extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  jodRole: Types.ObjectId;
  age?: number;
  applicationStatus: number;
  analysis: Types.ObjectId;
  resume: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    jodRole: { type: Schema.Types.ObjectId, required: true },
    age: { type: Number },
    applicationStatus: { type: Number },
    analysis: { type: Schema.Types.ObjectId },
    resume: { type: String },
  },
  { timestamps: true }
);

export const UserModel = models.User || mongoose.model("User", UserSchema);
