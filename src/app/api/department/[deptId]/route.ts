import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { Department, Permission, RolePermission, User, Job } from "@/db/models"; // Adjust path based on your project structure
import { auth } from "@/auth";
import { connectToDatabase } from "@/db/connection/dbConnect";

// Zod Schemas for Validation
const JobSchema = z.object({
  _id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.isValidObjectId(val), {
      message: "Invalid job ID format",
    }),
  title: z.string().min(1, "Job title is required").trim(),
  description: z.string().optional(),
  isCritical: z.boolean().optional(),
  maxOpenings: z.number().min(1, "At least one opening required").optional(),
});

const DepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().min(1, "Description is required").trim(),

  createdById: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.isValidObjectId(val), {
      message: "Invalid createdById format",
    }),
  jobs: z
    .array(JobSchema)
    .optional()
    .refine((jobs) => !jobs || jobs.length >= 0, {
      message: "Jobs must be a valid array",
    }),
});

const UpdateDepartmentSchema = DepartmentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

const idParser = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: "Invalid department ID format",
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

// GET: Fetch department with jobs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deptId: string }> }
) {
  const { deptId } = await params;
  try {
    await connectToDatabase();
    const parsedId = idParser.safeParse(deptId);

    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    // Authenticate user
    const authSession = await auth();
    const user = authSession?.user;
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

    const department = await Department.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(deptId) } },
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
          from: "jobs",
          localField: "_id",
          foreignField: "departmentId",
          as: "jobs",
        },
      },
      {
        $addFields: {
          jobCount: { $size: "$jobs" },
        },
      },
    ]);

    if (!department.length) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Log activity

    return NextResponse.json(department[0], { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update department and jobs
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deptId: string }> }
) {
  const { deptId } = await params;
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

    const parsedId = idParser.safeParse(deptId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = UpdateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const department = await Department.findById(deptId).session(session);
    if (!department) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Update department fields
    const { name, description, createdById, jobs } = parsed.data;
    if (name) department.name = name;
    if (description) department.description = description;

    if (createdById)
      department.createdById = new mongoose.Types.ObjectId(createdById);

    // Handle jobs
    if (jobs) {
      // Get existing jobs
      const existingJobs = await Job.find({ departmentId: deptId }).session(
        session
      );
      const existingJobIds = existingJobs.map((job) => job._id.toString());
      const newJobIds = jobs.filter((job) => job._id).map((job) => job._id!);

      // Delete jobs not in the new list
      const jobsToDelete = existingJobs.filter(
        (job) => !newJobIds.includes(job._id.toString())
      );
      for (const job of jobsToDelete) {
        await Job.deleteOne({ _id: job._id }).session(session);
      }

      // Create or update jobs
      for (const jobData of jobs) {
        if (jobData._id && existingJobIds.includes(jobData._id)) {
          // Update existing job
          const job = await Job.findById(jobData._id).session(session);
          if (!job) continue;
          job.title = jobData.title;
          if (jobData.description) job.description = jobData.description;
          if (jobData.isCritical !== undefined)
            job.isCritical = jobData.isCritical;
          if (jobData.maxOpenings) job.maxOpenings = jobData.maxOpenings;
          await job.save();
        } else {
          // Create new job
          const newJob = new Job({
            ...jobData,
            departmentId: deptId,
          });
          await newJob.save({ session });
        }
      }
    }

    await department.save();

    await session.commitTransaction();
    return NextResponse.json(department, { status: 200 });
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

// DELETE: Delete department and its jobs
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deptId: string }> }
) {
  const { deptId } = await params;
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

    const parsedId = idParser.safeParse(deptId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: parsedId.error.format() },
        { status: 400 }
      );
    }

    const department = await Department.findById(deptId).session(session);
    if (!department) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Delete associated jobs
    const jobs = await Job.find({ departmentId: deptId }).session(session);
    for (const job of jobs) {
      await Job.deleteOne({ _id: job._id }).session(session);
    }

    await department.deleteOne();

    // Log department deletion activity

    await session.commitTransaction();
    return NextResponse.json(
      { message: "Department and associated jobs deleted successfully" },
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
