import { NextRequest, NextResponse } from "next/server";
import { parseResumes } from "@/pdfParser";
import { analyzeResumes, IAgentRespons } from "@/langchainAgent";
import { connectToDatabase } from "@/db/connection/dbConnect";
import { Analysis } from "@/db/models/Analysis";
import { JobRoleModel } from "@/db/models/JobRole";

async function getJobDescription(
  jobDescription?: string,
  jobRoleId?: string
): Promise<string | null> {
  if (jobDescription?.trim()) return jobDescription.trim();

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

    // Initial Parse
    const parsedResumes = await parseResumes(buffers, filenames);

    // Retry failed parses
    const failedParseIndices = parsedResumes
      .map((text, i) => (!text.trim() ? i : -1))
      .filter((i) => i !== -1);

    if (failedParseIndices.length) {
      const retryBuffers = failedParseIndices.map((i) => buffers[i]);
      const retryFilenames = failedParseIndices.map((i) => filenames[i]);
      const retried = await parseResumes(retryBuffers, retryFilenames);

      retried.forEach((text, i) => {
        parsedResumes[failedParseIndices[i]] = text;
      });
    }

    // Extract valid resumes
    const validIndices = parsedResumes
      .map((text, i) => (text.trim() ? i : -1))
      .filter((i) => i !== -1);

    const validResumes = validIndices.map((i) => parsedResumes[i]);
    const validFilenames = validIndices.map((i) => filenames[i]);

    const analyses: IAgentRespons[] = await analyzeResumes(
      validResumes,
      jobDescription
    );

    const savedAnalyses = [];
    const failedAnalyses = [];

    for (let i = 0; i < analyses.length; i++) {
      try {
        const saved = await Analysis.create({
          candidateName: analyses[i].candidateName,
          email: analyses[i].email,
          score: analyses[i].score,
          goodPoints: analyses[i].goodPoints,
          badPoints: analyses[i].badPoints,
          resumeText: validResumes[i],
          jobDescription,
          jobRole: jobRoleId || undefined,
        });
        savedAnalyses.push(saved.toObject());
      } catch (err) {
        failedAnalyses.push({
          filename: validFilenames[i],
          candidateName: analyses[i].candidateName,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Retry save
    const retryFailures = [];
    for (const fail of failedAnalyses) {
      console.log(`retrying ${fail}`);
      const index = validFilenames.findIndex((f) => f === fail.filename);
      if (index === -1) continue;
      const failed: string[] = [validResumes[index]];

      const reanalysed: IAgentRespons[] = await analyzeResumes(
        failed,
        jobDescription
      );

      analyses[index] = reanalysed[0];

      try {
        const saved = await Analysis.create({
          candidateName: analyses[index].candidateName,
          email: analyses[index].email,
          score: analyses[index].score,
          goodPoints: analyses[index].goodPoints,
          badPoints: analyses[index].badPoints,
          resumeText: validResumes[index],
          jobDescription,
          jobRole: jobRoleId || undefined,
        });
        savedAnalyses.push(saved.toObject());
      } catch (retryErr) {
        retryFailures.push({
          filename: fail.filename,
          candidateName: fail.candidateName,
          reason:
            retryErr instanceof Error ? retryErr.message : "Unknown error",
        });
      }
    }

    // Mark permanently failed parses
    const finalFailedParses = parsedResumes
      .map((text, i) => (!text.trim() ? i : -1))
      .filter((i) => i !== -1)
      .map((i) => ({
        filename: filenames[i],
        candidateName: "Unknown",
        reason: "Failed to parse resume after retry",
      }));

    return NextResponse.json({
      success: true,
      saved: savedAnalyses,
      failed: [...retryFailures, ...finalFailedParses],
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
