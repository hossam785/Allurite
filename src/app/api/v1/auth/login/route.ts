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
      const hashedPassword = await hashPassword("Youssef2005");
      await User.create({
        email: youssefEmail,
        passwordHash: hashedPassword,
        role: "SuperAdmin",
        status: "Active",
      });
      console.log(`Seeded youssef@allurite.com superadmin account`);
    } else {
      const matches = await comparePassword("Youssef2005", youssefUser.passwordHash);
      if (!matches) {
        youssefUser.passwordHash = await hashPassword("Youssef2005");
        await youssefUser.save();
        console.log("Updated Youssef@allurite.com password in database");
      }
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Email and password are required",
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
      await logAuditEvent({
        action: "AUTH_LOGIN_FAILED",
        entityType: "User",
        entityId: user._id,
        details: `Failed login attempt for user: ${email}`,
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
