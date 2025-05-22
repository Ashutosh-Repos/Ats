import mongoose, { Schema, models, Types, Document } from "mongoose";

export interface IJobRole extends Document {
  _id: Types.ObjectId;
  hiringManager: Types.ObjectId;
  hiringYear: number;
  jobRole: string;
  postingDate: Date;
  requiredSkills: string[];
  academicQualifications: {
    minQualification: string;
    addedQualifications?: string;
    description?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const JobRoleSchema = new Schema(
  {
    hiringManager: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    hiringYear: {
      type: Number,
      required: true,
    },
    jobRole: {
      type: String,
      required: true,
    },
    postingDate: {
      type: Date,
      required: true,
    },
    requiredSkills: [
      {
        type: String,
      },
    ],
    jobDescription: {
      type: String,
    },
    academicQualifications: {
      minQualification: {
        type: String,
        required: true,
      },
      addedQualifications: {
        type: String,
      },
      description: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

JobRoleSchema.pre("validate", function (next) {
  const doc = this as mongoose.Document & {
    hiringYear: number;
    createdAt?: Date;
  };
  const creationYear = doc.createdAt
    ? doc.createdAt.getFullYear()
    : new Date().getFullYear();

  if (doc.hiringYear < creationYear) {
    return next(
      new Error(
        "Hiring year must be greater than or equal to the creation year."
      )
    );
  }

  next();
});

export const JobRoleModel =
  models.JobRole || mongoose.model("JobRole", JobRoleSchema);
