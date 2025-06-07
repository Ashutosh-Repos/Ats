import mongoose, { Schema, models, Types, Document } from "mongoose";

export interface IJobRole extends Document {
  _id: Types.ObjectId;
  hiringManager: Types.ObjectId;
  hiringYear: number;
  positionTitle: string;
  postingDate: Date;
  requiredSkills?: string[];
  jobDescription?: string;
  pay?: number; // Add pay
  workType?: "on-site" | "remote" | "hybrid"; // Add workType
  academicQualifications: {
    minQualification: string;
    addedQualifications?: string;
    description?: string;
  };
  hiringProcessStages: {
    name: string;
    description?: string;
    isMandatory: boolean;
    maxCandidates?: number;
    scheduledDate?: Date;
    status?: "upcoming" | "ongoing" | "completed" | "skipped" | "terminated";
    appearedCandidates?: Types.ObjectId[];
    disqualifiedCandidates?: Types.ObjectId[];
    qualifiedCandidates?: Types.ObjectId[];
  }[];
  status?: "draft" | "open" | "closed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

export type LeanJobRole = {
  _id: Types.ObjectId;
  hiringManager: Types.ObjectId;
  hiringYear: number;
  positionTitle: string;
  postingDate: Date;
  requiredSkills?: string[];
  jobDescription?: string;
  pay?: number; // Add pay
  workType?: "on-site" | "remote" | "hybrid";
  academicQualifications: {
    minQualification: string;
    addedQualifications?: string;
    description?: string;
  };
  hiringProcessStages: {
    name: string;
    description?: string;
    isMandatory: boolean;
    maxCandidates?: number;
    scheduledDate?: Date;
    status?: "upcoming" | "ongoing" | "completed" | "skipped" | "terminated";
    appearedCandidates?: Types.ObjectId[];
    disqualifiedCandidates?: Types.ObjectId[];
    qualifiedCandidates?: Types.ObjectId[];
  }[];
  status?: "draft" | "open" | "closed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number; // Include __v for Mongoose's version key
};

const JobRoleSchema = new Schema(
  {
    hiringManager: {
      required: true,
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hiringYear: {
      type: Number,
      required: true,
    },
    positionTitle: {
      type: String,
      required: true,
    },
    postingDate: {
      type: Date,
      required: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    jobDescription: { type: String },
    pay: { type: Number }, // Add pay
    workType: { type: String, enum: ["on-site", "remote", "hybrid"] }, // Add workType
    academicQualifications: {
      minQualification: { type: String, required: true },
      addedQualifications: { type: String },
      description: { type: String },
    },
    hiringProcessStages: {
      type: [
        {
          name: { type: String, required: true },
          description: { type: String },
          isMandatory: { type: Boolean, default: false },
          scheduledDate: { type: Date },
          status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "skipped", "terminated"],
            default: "upcoming",
          },
          appearedCandidates: [
            { type: Schema.Types.ObjectId, ref: "Candidate" },
          ],
          disqualifiedCandidates: [
            { type: Schema.Types.ObjectId, ref: "Candidate" },
          ],
          qualifiedCandidates: [
            { type: Schema.Types.ObjectId, ref: "Candidate" },
          ],
          maxCandidates: {
            type: Number,
            min: [1, "At least 1 candidate must be allowed"],
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "cancelled"],
      default: "draft",
    },
  },
  {
    timestamps: true,
    indexes: [
      { key: { hiringManager: 1 } }, // Index for queries by hiringManager
      { key: { hiringYear: 1 } }, // Index for queries by hiringYear
      { key: { status: 1 } }, // Index for queries by status
    ],
  }
);

// Ensure required stages exist and validate hiring year
JobRoleSchema.pre("validate", function (next) {
  const doc = this as mongoose.Document & IJobRole;

  // Ensure "Application" and "Screening" stages exist and are mandatory
  const requiredStages = ["Application", "Screening"];
  for (const stageName of requiredStages) {
    if (
      !doc.hiringProcessStages.some(
        (stage) => stage.name.toLowerCase() === stageName.toLowerCase()
      )
    ) {
      doc.hiringProcessStages.unshift({
        name: stageName,
        isMandatory: true,
        status: "upcoming",
      });
    }
  }

  // Ensure required stages are marked as mandatory
  doc.hiringProcessStages.forEach((stage) => {
    if (requiredStages.includes(stage.name)) {
      stage.isMandatory = true;
    }
  });

  // Validate hiringYear
  const currentYear = new Date().getFullYear();
  if (doc.hiringYear < currentYear) {
    return next(
      new Error(
        "Hiring year must be greater than or equal to the current year."
      )
    );
  }

  next();
});

export const JobRoleModel =
  models.JobRole || mongoose.model<IJobRole>("JobRole", JobRoleSchema);
