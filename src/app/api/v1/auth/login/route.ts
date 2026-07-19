import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { comparePassword, hashPassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Ensure the Youssef@allurite.com SuperAdmin exists in the database
    const youssefEmail = "youssef@allurite.com";
    const youssefUser = await User.findOne({ email: youssefEmail });
    if (!youssefUser) {
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "Youssef2005";
      const hashedPassword = await hashPassword(initialPassword);
      await User.create({
        email: youssefEmail,
        passwordHash: hashedPassword,
        role: "SuperAdmin",
        status: "Active",
      });
      console.log(`Seeded youssef@allurite.com superadmin account`);
    }

    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Email and password are required and must be strings",
          },
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 }
      );
    }

    // Lockout verification check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainSecs = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_LOCKED",
            message: `Too many login attempts. Please try again in ${remainSecs} seconds.`,
          },
        },
        { status: 403 }
      );
    }

    if (user.status !== "Active") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_SUSPENDED",
            message: `Your account is currently ${user.status.toLowerCase()}`,
          },
        },
        { status: 403 }
      );
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      // Load lockout policies from CompanySettings
      let maxAttempts = 5;
      try {
        const CompanySettings = require("@/models/CompanySettings").default;
        const settings = await CompanySettings.findOne({ key: "global_settings" });
        if (settings && settings.maxLoginAttempts) {
          maxAttempts = settings.maxLoginAttempts;
        }
      } catch (e) {
        console.error("Failed to load max attempts setting:", e);
      }

      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= maxAttempts) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await user.save();

      await logAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        entityType: "User",
        entityId: user._id,
        details: `Failed login attempt for user: ${email}. Attempt count: ${user.loginAttempts}`,
        performedBy: user._id,
        performedEmail: user.email,
        performedRole: user.role,
        severity: "High",
      }, request);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 }
      );
    }

    // Success login: reset attempts
    user.loginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        email: user.email,
        role: user.role,
      },
    });

    // Set JWT token in an HTTP-Only cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 2, // 2 hours
      path: "/",
    });

    // Log the successful login event
    await logAuditEvent({
      action: "AUTH_LOGIN_SUCCESS",
      entityType: "User",
      entityId: user._id,
      details: `Successful user authentication login: ${email}`,
      performedBy: user._id,
      performedEmail: user.email,
      performedRole: user.role,
      severity: "Low",
    }, request);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
