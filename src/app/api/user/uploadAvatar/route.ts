import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import fs from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import { MongoError } from "mongodb";
import sharp from "sharp";
import { UserModel } from "@/db/models/Users";
import { connectToDatabase } from "@/db/connection/dbConnect";

// Allowed image types and maximum file size (in bytes)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDNAME as string,
  api_key: process.env.CLOUDAPIKEY as string,
  api_secret: process.env.CLOUDSECRET as string,
});

// Upload file to Cloudinary
const uploadToCloudinary = async (filePath: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image", // Force image resource type
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload failed: ${error}`);
    throw new Error("Failed to upload to Cloudinary");
  }
};

// Validate image aspect ratio (1:1)
const validateImageAspectRatio = async (filePath: string): Promise<void> => {
  const metadata = await sharp(filePath).metadata();
  if (metadata.width !== metadata.height) {
    throw new Error("Image must have a 1:1 aspect ratio.");
  }
};

// Main handler for POST request
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  let inputFilePath: string | null = null;

  try {
    // Establish DB connection
    await connectToDatabase();

    // Parse form data
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    const file = formData.get("avatar") as File | null;

    // Validate user ID
    if (!id) {
      throw new Error("User ID is required.");
    }

    // Validate file existence and type
    if (!file) {
      throw new Error("File is required.");
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        "Invalid file type. Only JPEG, PNG, and WEBP images are allowed."
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      );
    }

    // Generate unique filename
    const uniqueFilename = `${path.basename(file.name, path.extname(file.name))}-${randomUUID()}${path.extname(file.name)}`;
    inputFilePath = path.join("public/temp/uploads", uniqueFilename);

    // Write the file to the temporary location
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(inputFilePath, Buffer.from(arrayBuffer));

    // Validate image aspect ratio (1:1)
    await validateImageAspectRatio(inputFilePath);

    // Upload to Cloudinary
    const url = await uploadToCloudinary(inputFilePath);
    if (!url) {
      throw new Error("Failed to upload file to Cloudinary.");
    }

    // Update user avatar in the database
    const dbres = await UserModel.findByIdAndUpdate(
      id,
      { avatar: url },
      { new: true }
    );
    if (!dbres) {
      throw new Error("Failed to update avatar in the database.");
    }

    // Successful response
    return NextResponse.json(
      { success: true, message: "Avatar updated successfully", data: { url } },
      { status: 201 }
    );
  } catch (error) {
    // MongoDB-specific error handling
    if (error instanceof MongoError) {
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // General error handling
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Catch-all for unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  } finally {
    // Ensure file is deleted after processing
    if (inputFilePath) {
      try {
        await fs.unlink(inputFilePath);
      } catch (unlinkError) {
        console.error(`Failed to delete file: ${unlinkError}`);
      }
    }
  }
};
