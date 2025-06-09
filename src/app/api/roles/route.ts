import { NextResponse } from "next/server";
import { connectToDatabase } from "@/db/connection/dbConnect";
import { Role, ActivityLog, RoleName, Action, TargetType } from "@/db/models";
import mongoose from "mongoose";

// POST /api/roles - Add a new role
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const { name, description } = await request.json();

    // Validate inputs
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name, description, and createdById are required" },
        { status: 400 }
      );
    }

    // Validate RoleName enum
    if (!Object.values(RoleName).includes(name as RoleName)) {
      return NextResponse.json(
        {
          error: `Invalid role name. Must be one of: ${Object.values(RoleName).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate createdById format
    // if (!mongoose.Types.ObjectId.isValid(createdById)) {
    //   return NextResponse.json(
    //     { error: "Invalid createdById format" },
    //     { status: 400 }
    //   );
    // }

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return NextResponse.json(
        { error: `Role with name '${name}' already exists` },
        { status: 409 }
      );
    }

    // Create new role
    const role = new Role({
      name,
      description,
    });

    await role.save();

    // Log the role creation activity
    // await ActivityLog.create({
    //   actorId: createdById,
    //   action: Action.Create,
    //   targetType: TargetType.User,
    //   targetId: role._id,
    //   details: `Created role: ${role.name}`,
    //   timestamp: new Date(),
    // });

    return NextResponse.json(
      { message: "Role created successfully", role },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
