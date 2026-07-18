import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Client from "@/models/Client";
import { verifyClientAccess } from "@/lib/client-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Note content cannot be empty",
          },
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "Client profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only add notes to their own clients
    if (auth.role === "Employee" && client.assignedAgent.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to add notes for this client",
          },
        },
        { status: 403 }
      );
    }

    // Append note subdocument
    client.notes.push({
      content: content.trim(),
      createdBy: auth.user._id,
      creatorEmail: auth.user.email,
    } as any);

    await client.save();

    return NextResponse.json({
      success: true,
      data: client.notes,
    });
  } catch (error: any) {
    console.error("Add client note error:", error);
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
