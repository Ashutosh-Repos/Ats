import mongoose, { Schema, models, Types, Document } from "mongoose";

export interface IAnalysis extends Document {
  _id: Types.ObjectId;
  candidateName: string;
  email: string;
  score?: number;
  goodPoints?: string[];
  badPoints?: string[];
  jobDescription: string;
  resumeText: string;
  jobRole?: Types.ObjectId; // Reference to JobRole
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema(
  {
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    goodPoints: [
      {
        type: String,
        trim: true,
      },
    ],
    badPoints: [
      {
        type: String,
        trim: true,
      },
    ],
    jobDescription: {
      type: String,
      required: true,
    },
    resumeText: {
      type: String,
      required: true,
    },
    jobRole: {
      type: Schema.Types.ObjectId,
      ref: "JobRole", // use the actual model name
      required: true,
    },
  },
  { timestamps: true }
);

export const Analysis =
  models.Analysis || mongoose.model("Analysis", AnalysisSchema);
