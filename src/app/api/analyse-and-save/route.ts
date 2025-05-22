interface ParsedResume {
  text: string;
  filename: string;
}

interface AnalysisResult {
  candidateName: string;
  email: string;
  score: number;
  goodPoints: string[];
  badPoints: string[];
  resumeText: string;
}

interface SavedAnalysis {
  _id: string;
  candidateName: string;
  email: string;
  score: number;
  goodPoints: string[];
  badPoints: string[];
  resumeText: string;
  jobDescription: string;
  jobRole?: string;
}

interface FailedAnalysis {
  filename: string;
  candidateName: string;
  reason: string;
}

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

    const parsedResumes = await parseResumes(buffers, filenames); // ParsedResume[]
    const analyses = await analyzeResumes(parsedResumes, jobDescription); // AnalysisResult[]

    const savedAnalyses: SavedAnalysis[] = [];
    const failedAnalyses: FailedAnalysis[] = [];

    // First save attempt
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      try {
        const saved = await Analysis.create({
          candidateName: analysis.candidateName,
          email: analysis.email,
          score: analysis.score,
          goodPoints: analysis.goodPoints,
          badPoints: analysis.badPoints,
          resumeText: analysis.resumeText,
          jobDescription,
          jobRole: jobRoleId || undefined,
        });
        savedAnalyses.push(saved.toObject() as SavedAnalysis);
      } catch (err) {
        console.error("Initial save failed:", err);
        failedAnalyses.push({
          filename: filenames[i],
          candidateName: analysis.candidateName,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Retry failed
    const retryFailures: FailedAnalysis[] = [];

    for (const fail of failedAnalyses) {
      const index = filenames.findIndex((f) => f === fail.filename);
      const analysis = analyses[index];
      try {
        const saved = await Analysis.create({
          candidateName: analysis.candidateName,
          email: analysis.email,
          score: analysis.score,
          goodPoints: analysis.goodPoints,
          badPoints: analysis.badPoints,
          resumeText: analysis.resumeText,
          jobDescription,
          jobRole: jobRoleId || undefined,
        });
        savedAnalyses.push(saved.toObject() as SavedAnalysis);
      } catch (retryErr) {
        console.error("Retry failed:", retryErr);
        retryFailures.push({
          filename: fail.filename,
          candidateName: fail.candidateName,
          reason:
            retryErr instanceof Error ? retryErr.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      saved: savedAnalyses,
      failed: retryFailures,
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
