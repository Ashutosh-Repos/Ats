import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import {
  HiringPipeline,
  Permission,
  RolePermission,
  User,
  ActivityLog,
  Action,
  TargetType,
  PipelineStatus,
} from "@/db/models"; // Adjust path based on your project structure
import { auth } from "@/auth";
import { connectToDatabase } from "@/db/connection/dbConnect";

// Zod Schemas for Validation
const StageSchema = z.object({
  _id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.isValidObjectId(val), {
      message: "Invalid stage ID format",
    }),
  name: z.string().min(1, "Stage name is required").trim(),
  description: z.string().optional(),
  isMandatory: z.boolean().optional(),
  maxCandidates: z.number().min(1, "At least 1 candidate required").optional(),
  scheduledDate: z.string().optional(), // Expect ISO string
  status: z
    .enum(["upcoming", "ongoing", "completed", "skipped", "terminated"])
    .optional(),
  appearedCandidates: z
    .array(
      z.string().refine((id) => mongoose.isValidObjectId(id), {
        message: "Invalid candidate ID",
      })
    )
    .optional(),
  qualifiedCandidates: z
    .array(
      z.string().refine((id) => mongoose.isValidObjectId(id), {
        message: "Invalid candidate ID",
      })
    )
    .optional(),
  disqualifiedCandidates: z
    .array(
      z.string().refine((id) => mongoose.isValidObjectId(id), {
        message: "Invalid candidate ID",
      })
    )
    .optional(),
});

const PipelineSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().min(1, "Description is required").trim(),
  status: z.enum(Object.values(PipelineStatus) as [string, ...string[]], {
    message: `Status must be one of: ${Object.values(PipelineStatus).join(", ")}`,
  }),
  createdById: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.isValidObjectId(val), {
      message: "Invalid createdById format",
    }),
  hiringProcessStages: z
    .array(StageSchema)
    .optional()
    .refine(
      (stages) =>
        !stages ||
        (stages.some((s) => s.name.toLowerCase() === "application") &&
          stages.some((s) => s.name.toLowerCase() === "screening")),
      {
        message: "Pipeline must include Application and Screening stages",
      }
    ),
});

const UpdatePipelineSchema = PipelineSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

const QuerySchema = z.object({
  status: z
    .enum(Object.values(PipelineStatus) as [string, ...string[]])
    .optional(),
  sortBy: z.enum(["name", "createdAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// Utility to check if user has required permission
async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const user = await User.findById(userId).populate({
    path: "roleId",
    populate: { path: "permissions", model: "RolePermission" },
  });
  if (!user) return false;
  const rolePermissions = await RolePermission.find({ roleId: user.roleId });
  return rolePermissions.some((rp) => rp.permission === permission);
}

// GET: Retrieve all hiring pipelines with stages
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Authenticate user
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasViewJobsPermission = await hasPermission(
      user.id,
      Permission.EditJobs
    );
    if (!hasViewJobsPermission) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = QuerySchema.safeParse({
      status: searchParams.get("status"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    if (!query.success) {
      return NextResponse.json(
        { error: query.error.format() },
        { status: 400 }
      );
    }

    const { status, sortBy = "createdAt", sortOrder = "asc" } = query.data;

    // Fetch all pipelines with aggregation
    const matchStage: any = {};
    if (status) matchStage.status = status;

    const pipelines = await HiringPipeline.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "createdById",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hiringstages",
          localField: "_id",
          foreignField: "pipelineId",
          as: "hiringProcessStages",
          pipeline: [
            {
              $project: {
                name: 1,
                description: 1,
                isMandatory: 1,
                maxCandidates: 1,
                scheduledDate: 1,
                status: 1,
                appearedCandidates: 1,
                qualifiedCandidates: 1,
                disqualifiedCandidates: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          stageCount: { $size: "$hiringProcessStages" },
        },
      },
      {
        $sort: {
          [sortBy]: sortOrder === "asc" ? 1 : -1,
        },
      },
    ]);

    // Log activity
    await ActivityLog.create({
      actorId: user.id,
      action: Action.View,
      targetType: TargetType.HiringPipeline,
      targetId: null, // No specific pipeline ID for list view
      details: "Viewed all hiring pipelines",
      timestamp: new Date(),
    });

    return NextResponse.json(pipelines, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new hiring pipeline
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // Authenticate user
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const hasEditJobsPermission = await hasPermission(
      user.id,
      Permission.EditJobs
    );
    if (!hasEditJobsPermission) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = PipelineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, description, status } = parsed.data;

    // Create pipeline
    const pipeline = new HiringPipeline({
      name,
      description,
      status,
      createdById: user.id,
    });

    await pipeline.save();

    // Log activity
    await ActivityLog.create({
      actorId: user.id,
      action: Action.Create,
      targetType: TargetType.HiringPipeline,
      targetId: pipeline._id,
      details: `Created hiring pipeline: ${pipeline.name}`,
      timestamp: new Date(),
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
