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

// Input validation schema for candidate ID
const candidateIdSchema = z
  .string()
  .refine((val) => mongoose.isValidObjectId(val), {
    message: "Invalid candidate ID",
  });

// Input validation schema for PUT request body
const updateCandidateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
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

// GET route to fetch a candidate
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const validated = candidateIdSchema.safeParse(params.id);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid candidate ID", details: validated.error.errors },
        { status: 400 }
      );
    }
    const candidateId = new mongoose.Types.ObjectId(validated.data);

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
          foreignField: "candidateId",
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
        { error: "Candidate not found" },
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
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching candidate:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT route to update a candidate
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const validatedId = candidateIdSchema.safeParse(params.id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: "Invalid candidate ID", details: validatedId.error.errors },
        { status: 400 }
      );
    }
    const candidateId = new mongoose.Types.ObjectId(validatedId.data);

    const body = await req.json();
    const validatedBody = updateCandidateSchema.safeParse(body);
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
      // Check if candidate exists
      const candidate = await Candidate.findById(candidateId).session(session);
      if (!candidate) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      // Check for duplicate email (if email is being updated)
      if (email && email !== candidate.email) {
        const emailCheck = await Candidate.aggregate([
          { $match: { email, _id: { $ne: candidateId } } },
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
      }

      // Update candidate fields
      const updateFields: Partial<Record<keyof typeof candidate, any>> = {};
      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (phone !== undefined) updateFields.phone = phone || undefined;
      if (age !== undefined) updateFields.age = age || undefined;
      if (resume !== undefined) updateFields.resume = resume || undefined;
      if (highestQualification !== undefined)
        updateFields.highestQualification = highestQualification || undefined;
      if (status) updateFields.status = status;

      if (Object.keys(updateFields).length > 0) {
        await Candidate.updateOne(
          { _id: candidateId },
          { $set: updateFields },
          { session }
        );
      }

      // Update skills (replace existing skills)
      if (skills) {
        await CandidateSkill.deleteMany({ candidateId }).session(session);
        const uniqueSkills = [...new Set(skills)];
        const skillDocs = uniqueSkills.map((skill) => ({
          candidateId,
          skill,
        }));
        if (skillDocs.length > 0) {
          await CandidateSkill.insertMany(skillDocs, { session });
        }
      }

      // Update stage participation
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
          // Update or create stage participant
          const updateSPFields: any = {};
          if (sp.appeared !== undefined) updateSPFields.appeared = sp.appeared;
          if (sp.qualified !== undefined)
            updateSPFields.qualified = sp.qualified;
          if (sp.score !== undefined) updateSPFields.score = sp.score;
          if (sp.feedback !== undefined)
            updateSPFields.feedback = sp.feedback || undefined;

          if (Object.keys(updateSPFields).length > 0) {
            await StageParticipant.updateOne(
              { candidateId, stageId },
              { $set: { ...updateSPFields, candidateId, stageId } },
              { upsert: true, session }
            );
          }
        }
      }

      // Log update action
      await ActivityLog.create(
        [
          {
            actorId: new mongoose.Types.ObjectId("000000000000000000000000"), // Placeholder actorId
            action: Action.Update,
            targetType: TargetType.Candidate,
            targetId: candidateId,
            details: `Updated candidate: ${name || candidate.name}`,
            timestamp: new Date(),
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Fetch updated candidate using aggregation
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
            foreignField: "candidateId",
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
          { error: "Candidate not found after update" },
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
        { status: 200 }
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error updating candidate:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE route to remove a candidate
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const validated = candidateIdSchema.safeParse(params.id);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid candidate ID", details: validated.error.errors },
        { status: 400 }
      );
    }
    const candidateId = new mongoose.Types.ObjectId(validated.data);

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch candidate name for logging using aggregation
      const candidateData = await Candidate.aggregate([
        { $match: { _id: candidateId } },
        { $project: { name: 1 } },
      ]);

      if (!candidateData || candidateData.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      const candidateName = candidateData[0].name;

      // Delete candidate (cascading deletes handled by pre("deleteOne") hook)
      const deleteResult = await Candidate.deleteOne({
        _id: candidateId,
      }).session(session);
      if (deleteResult.deletedCount === 0) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      // Log delete action
      await ActivityLog.create(
        [
          {
            actorId: new mongoose.Types.ObjectId("000000000000000000000000"), // Placeholder actorId
            action: Action.Delete,
            targetType: TargetType.Candidate,
            targetId: candidateId,
            details: `Deleted candidate: ${candidateName}`,
            timestamp: new Date(),
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return NextResponse.json(
        { message: "Candidate deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error deleting candidate:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
