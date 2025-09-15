import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      _id?: string;
      isVerified?: boolean;
      userName?: string;
      role?: "user" | "talent" | "admin";
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    _id?: string;
    isVerified?: boolean;
    isEmailVerified?:boolean
    isPendingApproval?:boolean
    isAdminApproved?:boolean
    userName?: string;
    role?: "user" | "talent" | "admin";
  }

  interface JWT {
    _id?: string;
    isVerified?: boolean;
    userName?: string;
    role?: "user" | "talent" | "admin";
    accessToken?: string;
  }
}