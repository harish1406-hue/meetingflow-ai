import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const allowedStatuses = [
  "To Do",
  "In Progress",
  "Done",
];

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("status" in body) ||
      typeof body.status !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid status is required." },
        { status: 400 },
      );
    }

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Unsupported task status." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tasks")
      .update({
        status: body.status,
      })
      .eq("id", id)
      .select("id,status")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      task: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update task.",
      },
      { status: 500 },
    );
  }
}
