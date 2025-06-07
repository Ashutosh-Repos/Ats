import { NextRequest, NextResponse } from "next/server";
import { User, Credential, UserStatus } from "@/db/models"; // Import UserStatus enum
import { ZodError } from "zod";
import { MongoServerError } from "mongodb";
import { connectToDatabase } from "@/db/connection/dbConnect";

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const verifyCode = searchParams.get("verifyCode");

    if (!verifyCode) {
      throw new Error("Verification code is required.");
    }

    // Find credential by verifyCode
    const credential = await Credential.findOne({ verifyCode });
    if (!credential) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification link.",
        },
        { status: 400 }
      );
    }

    // Check if verification code is within 1-hour validity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (credential.createdAt < oneHourAgo) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification link has expired.",
        },
        { status: 400 }
      );
    }

    // Find corresponding user
    const user = await User.findById(credential.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    // Update user status to verified and clear verifyCode
    user.status = UserStatus.Verified; // Use enum value
    credential.verifyCode = undefined;

    await Promise.all([user.save(), credential.save()]);

    return NextResponse.json(
      {
        success: true,
        message: "User verified successfully",
        data: { id: user._id },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const fieldErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        {
          success: false,
          message: "Invalid data format",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    if (error instanceof MongoServerError) {
      return NextResponse.json(
        {
          success: false,
          message: "Database error",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
};
