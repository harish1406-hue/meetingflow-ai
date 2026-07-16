import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    assemblyAI: Boolean(
      process.env.ASSEMBLYAI_API_KEY,
    ),
    supabase: Boolean(
      process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    resend: Boolean(
      process.env.RESEND_API_KEY &&
        process.env.RESEND_FROM,
    ),
    databaseReachable: false,
  };

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("meetings")
      .select("id")
      .limit(1);

    checks.databaseReachable = !error;
  } catch {
    checks.databaseReachable = false;
  }

  const healthy =
    checks.openai &&
    checks.assemblyAI &&
    checks.supabase &&
    checks.resend &&
    checks.databaseReachable;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}