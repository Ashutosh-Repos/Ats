import { NextRequest, NextResponse } from "next/server";
import { userSchema } from "@/zod/userSchema";
import { User, Credential, Role } from "@/db/models"; // Import from your models file
import { connectToDatabase } from "@/db/connection/dbConnect";
import bcrypt from "bcrypt-edge";
import hyperid from "hyperid";
import nodemailer from "nodemailer";
import EmailVerify from "@/components/template/EmailVerify";
import { render } from "@react-email/components";
import { ZodError } from "zod";
import { MongoServerError } from "mongodb";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.DOMAIN_EMAIL,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendVerificationEmail = async (
  toEmail: string,
  fullname: string,
  verifyCode: string
): Promise<void> => {
  try {
    const htmlEmail = await render(
      EmailVerify({ name: fullname, verifyCode: verifyCode })
    );
    const options = {
      from: process.env.DOMAIN_EMAIL || "ashu9226kumar@gmail.com",
      to: toEmail,
      subject: "Email Verification",
      html: htmlEmail,
    };
    const info = await transporter.sendMail(options);
    console.log("Email sent:", info.messageId);
  } catch (error: unknown) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send verification email");
  }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { email, password, name, roleName } =
      await userSchema.parseAsync(body);
    if (!password || !password.trim()) throw new Error("Password is required");

    // Find default role (e.g., hiringManager)

    const role = await Role.findOne({ name: roleName });
    if (!role) throw new Error(`${roleName} role not found`);

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.status === "verified") {
      return NextResponse.json(
        {
          success: false,
          message: "User with this email already exists and is verified",
        },
        { status: 400 }
      );
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const verifyCode = hyperid({ urlSafe: true }).uuid;

    if (existingUser) {
      // Update existing unverified user
      const existingCredential = await Credential.findOne({
        userId: existingUser._id,
      });
      if (!existingCredential)
        throw new Error("Credential not found for existing user");

      existingUser.name = name;
      existingCredential.password = hashedPassword;
      existingCredential.verifyCode = verifyCode;

      await Promise.all([existingUser.save(), existingCredential.save()]);
      await sendVerificationEmail(email, name, verifyCode);

      return NextResponse.json({
        success: true,
        message: "Verification code resent to email",
      });
    }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      roleId: role._id,
      status: "unverified",
      joiningDate: new Date(),
    });

    const newCredential = await Credential.create({
      userId: newUser._id,
      password: hashedPassword,
      verifyCode,
    });

    if (!newUser || !newCredential) {
      throw new Error("Failed to create user or credential");
    }

    await sendVerificationEmail(email, name, verifyCode);

    return NextResponse.json({
      success: true,
      message:
        "User created successfully, verification link sent (valid for 1 hour)",
      data: {
        name: newUser.name,
        email: newUser.email,
        status: newUser.status,
        joiningDate: newUser.joiningDate,
      },
    });
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
      if (error.code === 11000) {
        return NextResponse.json(
          {
            success: false,
            message: "Email already exists",
          },
          { status: 400 }
        );
      }
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
        { status: 500 }
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
