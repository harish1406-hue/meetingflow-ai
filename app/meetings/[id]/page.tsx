import { notFound } from "next/navigation";
import MeetingReviewClient from "@/components/MeetingReviewClient";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string",
  );
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [
    { data: meeting, error: meetingError },
    { data: output, error: outputError },
    { data: tasks, error: tasksError },
    { data: decisions, error: decisionsError },
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("generated_outputs")
      .select("*")
      .eq("meeting_id", id)
      .maybeSingle(),

    supabase
      .from("tasks")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at", { ascending: true }),

    supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (
    meetingError ||
    outputError ||
    tasksError ||
    decisionsError
  ) {
    throw new Error(
      meetingError?.message ||
        outputError?.message ||
        tasksError?.message ||
        decisionsError?.message ||
        "Could not load meeting.",
    );
  }

  if (!meeting) {
    notFound();
  }

  const detailedSummary = isRecord(
    output?.detailed_summary,
  )
    ? output.detailed_summary
    : {};

  return (
    <MeetingReviewClient
      meeting={{
        id: meeting.id,
        title: meeting.title,
        meetingDate: meeting.meeting_date,
        meetingType: meeting.meeting_type,
        status: meeting.status,
        rawTranscript: meeting.raw_transcript,
      }}
      output={{
        shortSummary: asString(output?.short_summary),

        detailedSummary: {
          meetingPurpose: asString(
            detailedSummary.meetingPurpose,
          ),

          mainDiscussionPoints: asStringArray(
            detailedSummary.mainDiscussionPoints,
          ),

          nextSteps: asStringArray(
            detailedSummary.nextSteps,
          ),
        },

        followUpEmail: asString(
          output?.follow_up_email,
        ),

        projectStatusUpdate: asString(
          output?.project_status_update,
        ),

        openQuestions: asStringArray(
          output?.open_questions,
        ),

        risks: asStringArray(output?.risks),
        blockers: asStringArray(output?.blockers),
      }}
      initialTasks={(tasks ?? []).map((task) => ({
        title: task.title,
        description: task.description,
        owner: task.owner_text,
        deadline: task.deadline_text,
        priority: task.priority,
        status: task.status,
        sourceTimestamp: task.source_timestamp,
      }))}
      initialDecisions={(decisions ?? []).map(
        (decision) => ({
          text: decision.text,
          topic: decision.topic,
          timestamp: decision.source_timestamp,
        }),
      )}
    />
  );
}
