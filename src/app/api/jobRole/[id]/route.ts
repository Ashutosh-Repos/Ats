import { NextRequest, NextResponse } from "next/server";
import {
  Job,
  JobSkill,
  Department,
  HiringPipeline,
  User,
  WorkType,
  ContractType,
} from "@/db/models";
import { connectToDatabase } from "@/db/connection/dbConnect";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { MongoServerError } from "mongodb";

// ----------- Types -----------

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  issues?: Record<string, string[]>;
}

// Lean Job type with populated fields
interface LeanJob {
  _id: Types.ObjectId;
  title: string;
  departmentId: { _id: Types.ObjectId; name: string };
  hiringManagerId: Types.ObjectId;
  hiringPipelineId: {
    _id: Types.ObjectId;
    createdById: { _id: Types.ObjectId; name: string; email: string };
  };
  workType: string;
  workLocation: string;
  contract: string;
  headCount: number;
  minimumSalary: number;
  maximumSalary: number;
  jobDescription: string | null;
  status: "draft" | "open" | "closed" | "cancelled";
  requiredSkills: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Update payload for PATCH
interface UpdatePayload {
  title?: string;
  workType?: WorkType;
  workLocation?: string;
  contract?: string;
  headCount?: number;
  minimumSalary?: number;
  maximumSalary?: number;
  jobDescription?: string;
  status?: "draft" | "open" | "closed" | "cancelled";
  requiredSkills?: string[];
  departmentId?: Types.ObjectId;
  hiringPipelineId?: Types.ObjectId;
  hiringManagerId?: Types.ObjectId;
}

// ----------- Zod Schema for PATCH Updates -----------

const JobUpdateSchema = z
  .object({
    title: z.string().min(1, "Job title is required").trim().optional(),
    workType: z
      .enum(Object.values(WorkType) as [string, ...string[]])
      .optional(),
    workLocation: z
      .string()
      .min(1, "Work location is required")
      .trim()
      .optional(),
    contract: z.enum(["full-time", "part-time", "contract"]).optional(),
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
    status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
    requiredSkills: z.array(z.string().trim()).optional(),
    departmentId: z
      .string()
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid department ID"
      )
      .optional(),
    hiringPipelineId: z
      .string()
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid pipeline ID"
      )
      .optional(),
    hiringManagerId: z
      .string()
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid hiring manager ID"
      )
      .optional(),
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
    error: error instanceof Error ? error.message : "Internal Server Error",
  };
};

// Mock authentication (replace with actual JWT verification)
const verifyAuth = async (req: NextRequest): Promise<string> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  // Replace with actual JWT logic
  return "60d5f4832f8fb814b56fa2b4"; // Mock user ID
};

