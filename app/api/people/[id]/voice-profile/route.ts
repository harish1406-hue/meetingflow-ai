import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { error: profileError } = await supabase
      .from("voice_profiles")
      .update({
        profile_data: "",
        consent_status: "deleted",
        deleted_at: now,
        updated_at: now,
      })
      .eq("person_id", id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: personError } = await supabase
      .from("people")
      .update({
        voice_profile_status: "deleted",
        updated_at: now,
      })
      .eq("id", id);

    if (personError) {
      throw new Error(personError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete voice profile.",
      },
      { status: 500 },
    );
  }
}