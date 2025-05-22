// import NextAuth, { CredentialsSignin } from "next-auth";
import NextAuth, { type User, type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt-edge";
import { UserModel } from "./db/models/Users";
import { Iuser } from "./db/models/Users";
import { connectToDatabase } from "./db/connection/dbConnect";
import { emailValidation, passwordValidation } from "@/zod/commonValidations";

import { ZodError } from "zod";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      role: string;
      verified: boolean;
      avatar?: string | undefined;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    verified: boolean;
    avatar?: string | undefined;
    role: string;
  }

  interface JWT {
    id: string;
    email: string;
    verified: boolean;
    avatar?: string | undefined;
    role: string;
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    GitHub,
    Google,
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (
        credentials: Partial<Record<"identifier" | "password", unknown>>
      ) => {
        try {
          if (
            typeof credentials?.identifier !== "string" ||
            typeof credentials?.password !== "string"
          ) {
            throw new Error("Invalid credentials format");
          }
          await connectToDatabase();
          console.log("1");
          if (!credentials) throw new Error("unable to get credentials");
          console.log(credentials);

          const parseResult =
            passwordValidation.safeParse(credentials.password).success &&
            emailValidation.safeParse(credentials.identifier).success;

          if (!parseResult) {
            throw new Error("invalid email");
          }
          console.log(credentials);
          console.log(3);
          const { identifier, password } = credentials;

          console.log(4);

          const user = await UserModel.findOne<Iuser>({
            $and: [{ verified: true }, { email: identifier }],
          });
          console.log(user);
          if (!user) throw new Error("not registered");
          if (!user?.password) throw new Error("password less, use oAuths");

          const isValidPassword = bcrypt.compareSync(password, user.password);
          console.log(isValidPassword);
          if (!isValidPassword) throw new Error("invalid credentials");

          console.log("7");
          const userData: User = {
            email: user.email as string,
            id: user._id.toString() as string,
            verified: user.verified as boolean,
            role: user.role as string,
          };

          console.log("8");
          return userData;
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            console.error("Validation error:", error.errors);
          } else if (error instanceof Error) {
            console.error("Authorization error:", error.message);
          } else {
            console.error("Unknown error during authorization");
          }
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/login",
  },
  callbacks: {
    async redirect({ baseUrl }) {
      return baseUrl; // ✅ this is correct
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.verified = token.verified as boolean;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as User).id;
        token.role = (user as User).role;
        token.email = (user as User).email;
        token.verified = (user as User).verified;
        token.avatar = (user as User).avatar;
      }
      return token;
    },

    async signIn({ user, account }) {
      if (!account) return false;

      console.log(user);

      if (account.provider === "credentials") {
        // Skip registration logic for credentials
        return true;
      }

      // OAuth logic (Google, GitHub, etc.)
      await connectToDatabase();

      const existingUser = await UserModel.findOne<Iuser>({
        email: user.email,
      });

      if (!existingUser) {
        const newUser: Iuser = await UserModel.create<Iuser>({
          email: user.email,
          name: user.name ?? user.email?.split("@")[0] ?? "User",
          role: "hr",
          password: null,
          verified: true,
          avatar: user.image,
          // optionally set avatar or other fields here
        });
        if (!newUser) return false;

        user.email = newUser.email;
        user.id = newUser._id.toString();
        user.verified = newUser.verified;
        user.avatar = newUser.avatar;
        user.role = newUser.role;

        return true;
      }

      user.email = existingUser.email;
      user.id = existingUser._id.toString();
      user.verified = existingUser.verified;
      user.avatar = existingUser.avatar;
      user.role = existingUser.role;

      console.log(user);

      return true;
    },
    // authorized: async ({ auth }) => {
    //   return !!auth;
    // },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 24,
  },

  secret: process.env.AUTH_SECRET,
});
