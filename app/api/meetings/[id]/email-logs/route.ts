import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("email_send_logs")
      .select("*")
      .eq("meeting_id", id)
      .order("sent_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      logs: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load email history.",
      },
      { status: 500 },
    );
  }
}
