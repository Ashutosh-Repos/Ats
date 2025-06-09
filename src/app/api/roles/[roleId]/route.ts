import { NextResponse } from "next/server";
import { connectToDatabase } from "@/db/connection/dbConnect";
import {
  Role,
  RolePermission,
  ActivityLog,
  Permission,
  Action,
  TargetType,
} from "@/db/models";

import mongoose from "mongoose";
// PATCH /api/roles/[roleId]/permissions - Manage permissions for a role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    await connectToDatabase();

    const { roleId } = await params;
    const { permissionsToAdd, permissionsToRemove } = await request.json();

    // Validate roleId
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { error: "Invalid roleId format" },
        { status: 400 }
      );
    }

    // Validate updatedById
    // if (!updatedById || !mongoose.Types.ObjectId.isValid(updatedById)) {
    //   return NextResponse.json(
    //     { error: "Invalid or missing updatedById" },
    //     { status: 400 }
    //   );
    // }

    // Validate permissions arrays
    if (
      !Array.isArray(permissionsToAdd) ||
      !Array.isArray(permissionsToRemove)
    ) {
      return NextResponse.json(
        { error: "permissionsToAdd and permissionsToRemove must be arrays" },
        { status: 400 }
      );
    }

    // Validate Permission enum for permissionsToAdd
    const invalidAddPermissions = permissionsToAdd.filter(
      (perm: string) => !Object.values(Permission).includes(perm as Permission)
    );
    if (invalidAddPermissions.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid permissions to add: ${invalidAddPermissions.join(", ")}. Must be one of: ${Object.values(Permission).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate Permission enum for permissionsToRemove
    const invalidRemovePermissions = permissionsToRemove.filter(
      (perm: string) => !Object.values(Permission).includes(perm as Permission)
    );
    if (invalidRemovePermissions.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid permissions to remove: ${invalidRemovePermissions.join(", ")}. Must be one of: ${Object.values(Permission).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check for overlapping permissions
    const overlappingPermissions = permissionsToAdd.filter((perm: string) =>
      permissionsToRemove.includes(perm)
    );
    if (overlappingPermissions.length > 0) {
      return NextResponse.json(
        {
          error: `Permissions cannot be both added and removed: ${overlappingPermissions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if the role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Add new permissions
    const permissionsAdded: string[] = [];
    for (const permission of permissionsToAdd) {
      const existingPermission = await RolePermission.findOne({
        roleId: role._id,
        permission,
      });

      if (!existingPermission) {
        const rolePermission = new RolePermission({
          roleId: role._id,
          permission,
        });
        await rolePermission.save();
        permissionsAdded.push(permission);
      }
    }

    // Remove permissions
    const permissionsRemoved: string[] = [];
    for (const permission of permissionsToRemove) {
      const deleted = await RolePermission.findOneAndDelete({
        roleId: role._id,
        permission,
      });
      if (deleted) {
        permissionsRemoved.push(permission);
      }
    }

    // Log the permission management activity
    // if (permissionsAdded.length > 0 || permissionsRemoved.length > 0) {
    //   const details = [];
    //   if (permissionsAdded.length > 0) {
    //     details.push(`Added permissions: ${permissionsAdded.join(", ")}`);
    //   }
    //   if (permissionsRemoved.length > 0) {
    //     details.push(`Removed permissions: ${permissionsRemoved.join(", ")}`);
    //   }

    //   await ActivityLog.create({
    //     actorId: updatedById,
    //     action: Action.Update,
    //     targetType: TargetType.User,
    //     targetId: role._id,
    //     details: `Updated permissions for role ${role.name}: ${details.join("; ")}`,
    //     timestamp: new Date(),
    //   });
    // }

    return NextResponse.json({
      message: "Permissions updated successfully",
      permissionsAdded,
      permissionsRemoved,
    });
  } catch (error: unknown) {
    console.error("Error managing permissions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
