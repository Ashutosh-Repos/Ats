import { NextRequest, NextResponse } from "next/server";
import { parseResumes } from "@/pdfParser";
import { analyzeResumes } from "@/langchainAgent";
import { Analysis } from "@/db/models/Analysis";
import { JobRoleModel } from "@/db/models/JobRole";
import { connectToDatabase } from "@/db/connection/dbConnect";

async function getJobDescription(
  jobDescription: string | undefined,
  jobRoleId: string | undefined
): Promise<string | null> {
  if (jobDescription?.trim()) return jobDescription;

  if (jobRoleId) {
    const jobRole =
      await JobRoleModel.findById(jobRoleId).select("jobDescription");
    return jobRole?.jobDescription?.trim() || null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const rawJobDescription = formData.get("jobDescription")?.toString();
    const jobRoleId = formData.get("jobRoleId")?.toString();
    const resumeFiles = formData.getAll("resumes") as File[];

    if (!resumeFiles.length) {
      return NextResponse.json(
        { success: false, error: "At least one resume file is required." },
        { status: 400 }
      );
    }

    const jobDescription = await getJobDescription(
      rawJobDescription,
      jobRoleId
    );
    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: "Job description is required." },
        { status: 400 }
      );
    }

    const buffers = await Promise.all(
      resumeFiles.map((file) => file.arrayBuffer().then(Buffer.from))
    );
    const filenames = resumeFiles.map((file) => file.name);

    const parsedResumes = await parseResumes(buffers, filenames);
    const analyses = await analyzeResumes(parsedResumes, jobDescription);

    const savedAnalyses = await Promise.all(
      analyses.map(async (analysis) => {
        try {
          const saved = await Analysis.create({
            candidateName: analysis.candidateName,
            email: analysis.email,
            score: analysis.score,
            goodPoints: analysis.goodPoints,
            badPoints: analysis.badPoints,
            jobDescription,
            resumeText: analysis.resumeText,
            jobRole: jobRoleId || undefined,
          });
          return saved.toObject();
        } catch (err) {
          console.error("Failed to save analysis:", err);
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: savedAnalyses.filter(Boolean),
    });
  } catch (error) {
    console.error("Error analyzing resumes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
