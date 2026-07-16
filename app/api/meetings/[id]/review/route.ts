import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const allowedPriorities = ["unspecified", "low", "medium", "high"];
const allowedTaskStatuses = ["To Do", "In Progress", "Done"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const requestedStatus =
      body.status === "confirmed"
        ? "confirmed"
        : "ready_for_review";

    const detailedSummary = isRecord(body.detailedSummary)
      ? body.detailedSummary
      : {};

    const tasks = Array.isArray(body.tasks)
      ? body.tasks
          .filter(isRecord)
          .map((task) => ({
            meeting_id: id,
            title: asString(task.title, "Untitled task"),
            description: asString(task.description),
            owner_text: asString(task.owner, "Unassigned"),
            deadline_text: asString(
              task.deadline,
              "Not specified",
            ),
            priority: allowedPriorities.includes(
              asString(task.priority),
            )
              ? asString(task.priority)
              : "medium",
            status: allowedTaskStatuses.includes(
              asString(task.status),
            )
              ? asString(task.status)
              : "To Do",
            source_timestamp: asNullableString(
              task.sourceTimestamp,
            ),
          }))
      : [];

    const decisions = Array.isArray(body.decisions)
      ? body.decisions
          .filter(isRecord)
          .map((decision) => ({
            meeting_id: id,
            text: asString(
              decision.text,
              "Decision not specified",
            ),
            topic: asString(decision.topic, "General"),
            source_timestamp: asNullableString(
              decision.timestamp,
            ),
          }))
      : [];

    const supabase = getSupabaseAdmin();

    const { data: existingMeeting, error: meetingLookupError } =
      await supabase
        .from("meetings")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (meetingLookupError) {
      throw new Error(meetingLookupError.message);
    }

    if (!existingMeeting) {
      return NextResponse.json(
        { error: "Meeting not found." },
        { status: 404 },
      );
    }

    const { error: outputError } = await supabase
      .from("generated_outputs")
      .upsert(
        {
          meeting_id: id,
          short_summary: asString(body.shortSummary),
          detailed_summary: {
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
          follow_up_email: asString(body.followUpEmail),
          project_status_update: asString(
            body.projectStatusUpdate,
          ),
          open_questions: asStringArray(body.openQuestions),
          risks: asStringArray(body.risks),
          blockers: asStringArray(body.blockers),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "meeting_id",
        },
      );

    if (outputError) {
      throw new Error(
        `Could not save meeting output: ${outputError.message}`,
      );
    }

    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("meeting_id", id);

    if (deleteTasksError) {
      throw new Error(
        `Could not replace tasks: ${deleteTasksError.message}`,
      );
    }

    if (tasks.length > 0) {
      const { error: insertTasksError } = await supabase
        .from("tasks")
        .insert(tasks);

      if (insertTasksError) {
        throw new Error(
          `Could not save tasks: ${insertTasksError.message}`,
        );
      }
    }

    const { error: deleteDecisionsError } = await supabase
      .from("decisions")
      .delete()
      .eq("meeting_id", id);

    if (deleteDecisionsError) {
      throw new Error(
        `Could not replace decisions: ${deleteDecisionsError.message}`,
      );
    }

    if (decisions.length > 0) {
      const { error: insertDecisionsError } = await supabase
        .from("decisions")
        .insert(decisions);

      if (insertDecisionsError) {
        throw new Error(
          `Could not save decisions: ${insertDecisionsError.message}`,
        );
      }
    }

    const { error: statusError } = await supabase
      .from("meetings")
      .update({
        status: requestedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (statusError) {
      throw new Error(
        `Could not update meeting status: ${statusError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      status: requestedStatus,
    });
  } catch (error) {
    console.error("Meeting review update failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save meeting review.",
      },
      { status: 500 },
    );
  }
}

