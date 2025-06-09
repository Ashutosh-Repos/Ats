import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import {
  Candidate,
  CandidateSkill,
  StageParticipant,
  ActivityLog,
  User,
  HiringStage,
  HiringPipeline,
  CandidateStatus,
  Action,
  TargetType,
} from "@/db/models";
import { connectToDatabase } from "@/db/connection/dbConnect";

// Input validation schema for POST request body
const createCandidateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  email: z.string().email("Invalid email format"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  age: z
    .number()
    .positive("Age must be a positive number")
    .optional()
    .or(z.literal(null)),
  resume: z.string().url("Invalid resume URL").optional().or(z.literal("")),
  highestQualification: z
    .string()
    .max(100, "Qualification must be 100 characters or less")
    .optional()
    .or(z.literal("")),
  status: z
    .enum(Object.values(CandidateStatus) as [string, ...string[]])
    .optional(),
  skills: z.array(z.string().min(1, "Skill cannot be empty")).optional(),
  stageParticipation: z
    .array(
      z.object({
        stageId: z.string().refine((val) => mongoose.isValidObjectId(val), {
          message: "Invalid stage ID",
        }),
        appeared: z.boolean().optional(),
        qualified: z.boolean().optional(),
        score: z.number().min(0).max(100).optional().or(z.literal(null)),
        feedback: z
          .string()
          .max(1000, "Feedback must be 1000 characters or less")
          .optional()
          .or(z.literal("")),
      })
    )
    .optional(),
});

// POST route to create a candidate
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedBody = createCandidateSchema.safeParse(body);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedBody.error.errors },
        { status: 400 }
      );
    }
    const {
      name,
      email,
      phone,
      age,
      resume,
      highestQualification,
      status,
      skills,
      stageParticipation,
    } = validatedBody.data;

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check for duplicate email using aggregation
      const emailCheck = await Candidate.aggregate([
        { $match: { email } },
        { $count: "count" },
      ]);
      if (emailCheck.length > 0 && emailCheck[0].count > 0) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }

      // Create candidate
      const candidate = new Candidate({
        name,
        email,
        phone: phone || undefined,
        age: age || undefined,
        resume: resume || undefined,
        highestQualification: highestQualification || undefined,
        status: status || CandidateStatus.Applied,
      });
      await candidate.save({ session });
      const candidateId = candidate._id;

      // Create skills
      if (skills) {
        const uniqueSkills = [...new Set(skills)];
        const skillDocs = uniqueSkills.map((skill) => ({
          candidateId,
          skill,
        }));
        if (skillDocs.length > 0) {
          await CandidateSkill.insertMany(skillDocs, { session });
        }
      }

      // Create stage participation
      if (stageParticipation) {
        for (const sp of stageParticipation) {
          const stageId = new mongoose.Types.ObjectId(sp.stageId);
          // Verify stage exists
          const stageCheck =
            await HiringStage.findById(stageId).session(session);
          if (!stageCheck) {
            await session.abortTransaction();
            session.endSession();
            return NextResponse.json(
              { error: `Invalid stage ID: ${sp.stageId}` },
              { status: 400 }
            );
          }
          // Create stage participant
          const stageParticipant = new StageParticipant({
            candidateId,
            stageId,
            appeared: sp.appeared ?? false,
            qualified: sp.qualified ?? false,
            score: sp.score ?? undefined,
            feedback: sp.feedback || undefined,
          });
          await stageParticipant.save({ session });
        }
      }

      // Log creation action
      await ActivityLog.create(
        [
          {
            actorId: new mongoose.Types.ObjectId("000000000000000000000000"), // Placeholder actorId
            action: Action.Create,
            targetType: TargetType.Candidate,
            targetId: candidateId,
            details: `Created candidate: ${name}`,
            timestamp: new Date(),
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Fetch created candidate using aggregation
      const candidates = await Candidate.aggregate([
        { $match: { _id: candidateId } },
        {
          $lookup: {
            from: "attachments",
            localField: "_id",
            foreignField: "candidateId",
            as: "attachments",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "uploadedById",
                  foreignField: "_id",
                  as: "uploadedBy",
                },
              },
              {
                $unwind: {
                  path: "$uploadedBy",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  fileName: 1,
                  fileUrl: 1,
                  uploadedAt: 1,
                  uploadedBy: {
                    name: "$uploadedBy.name",
                    email: "$uploadedBy.email",
                  },
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "interviews",
            localField: "_id",
            foreignField: "candidateId",
            as: "interviews",
            pipeline: [
              {
                $lookup: {
                  from: "hiringstages",
                  localField: "stageId",
                  foreignField: "_id",
                  as: "stage",
                },
              },
              { $unwind: { path: "$stage", preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: "hiringpipelines",
                  localField: "stage.pipelineId",
                  foreignField: "_id",
                  as: "stage.pipeline",
                },
              },
              {
                $unwind: {
                  path: "$stage.pipeline",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  scheduledAt: 1,
                  status: 1,
                  stage: {
                    name: "$stage.name",
                    pipeline: "$stage.pipeline.name",
                    status: "$stage.status",
                  },
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "stageparticipants",
            localField: "_id",
            foreignField: "candidateId", // Fixed: Correct field name
            as: "stageParticipation",
            pipeline: [
              {
                $lookup: {
                  from: "hiringstages",
                  localField: "stageId",
                  foreignField: "_id",
                  as: "stage",
                },
              },
              { $unwind: { path: "$stage", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  appeared: 1,
                  qualified: 1,
                  score: 1,
                  feedback: 1,
                  stage: "$stage.name",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "candidateskills",
            localField: "_id",
            foreignField: "candidateId",
            as: "skills",
            pipeline: [{ $project: { skill: 1 } }],
          },
        },
        {
          $project: {
            candidate: {
              _id: "$_id",
              name: 1,
              email: 1,
              phone: 1,
              age: 1,
              resume: 1,
              highestQualification: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
            },
            attachments: 1,
            interviews: 1,
            stageParticipation: 1,
            skills: { $map: { input: "$skills", as: "s", in: "$$s.skill" } },
          },
        },
      ]);

      if (!candidates || candidates.length === 0) {
        return NextResponse.json(
          { error: "Candidate not found after creation" },
          { status: 404 }
        );
      }

      const candidateData = candidates[0];
      return NextResponse.json(
        {
          candidate: candidateData.candidate,
          attachments: candidateData.attachments,
          interviews: candidateData.interviews,
          stageParticipation: candidateData.stageParticipation,
          skills: candidateData.skills,
        },
        { status: 201 }
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error creating candidate:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
