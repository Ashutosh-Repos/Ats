import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";

const resumeAnalysisSchema = z.object({
  candidateName: z.string(),
  email: z.string().email(),
  score: z.number().min(1).max(100),
  goodPoints: z.array(z.string()),
  badPoints: z.array(z.string()),
});

class ResumeMatcherTool extends StructuredTool {
  name = "resume-matcher";
  description =
    "Analyzes a resume against a job description and returns a score, good points, and bad points.";

  // 🟢 Schema for the input!
  schema = z.object({
    resume: z.string(),
    jobDescription: z.string(),
  });

  async _call(input: { resume: string; jobDescription: string }) {
    const { resume, jobDescription } = input;
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
  Analyze the following resume against the provided job description.
  Return:
  - Candidate name and email.
  - A score (1-100) indicating how well the resume matches the job description.
  - A list of good points (skills/experience that align with the job description).
  - A list of bad points (missing or weak areas compared to the job description).

  Job Description:
  ${jobDescription}

  Resume:
  ${resume}

  Output in JSON format:
  {
    "candidateName": string,
    "email": string,
    "score": number,
    "goodPoints": string[],
    "badPoints": string[]
  }
`;

    const response = await model.invoke([new HumanMessage(prompt)]);

    // Clean response before parsing
    let raw = (response.content as string).trim();

    if (raw.startsWith("```")) {
      raw = raw.replace(/```json|```/g, "").trim();
    }

    const parsed = JSON.parse(raw);

    // Validate against schema
    return resumeAnalysisSchema.parse(parsed);
  }
}

export async function analyzeResumes(
  resumes: string[],
  jobDescription: string
) {
  const tool = new ResumeMatcherTool();
  const results = [];

  for (const resume of resumes) {
    const result = await tool.invoke({ resume, jobDescription });
    results.push(result);
  }

  return results;
}
