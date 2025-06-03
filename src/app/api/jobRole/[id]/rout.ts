import { NextRequest, NextResponse } from "next/server";
import { JobRoleModel } from "@/db/models/JobRole";
import { connectToDatabase } from "@/db/connection/dbConnect";
import mongoose from "mongoose";
import { z } from "zod";

// ---- Zod Schema for PATCH Updates ----
const JobRoleUpdateSchema = z.object({
  jobRoleTitle: z.string().optional(),
  postingDate: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  jobDescription: z.string().optional(),
  minQualification: z.string().optional(),
  addedQualifications: z.string().optional(),
  qualificationDescription: z.string().optional(),
});

// ---- Helper to Validate ObjectId ----
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ---- Types for Update Payload ----
type JobRoleUpdatePayload = Partial<{
  jobRoleTitle: string;
  postingDate: Date;
  requiredSkills: string[];
  jobDescription: string;
  academicQualifications: {
    minQualification?: string;
    addedQualifications?: string;
    description?: string;
  };
}>;

// ---- GET Job Role by ID ----
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job Role ID" },
        { status: 400 }
      );
    }

    const jobRole = await JobRoleModel.findById(id);
    if (!jobRole) {
      return NextResponse.json(
        { success: false, error: "Job Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: jobRole }, { status: 200 });
  } catch (error) {
    console.error("GET JobRole error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Job Role" },
      { status: 500 }
    );
  }
}

// ---- DELETE Job Role by ID ----
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Job Role ID" },
        { status: 400 }
      );
    }

    const deleted = await JobRoleModel.findByIdAndDelete(id);
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
    console.error("DELETE JobRole error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete Job Role" },
      { status: 500 }
    );
  }
}

// ---- PATCH Job Role by ID ----
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!isValidObjectId(id)) {
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
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    const {
      jobRoleTitle,
      postingDate,
      requiredSkills,
      jobDescription,
      minQualification,
      addedQualifications,
      qualificationDescription,
    } = validation.data;

    const updatePayload: JobRoleUpdatePayload = {};

    if (jobRoleTitle) updatePayload.jobRoleTitle = jobRoleTitle;
    if (postingDate) updatePayload.postingDate = new Date(postingDate);
    if (requiredSkills) updatePayload.requiredSkills = requiredSkills;
    if (jobDescription) updatePayload.jobDescription = jobDescription;

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
      updatePayload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedJobRole) {
      return NextResponse.json(
        { success: false, error: "Job Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Job Role updated", data: updatedJobRole },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH JobRole error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update Job Role" },
      { status: 500 }
    );
  }
}
