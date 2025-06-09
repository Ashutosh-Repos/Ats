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
    })
    .optional(),
});

const UpdateDepartmentSchema = DepartmentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

const QuerySchema = z.object({
  sortBy: z.enum(["name", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const user = await User.findById(userId).select("roleId");
  if (!user || !user.roleId) return false;
  console.log("user", user);
  console.log("roleId", user.roleId);
  console.log(permission);
  const rolePermissions = await RolePermission.find({
    roleId: user.roleId,
    permission: permission,
  });
  console.log("rolePermissions", rolePermissions);
  return (
    rolePermissions.length > 0 && rolePermissions[0].permission == permission
  );
}

// GET: Retrieve all departments with jobs
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

    // const { searchParams } = new URL(req.url);
    // const query = QuerySchema.safeParse({
    //   sortBy: searchParams.get("sortBy"),
    //   sortOrder: searchParams.get("sortOrder"),
    // });

    // if (!query.success) {
    //   return NextResponse.json(
    //     { error: query.error.format() },
    //     { status: 400 }
    //   );
    // }

    // const { sortBy = "createdAt", sortOrder = "asc" } = query.data;

    // const departments = await Department.find({
    //   hiringManagerId: user.id,
    // });
    const departments = await Department.aggregate([
      {
        $match: { hiringManagerId: user.id },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "departmentId",
          as: "jobs",
          pipeline: [
            {
              $project: {
                title: 1,
                description: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          jobCount: { $size: "$jobs" },
        },
      },
    ]);

    return NextResponse.json(departments, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new department with optional jobs
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = DepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, description, jobs } = parsed.data;

    // Create department
    const department = new Department({
      name,
      description,
      createdById: user.id,
    });

    await department.save({ session });

    // Create jobs if provided
    if (jobs && jobs.length > 0) {
      for (const jobData of jobs) {
        const newJob = new Job({
          ...jobData,
          departmentId: department._id,
        });
        await newJob.save({ session });
      }
    }

    await session.commitTransaction();
    return NextResponse.json(department, { status: 201 });
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
