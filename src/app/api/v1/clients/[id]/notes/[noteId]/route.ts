import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Client from "@/models/Client";
import { verifyClientAccess } from "@/lib/client-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
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

    const { id, noteId } = await params;
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

    // Scoping check: Employees can only delete notes belonging to their own assigned clients
    if (auth.role === "Employee" && client.assignedAgent.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to manage notes for this client",
          },
        },
        { status: 403 }
      );
    }

    // Find note in client profile
    const note = client.notes.id(noteId);
    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Deletion permissions: only note creator or SuperAdmin can delete
    if (auth.role !== "SuperAdmin" && note.createdBy.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only delete notes you have authored",
          },
        },
        { status: 403 }
      );
    }

    // Remove the note subdocument
    (note as any).deleteOne();
    await client.save();

    return NextResponse.json({
      success: true,
      data: client.notes,
    });
  } catch (error: any) {
    console.error("Delete client note error:", error);
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
