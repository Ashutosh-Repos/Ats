import { NextRequest, NextResponse } from "next/server";
import { JobRoleModel } from "@/db/models/JobRole";
import { connectToDatabase } from "@/db/connection/dbConnect";
import { z } from "zod";
import mongoose from "mongoose";

// ----------- Zod Schemas -----------

const JobRoleCreateSchema = z.object({
  hr: z.string().min(1, "Hiring Manager is required"),
  jobRoleTitle: z.string().min(1, "Job role title is required"),
  postingDate: z.string().optional(),
  jobDescription: z.string().min(1, "Job description is required"),
  requiredSkills: z.array(z.string()).optional(),
  minQualification: z.string().min(1, "Minimum qualification is required"),
  addedQualifications: z.string().optional(),
  qualificationDescription: z.string().optional(),
});

const JobRoleQuerySchema = z.object({
  hr: z.string().min(1, "Hiring Manager ID is required"),
});

// ----------- Utility -----------

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// ----------- POST Handler: Create Job Role -----------

export async function POST(req: NextRequest) {
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
      jobRoleTitle,
      postingDate,
      jobDescription,
      requiredSkills,
      minQualification,
      addedQualifications,
      qualificationDescription,
    } = parsed.data;

    if (!isValidObjectId(hr)) {
      return NextResponse.json(
        { success: false, error: "Invalid hiring manager ID" },
        { status: 400 }
      );
    }

    const now = new Date();

    const jobRole = await JobRoleModel.create({
      hiringManager: new mongoose.Types.ObjectId(hr),
      jobRoleTitle,
      postingDate: postingDate ? new Date(postingDate) : now,
      requiredSkills:
        Array.isArray(requiredSkills) && requiredSkills.length > 0
          ? requiredSkills
          : undefined,
      jobDescription,
      academicQualifications: {
        minQualification,
        addedQualifications: addedQualifications || undefined,
        description: qualificationDescription || undefined,
      },
      hiringYear: now.getFullYear(),
    });

    return NextResponse.json({ success: true, data: jobRole }, { status: 201 });
  } catch (error) {
    console.error("POST /jobrole error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// ----------- GET Handler: Fetch Job Roles by HR ID -----------

export async function GET(req: NextRequest) {
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

    if (!isValidObjectId(hrId)) {
      return NextResponse.json(
        { success: false, error: "Invalid HR ID" },
        { status: 400 }
      );
    }

    const jobRoles = await JobRoleModel.find({ hiringManager: hrId }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      { success: true, data: jobRoles },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /jobrole error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