// ---- GET Job by ID ----
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<LeanJob>>> {
  try {
    await connectToDatabase();
    const { id } = await params;
    const userId = await verifyAuth(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job ID" },
        { status: 400 }
      );
    }

    const jobs = await Job.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          hiringManagerId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentId",
        },
      },
      {
        $unwind: {
          path: "$departmentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          departmentId: {
            _id: "$departmentId._id",
            name: "$departmentId.name",
          },
        },
      },
      {
        $lookup: {
          from: "hiringpipelines",
          localField: "hiringPipelineId",
          foreignField: "_id",
          as: "hiringPipelineId",
        },
      },
      {
        $unwind: {
          path: "$hiringPipelineId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "hiringPipelineId.createdById",
          foreignField: "_id",
          as: "hiringPipelineId.createdById",
        },
      },
      {
        $unwind: {
          path: "$hiringPipelineId.createdById",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "hiringPipelineId.createdById": {
            _id: "$hiringPipelineId.createdById._id",
            name: "$hiringPipelineId.createdById.name",
            email: "$hiringPipelineId.createdById.email",
          },
        },
      },
      {
        $lookup: {
          from: "jobskills",
          localField: "_id",
          foreignField: "jobId",
          as: "requiredSkills",
        },
      },
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
    ]).exec();

    if (!jobs.length) {
      return NextResponse.json(
        { success: false, error: "Job not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: jobs[0],
        message: "Job fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

// ---- DELETE Job by ID ----
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<never>>> {
  try {
    await connectToDatabase();
    const { id } = await params;
    const userId = await verifyAuth(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job ID" },
        { status: 400 }
      );
    }

    const deleted = await Job.findOneAndDelete({
      _id: id,
      hiringManagerId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Job not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete associated JobSkill documents
    await JobSkill.deleteMany({ jobId: id });

    return NextResponse.json(
      { success: true, message: "Job deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}

// ---- PATCH Job by ID ----
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<LeanJob>>> {
  try {
    await connectToDatabase();
    const { id } = await params;
    const userId = await verifyAuth(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = JobUpdateSchema.safeParse(body);

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

    const {
      title,
      workType,
      workLocation,
      contract,
      headCount,
      minimumSalary,
      maximumSalary,
      jobDescription,
      status,
      requiredSkills,
      departmentId,
      hiringPipelineId,
      hiringManagerId,
    } = validation.data;

    const updatePayload: UpdatePayload = {};

    if (title) updatePayload.title = title;
    if (workType) updatePayload.workType = workType as WorkType;
    if (workLocation) updatePayload.workLocation = workLocation;
    if (contract) updatePayload.contract = contract as ContractType;
    if (headCount) updatePayload.headCount = headCount;
    if (minimumSalary !== undefined)
      updatePayload.minimumSalary = minimumSalary;
    if (maximumSalary !== undefined)
      updatePayload.maximumSalary = maximumSalary;
    if (jobDescription !== undefined)
      updatePayload.jobDescription = jobDescription;
    if (status) updatePayload.status = status;
    if (departmentId)
      updatePayload.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (hiringPipelineId)
      updatePayload.hiringPipelineId = new mongoose.Types.ObjectId(
        hiringPipelineId
      );
    if (hiringManagerId)
      updatePayload.hiringManagerId = new mongoose.Types.ObjectId(
        hiringManagerId
      );

    // Validate references if updating
    if (hiringManagerId) {
      const user = await User.findById(hiringManagerId);
      if (!user) throw new Error("Invalid hiring manager ID");
    }
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (!dept) throw new Error("Invalid department ID");
    }
    if (hiringPipelineId) {
      const pipeline = await HiringPipeline.findById(hiringPipelineId);
      if (!pipeline) throw new Error("Invalid pipeline ID");
      if (pipeline.createdById.toString() !== (hiringManagerId || userId)) {
        throw new Error(
          "Pipeline does not belong to the specified hiring manager"
        );
      }
    }

    const updatedJob = await Job.findOneAndUpdate(
      { _id: id, hiringManagerId: new mongoose.Types.ObjectId(userId) },
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedJob) {
      return NextResponse.json(
        { success: false, error: "Job not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update JobSkill documents
    if (requiredSkills) {
      await JobSkill.deleteMany({ jobId: id });
      const skills = requiredSkills.map((skill) => ({
        jobId: id,
        skill,
      }));
      if (skills.length) {
        await JobSkill.insertMany(skills);
      }
    }

    // Fetch updated job with aggregation for consistent response
    const [jobWithDetails] = await Job.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentId",
        },
      },
      {
        $unwind: {
          path: "$departmentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          departmentId: {
            _id: "$departmentId._id",
            name: "$departmentId.name",
          },
        },
      },
      {
        $lookup: {
          from: "hiringpipelines",
          localField: "hiringPipelineId",
          foreignField: "_id",
          as: "hiringPipelineId",
        },
      },
      {
        $unwind: {
          path: "$hiringPipelineId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "hiringPipelineId.createdById",
          foreignField: "_id",
          as: "hiringPipelineId.createdById",
        },
      },
      {
        $unwind: {
          path: "$hiringPipelineId.createdById",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "hiringPipelineId.createdById": {
            _id: "$hiringPipelineId.createdById._id",
            name: "$hiringPipelineId.createdById.name",
            email: "$hiringPipelineId.createdById.email",
          },
        },
      },
      {
        $lookup: {
          from: "jobskills",
          localField: "_id",
          foreignField: "jobId",
          as: "requiredSkills",
        },
      },
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
    ]).exec();

    return NextResponse.json(
      {
        success: true,
        message: "Job updated successfully",
        data: jobWithDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleError(error), { status: 500 });
  }
}
