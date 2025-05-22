import { NextRequest, NextResponse } from "next/server";
import { userSchema } from "@/zod/userSchema";
import { UserModel } from "@/db/models/Users";
import { connectToDatabase } from "@/db/connection/dbConnect";
import bcrypt from "bcrypt-edge";
import hyperid from "hyperid";
import nodemailer from "nodemailer";
import EmailVerify from "@/components/template/EmailVerify";
import { render } from "@react-email/components";
import { ZodError } from "zod";
import { MongoError } from "mongodb";

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
      from: "ashu9226kumar@gmail.com",
      to: toEmail,
      subject: "Email Verification",
      html: htmlEmail,
    };
    const info = await transporter.sendMail(options);
    console.log("info log");
    console.log(info);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send verification email");
  }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    await connectToDatabase();
    console.log("after db");
    const body = await request.json();
    console.log("after json");
    console.log(body);

    const { email, password, age, name } = await userSchema.parseAsync(body);
    if (!password || !password.trim()) throw new Error("password required");

    console.log("after parsing");

    const existingUser = await UserModel.findOne({ email: email });
    if (existingUser?.verified) {
      return NextResponse.json({
        success: false,
        message: "User with this email already exists",
      });
    }
    console.log("1");
    const hashedPassword = bcrypt.hashSync(password as string, 10);
    const code = hyperid({ urlSafe: true }).uuid;
    console.log("2");

    if (existingUser) {
      Object.assign(existingUser, {
        name,
        password: hashedPassword,
        age,
        verifyCode: code,
      });
      await existingUser.save();
      console.log("3");
      await sendVerificationEmail(email, name, code);
      console.log("4");

      return NextResponse.json({
        success: true,
        message: "Verification code resent to email",
      });
    }

    // Create new user if not found
    console.log("5");
    const newUser = await UserModel.create({
      name: name,
      email: email,
      password: hashedPassword,
      age: age,
      role: "hr",
      verified: false,
      verifyCode: code,
    });
    console.log("6");
    if (!newUser) throw new Error("unable to create new user server error");
    console.log("7");
    await sendVerificationEmail(email, name, code);
    console.log("8");
    return NextResponse.json({
      success: true,
      message:
        "User created successfully, verification link sent (valid for 1 hour)",
      data: {
        ...newUser,
        password: undefined,
        verifyCode: undefined,
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
          error: "Invalid data format",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

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

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
};
