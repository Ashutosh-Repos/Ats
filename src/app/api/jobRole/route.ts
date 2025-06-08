import { NextRequest, NextResponse } from "next/server";
import {
  Job,
  HiringPipeline,
  JobSkill,
  User,
  Department,
  WorkType,
  ContractType,
} from "@/db/models"; // Import models and enums
import { connectToDatabase } from "@/db/connection/dbConnect";
import { z } from "zod";
import mongoose from "mongoose";
import { MongoServerError } from "mongodb";

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
    hiringManagerId: z
      .string()
      .min(1, "Hiring Manager ID is required")
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid hiring manager ID"
      ),
    departmentId: z
      .string()
      .min(1, "Department ID is required")
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid department ID"
      ),
    pipelineId: z
      .string()
      .min(1, "Pipeline ID is required")
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid pipeline ID"
      ),
    title: z.string().min(1, "Job title is required").trim(),
    workType: z
      .enum(Object.values(WorkType) as [string, ...string[]])
      .optional(),
    workLocation: z.string().min(1, "Work location is required").trim(),
    contract: z
      .enum(Object.values(ContractType) as [string, ...string[]])
      .optional(),
    headCount: z
      .number()
      .int()
      .positive("Head count must be positive")
      .optional(),
    minimumSalary: z
      .number()
      .nonnegative("Minimum salary must be non-negative")
      .optional(),
    maximumSalary: z
      .number()
      .nonnegative("Maximum salary must be non-negative")
      .optional(),
    jobDescription: z.string().optional(),
    requiredSkills: z.array(z.string().trim()).optional(),
  })
  .strict()
  .refine(
    (data) =>
      !data.maximumSalary ||
      !data.minimumSalary ||
      data.maximumSalary >= data.minimumSalary,
    {
      message: "Maximum salary must be greater than or equal to minimum salary",
      path: ["maximumSalary"],
    }
  );

const JobRoleQuerySchema = z.object({
  hiringManagerId: z
    .string()
    .min(1, "Hiring Manager ID is required")
    .refine(
      (id) => mongoose.Types.ObjectId.isValid(id),
      "Invalid hiring manager ID"
    ),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
});

// ----------- Utilities -----------

const handleError = (error: unknown): ApiResponse<never> => {
  console.error("Error:", error);
  if (error instanceof mongoose.Error.ValidationError) {
    return {
      success: false,
      error: "Validation error",
      issues: Object.fromEntries(
        Object.entries(error.errors).map(([path, err]) => [path, [err.message]])
      ),
    };
  }
  if (error instanceof MongoServerError) {
    if (error.code === 11000) {
      return {
        success: false,
        error: "Duplicate key error",
        issues: { general: ["A job with these details already exists"] },
      };
    }
    return {
      success: false,
      error: "Database error",
      issues: { general: [error.message] },
    };
  }
  return {
    success: false,
    error:
      error instanceof Error ? error.message : "An unexpected error occurred",
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
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      hiringManagerId,
      departmentId,
      pipelineId,
      title,
      workType,
      workLocation,
      contract,
      headCount,
      minimumSalary,
      maximumSalary,
      jobDescription,
      requiredSkills,
    } = parsed.data;

    // Validate hiring manager, department, and pipeline
    const [hiringManager, department, pipeline] = await Promise.all([
      User.findById(hiringManagerId),
      Department.findById(departmentId),
      HiringPipeline.findById(pipelineId),
    ]);

    if (!hiringManager) {
      throw new Error("Invalid hiring manager ID.");
    }
    if (!department) {
      throw new Error("Invalid department ID.");
    }
    if (!pipeline) {
      throw new Error("Invalid pipeline ID.");
    }
    if (pipeline.createdById.toString() !== hiringManagerId) {
      throw new Error(
        "Pipeline does not belong to the specified hiring manager."
      );
    }

    // Create job
    const job = await Job.create({
      title,
      departmentId,
      hiringManagerId: null, // Set to null as per schema allowance
      hiringPipelineId: pipelineId,
      workType: workType,
      workLocation,
      contract: contract,
      headCount: headCount || 1,
      minimumSalary: minimumSalary ?? 0,
      maximumSalary: maximumSalary ?? minimumSalary ?? 0,
      jobDescription: jobDescription || null,
    });

    // Create job skills
    const skills =
      requiredSkills?.map((skill) => ({
        jobId: job._id,
        skill,
      })) ?? [];
    if (skills.length) {
      await JobSkill.insertMany(skills);
    }

    return NextResponse.json(
      {
        success: true,
        data: { job, skills },
        message: "Job created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(handleError(error), {
      status: error instanceof Error ? 400 : 500,
    });
  }
}

// ----------- GET Handler -----------

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const hiringManagerId = searchParams.get("hr");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const parsed = JobRoleQuerySchema.safeParse({
      hiringManagerId,
      page,
      limit,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      hiringManagerId: validatedHiringManagerId,
      page: validatedPage,
      limit: validatedLimit,
    } = parsed.data;

    const jobs = await Job.aggregate([
      // Match jobs by hiringManagerId
      {
        $match: {
          hiringManagerId: new mongoose.Types.ObjectId(
            validatedHiringManagerId
          ),
        },
      },
      // Lookup Department
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentId",
        },
      },
      // Unwind departmentId to single object
      {
        $unwind: {
          path: "$departmentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project only department name
      {
        $addFields: {
          departmentId: {
            _id: "$departmentId._id",
            name: "$departmentId.name",
          },
        },
      },
      // Lookup HiringPipeline
      {
        $lookup: {
          from: "hiringpipelines",
          localField: "hiringPipelineId",
          foreignField: "_id",
          as: "hiringPipelineId",
        },
      },
      // Unwind hiringPipelineId
      {
        $unwind: {
          path: "$hiringPipelineId",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup User for createdById in HiringPipeline
      {
        $lookup: {
          from: "users",
          localField: "hiringPipelineId.createdById",
          foreignField: "_id",
          as: "hiringPipelineId.createdById",
        },
      },
      // Unwind createdById
      {
        $unwind: {
          path: "$hiringPipelineId.createdById",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project createdById fields
      {
        $addFields: {
          "hiringPipelineId.createdById": {
            _id: "$hiringPipelineId.createdById._id",
            name: "$hiringPipelineId.createdById.name",
            email: "$hiringPipelineId.createdById.email",
          },
        },
      },
      // Lookup JobSkill
      {
        $lookup: {
          from: "jobskills",
          localField: "_id",
          foreignField: "jobId",
          as: "requiredSkills",
        },
      },
      // Project requiredSkills as array of skill strings
      {
        $addFields: {
          requiredSkills: {
            $map: {
              input: "$requiredSkills",
              as: "skill",
              in: "$$skill.skill",
            },
          },
        },
      },
      // Sort by _id descending
      {
        $sort: { _id: -1 },
      },
      // Pagination
      {
        $skip: (validatedPage - 1) * validatedLimit,
      },
      {
        $limit: validatedLimit,
      },
    ]).exec();

    return NextResponse.json(
      {
        success: true,
        data: jobs,
        message: "Jobs fetched successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(handleError(error), {
      status: error instanceof Error ? 400 : 500,
    });
  }
}
