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
  HiringStage,
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
  scheduledDate: z.string().optional(), // Expect ISO string from frontend
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

const idParser = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: "Invalid pipeline ID format",
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

// GET: Fetch pipeline with stages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pipeId: string }> }
) {
  const { pipeId } = await params;
  try {
    await connectToDatabase();
    const parsedId = idParser.safeParse(pipeId);

    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    const pipeline = await HiringPipeline.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(pipeId) } },
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
    ]);

    if (!pipeline.length) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pipeline[0], { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update pipeline and stages
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pipeId: string }> }
) {
  const { pipeId } = await params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectToDatabase();

    // Authenticate user
    const authSession = await auth();
    const user = authSession?.user;
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

    const parsedId = idParser.safeParse(pipeId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = UpdatePipelineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const pipeline = await HiringPipeline.findById(pipeId).session(session);
    if (!pipeline) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Update pipeline fields
    const { name, description, status, createdById, hiringProcessStages } =
      parsed.data;
    if (name) pipeline.name = name;
    if (description) pipeline.description = description;
    if (status) pipeline.status = status;
    if (createdById)
      pipeline.createdById = new mongoose.Types.ObjectId(createdById);

    // Handle stages
    if (hiringProcessStages) {
      // Get existing stages
      const existingStages = await HiringStage.find({
        pipelineId: pipeId,
      }).session(session);
      const existingStageIds = existingStages.map((stage) =>
        stage._id.toString()
      );
      const newStageIds = hiringProcessStages
        .filter((stage) => stage._id)
        .map((stage) => stage._id!);

      // Delete stages not in the new list
      const stagesToDelete = existingStages.filter(
        (stage) => !newStageIds.includes(stage._id.toString())
      );
      for (const stage of stagesToDelete) {
        if (["Application", "Screening"].includes(stage.name.toLowerCase())) {
          await session.abortTransaction();
          return NextResponse.json(
            { error: `Cannot delete required stage: ${stage.name}` },
            { status: 400 }
          );
        }
        await HiringStage.deleteOne({ _id: stage._id }).session(session);
        await ActivityLog.create({
          actorId: user.id,
          action: Action.Delete,
          targetType: TargetType.HiringPipeline,
          targetId: stage._id,
          details: `Deleted hiring stage: ${stage.name} from pipeline: ${pipeline.name}`,
          timestamp: new Date(),
        });
      }

      // Create or update stages
      for (const stageData of hiringProcessStages) {
        if (stageData._id && existingStageIds.includes(stageData._id)) {
          // Update existing stage
          const stage = await HiringStage.findById(stageData._id).session(
            session
          );
          if (!stage) continue;
          stage.name = stageData.name;
          if (stageData.description) stage.description = stageData.description;
          if (stageData.isMandatory !== undefined)
            stage.isMandatory = stageData.isMandatory;
          if (stageData.maxCandidates)
            stage.maxCandidates = stageData.maxCandidates;
          if (stageData.scheduledDate)
            stage.scheduledDate = stageData.scheduledDate;
          if (stageData.status) stage.status = stageData.status;
          if (stageData.appearedCandidates)
            stage.appearedCandidates = stageData.appearedCandidates;
          if (stageData.qualifiedCandidates)
            stage.qualifiedCandidates = stageData.qualifiedCandidates;
          if (stageData.disqualifiedCandidates)
            stage.disqualifiedCandidates = stageData.disqualifiedCandidates;
          await stage.save();
          await ActivityLog.create({
            actorId: user.id,
            action: Action.Update,
            targetType: TargetType.HiringPipeline,
            targetId: stage._id,
            details: `Updated hiring stage: ${stage.name} in pipeline: ${pipeline.name}`,
            timestamp: new Date(),
          });
        } else {
          // Create new stage
          const newStage = new HiringStage({
            ...stageData,
            pipelineId: pipeId,
            appearedCandidates: stageData.appearedCandidates ?? [],
            qualifiedCandidates: stageData.qualifiedCandidates ?? [],
            disqualifiedCandidates: stageData.disqualifiedCandidates ?? [],
          });
          await newStage.save();
          await ActivityLog.create({
            actorId: user.id,
            action: Action.Create,
            targetType: TargetType.HiringPipeline,
            targetId: newStage._id,
            details: `Created hiring stage: ${newStage.name} in pipeline: ${pipeline.name}`,
            timestamp: new Date(),
          });
        }
      }
    }

    await pipeline.save();

    // Log pipeline update activity
    await ActivityLog.create({
      actorId: user.id,
      action: Action.Update,
      targetType: TargetType.HiringPipeline,
      targetId: pipeline._id,
      details: `Updated hiring pipeline: ${pipeline.name}`,
      timestamp: new Date(),
    });

    await session.commitTransaction();
    return NextResponse.json(pipeline, { status: 200 });
  } catch (error: any) {
    await session.abortTransaction();
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}

// DELETE: Delete pipeline and its stages
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pipeId: string }> }
) {
  const { pipeId } = await params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectToDatabase();

    // Authenticate user
    const authSession = await auth();
    const user = authSession?.user;
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

    const parsedId = idParser.safeParse(pipeId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    const pipeline = await HiringPipeline.findById(pipeId).session(session);
    if (!pipeline) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Delete associated stages
    const stages = await HiringStage.find({ pipelineId: pipeId }).session(
      session
    );
    for (const stage of stages) {
      await HiringStage.deleteOne({ _id: stage._id }).session(session);
      await ActivityLog.create({
        actorId: user.id,
        action: Action.Delete,
        targetType: TargetType.HiringPipeline,
        targetId: stage._id,
        details: `Deleted hiring stage: ${stage.name} from pipeline: ${pipeline.name}`,
        timestamp: new Date(),
      });
    }

    await pipeline.deleteOne();

    // Log pipeline deletion activity
    await ActivityLog.create({
      actorId: user.id,
      action: Action.Delete,
      targetType: TargetType.HiringPipeline,
      targetId: pipeline._id,
      details: `Deleted hiring pipeline: ${pipeline.name}`,
      timestamp: new Date(),
    });

    await session.commitTransaction();
    return NextResponse.json(
      { message: "Pipeline and associated stages deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    await session.abortTransaction();
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
