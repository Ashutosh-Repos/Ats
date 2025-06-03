import { NextRequest, NextResponse } from "next/server";
import { JobRoleModel, IJobRole } from "@/db/models/JobRole";
import { connectToDatabase } from "@/db/connection/dbConnect";
import mongoose, { Types } from "mongoose";
import { z } from "zod";

// ----------- Types -----------

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  issues?: Record<string, string[]>;
}

// Type for lean JobRole (plain object without Mongoose Document methods)
type LeanJobRole = {
  _id: Types.ObjectId;
  hiringManager: Types.ObjectId;
  hiringYear: number;
  positionTitle: string;
  postingDate: Date;
  requiredSkills?: string[];
  jobDescription?: string;
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

// Type for update payload in PATCH request
interface UpdatePayload {
  positionTitle?: string;
  postingDate?: Date;
  requiredSkills?: string[];
  jobDescription?: string;
  status?: "draft" | "open" | "closed" | "cancelled";
  hiringProcessStages?: Array<{
    name: string;
    description?: string;
    isMandatory?: boolean;
    status?: "upcoming" | "ongoing" | "completed" | "skipped" | "terminated";
    maxCandidates?: number;
    scheduledDate?: Date;
    appearedCandidates?: Types.ObjectId[];
    disqualifiedCandidates?: Types.ObjectId[];
    qualifiedCandidates?: Types.ObjectId[];
  }>;
  academicQualifications?: {
    minQualification?: string;
    addedQualifications?: string;
    description?: string;
  };
}

// ----------- Zod Schema for PATCH Updates -----------

const JobRoleUpdateSchema = z
  .object({
    positionTitle: z
      .string()
      .min(1, "Position title is required")
      .trim()
      .optional(),
    postingDate: z
      .string()
      .refine(
        (val) => !val || !isNaN(new Date(val).getTime()),
        "Invalid posting date"
      )
      .optional(),
    requiredSkills: z.array(z.string().trim()).optional(),
    jobDescription: z.string().optional(),
    minQualification: z
      .string()
      .min(1, "Minimum qualification is required")
      .trim()
      .optional(),
    addedQualifications: z.string().optional(),
    qualificationDescription: z.string().optional(),
    status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
    hiringProcessStages: z
      .array(
        z.object({
          name: z.string().min(1, "Stage name is required").trim(),
          description: z.string().optional(),
          isMandatory: z.boolean().optional(),
          status: z
            .enum(["upcoming", "ongoing", "completed", "skipped", "terminated"])
            .optional(),
          maxCandidates: z
            .number()
            .min(1, "At least 1 candidate required")
            .optional(),
          scheduledDate: z
            .union([
              z
                .string()
                .refine(
                  (val) => !isNaN(new Date(val).getTime()),
                  "Invalid scheduled date"
                ),
              z.date(),
            ])
            .optional(),
          appearedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
          disqualifiedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
          qualifiedCandidates: z
            .array(
              z.string().refine(
                (id) => mongoose.Types.ObjectId.isValid(id),
                (val) => ({ message: `Invalid candidate ID: ${val}` })
              )
            )
            .optional(),
        })
      )
      .optional(),
  })
  .strict();

// ----------- Utilities -----------

const toDate = (value?: string | Date): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const handleError = (error: unknown): ApiResponse<never> => {
  console.error("Error:", error);
  if (error instanceof mongoose.Error.ValidationError) {
    return {
      success: false,
      error: "Validation error",
      issues: Object.fromEntries(
        Object.values(error.errors).map((err) => [err.path, [err.message]])
      ),
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "Internal Server Error",
  };
};

// ---- GET Job Role by ID ----
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<LeanJobRole>>> {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job Role ID" },
        { status: 400 }
      );
    }

    const jobRole = await JobRoleModel.findById(id).lean<LeanJobRole>();
    if (!jobRole) {
      return NextResponse.json(
        { success: false, error: "Job Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: jobRole,
        message: "Job Role fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

// ---- DELETE Job Role by ID ----
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<never>>> {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job Role ID" },
        { status: 400 }
      );
    }

    const deleted =
      await JobRoleModel.findByIdAndDelete(id).lean<LeanJobRole>();
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Job Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Job Role deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

// ---- PATCH Job Role by ID ----
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<LeanJobRole>>> {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job Role ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = JobRoleUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          issues: validation.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const updatePayload: UpdatePayload = {};

    const {
      positionTitle,
      postingDate,
      requiredSkills,
      jobDescription,
      minQualification,
      addedQualifications,
      qualificationDescription,
      status,
      hiringProcessStages,
    } = validation.data;

    if (positionTitle) updatePayload.positionTitle = positionTitle;
    if (postingDate) updatePayload.postingDate = toDate(postingDate);
    if (requiredSkills) updatePayload.requiredSkills = requiredSkills;
    if (jobDescription) updatePayload.jobDescription = jobDescription;
    if (status) updatePayload.status = status;
    if (hiringProcessStages) {
      updatePayload.hiringProcessStages = hiringProcessStages.map((stage) => ({
        ...stage,
        scheduledDate: toDate(stage.scheduledDate),
        appearedCandidates: stage.appearedCandidates?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
        disqualifiedCandidates: stage.disqualifiedCandidates?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
        qualifiedCandidates: stage.qualifiedCandidates?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      }));
    }

    if (minQualification || addedQualifications || qualificationDescription) {
      updatePayload.academicQualifications = {};
      if (minQualification)
        updatePayload.academicQualifications.minQualification =
          minQualification;
      if (addedQualifications)
        updatePayload.academicQualifications.addedQualifications =
          addedQualifications;
      if (qualificationDescription)
        updatePayload.academicQualifications.description =
          qualificationDescription;
    }

    const updatedJobRole = await JobRoleModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean<LeanJobRole>();

    if (!updatedJobRole) {
      return NextResponse.json(
        { success: false, error: "Job Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job Role updated successfully",
        data: updatedJobRole,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}
