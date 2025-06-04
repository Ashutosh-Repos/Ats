import { NextRequest, NextResponse } from "next/server";
import { JobRoleModel } from "@/db/models/JobRole";
import { connectToDatabase } from "@/db/connection/dbConnect";
import { z } from "zod";
import mongoose from "mongoose";

// ----------- Types -----------

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  issues?: Record<string, string[]>;
}

// ----------- Zod Schemas -----------

const JobRoleCreateSchema = z
  .object({
    hr: z
      .string()
      .min(1, "Hiring Manager is required")
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid hiring manager ID"
      ),
    hiringYear: z
      .number()
      .min(new Date().getFullYear(), "Hiring year must be current or future")
      .optional(),
    positionTitle: z.string().min(1, "Position title is required").trim(),
    postingDate: z.string().optional(),
    jobDescription: z.string().optional(),
    pay: z.number().min(0, "Pay must be non-negative").optional(),
    workType: z.enum(["on-site", "remote", "hybrid"]).optional(),
    requiredSkills: z.array(z.string().trim()).optional(),
    minQualification: z
      .string()
      .min(1, "Minimum qualification is required")
      .trim(),
    addedQualifications: z.string().optional(),
    qualificationDescription: z.string().optional(),
    hiringProcessStages: z
      .array(
        z.object({
          name: z.string().min(1, "Stage name is required").trim(),
          description: z.string().optional(),
          isMandatory: z.boolean().optional(),
          maxCandidates: z
            .number()
            .min(1, "At least 1 candidate required")
            .optional(),
          scheduledDate: z.union([z.string(), z.date()]).optional(),
          status: z
            .enum(["upcoming", "ongoing", "completed", "skipped", "terminated"])
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
    status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
  })
  .strict();

const JobRoleQuerySchema = z.object({
  hr: z
    .string()
    .min(1, "Hiring Manager ID is required")
    .refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid HR ID"),
});

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

// ----------- POST Handler -----------

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    await connectToDatabase();
    const body = await req.json();
    const parsed = JobRoleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      hr,
      hiringYear,
      positionTitle,
      postingDate,
      jobDescription,
      requiredSkills,
      pay,
      workType,
      minQualification,
      addedQualifications,
      qualificationDescription,
      hiringProcessStages,
      status,
    } = parsed.data;

    const now = new Date();

    const jobRole = await JobRoleModel.create({
      hiringManager: new mongoose.Types.ObjectId(hr),
      hiringYear: hiringYear || now.getFullYear(),
      positionTitle,
      postingDate: toDate(postingDate) || now,
      jobDescription,
      requiredSkills: requiredSkills || [],
      pay: pay,
      workType: workType,
      academicQualifications: {
        minQualification,
        addedQualifications: addedQualifications || undefined,
        description: qualificationDescription || undefined,
      },
      hiringProcessStages:
        hiringProcessStages?.map((stage) => ({
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
        })) || [],
      status: status || "draft",
    });

    return NextResponse.json(
      {
        success: true,
        data: jobRole,
        message: "Job role created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

// ----------- GET Handler -----------

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const hrId = searchParams.get("hr");

    if (!hrId) {
      return NextResponse.json(
        { success: false, error: "HR ID is required in query params" },
        { status: 400 }
      );
    }

    const parsed = JobRoleQuerySchema.safeParse({ hr: hrId });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const jobRoles = await JobRoleModel.find({ hiringManager: hrId })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: jobRoles,
        message: "Job roles fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}
