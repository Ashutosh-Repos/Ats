import NextAuth, { type User, type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt-edge";
import { User as UserModel, Credential, Role } from "@/db/models";
import { IUser } from "@/db/models";
import { connectToDatabase } from "./db/connection/dbConnect";
import { emailValidation, passwordValidation } from "@/zod/commonValidations";
import { ZodError } from "zod";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
      avatar?: string | undefined;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    status: string;
    avatar?: string | undefined;
    role: string;
  }

  interface JWT {
    id: string;
    email: string;
    status: string;
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
          console.log(credentials);
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

          const user = await UserModel.findOne<IUser>({
            $and: [{ status: "verified" }, { email: identifier }],
          }).populate("roleId");
          console.log(user);
          if (!user) throw new Error("not registered");

          const credential = await Credential.findOne({ userId: user._id });
          if (!credential || !credential.password)
            throw new Error("password less, use oAuths");

          const isValidPassword = bcrypt.compareSync(
            password,
            credential.password
          );
          console.log(isValidPassword);
          if (!isValidPassword) throw new Error("invalid credentials");

          console.log("7");
          const userData: User = {
            email: user.email as string,
            id: user._id.toString() as string,
            status: user.status as string,
            role: user.roleId ? (user.roleId as any).name : "unknown",
            avatar: user.avatar,
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
      return baseUrl;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.status = token.status as string;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as User).id;
        token.role = (user as User).role;
        token.email = (user as User).email;
        token.status = (user as User).status;
        token.avatar = (user as User).avatar;
      }
      return token;
    },
    async signIn({ user, account }) {
      if (!account) return false;

      console.log(user);

      if (account.provider === "credentials") {
        return true;
      }

      await connectToDatabase();

      const existingUser = await UserModel.findOne<IUser>({
        email: user.email,
      }).populate("roleId");

      if (!existingUser) {
        const defaultRole = await Role.findOne({ name: "hiringManager" });
        if (!defaultRole) throw new Error("Default role not found");

        const newUserDoc = await UserModel.create({
          email: user.email,
          name: user.name ?? user.email?.split("@")[0] ?? "User",
          roleId: defaultRole._id,
          status: "verified",
          avatar: user.image,
          joiningDate: new Date(),
        });

        // Assert the type as IUser
        const newUser: IUser = newUserDoc as IUser;

        if (!newUser) return false;

        user.email = newUser.email;
        user.id = newUser._id.toString();
        user.status = newUser.status;
        user.avatar = newUser.avatar;
        user.role = defaultRole.name;

        return true;
      }

      user.email = existingUser.email;
      user.id = existingUser._id.toString();
      user.status = existingUser.status;
      user.avatar = existingUser.avatar;
      user.role = existingUser.roleId
        ? (existingUser.roleId as any).name
        : "unknown";

      console.log(user);

      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 24,
  },
  secret: process.env.AUTH_SECRET,
});
