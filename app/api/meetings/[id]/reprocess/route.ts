import { NextResponse } from "next/server";
import { extractMeetingOutputs } from "@/lib/extract-meeting";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: meeting, error: meetingError } =
      await supabase
        .from("meetings")
        .select(
          "id,title,meeting_date,meeting_type,raw_transcript",
        )
        .eq("id", id)
        .maybeSingle();

    if (meetingError) {
      throw new Error(meetingError.message);
    }

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found." },
        { status: 404 },
      );
    }

    const result = await extractMeetingOutputs({
      title: meeting.title,
      meetingDate: meeting.meeting_date || "",
      meetingType: meeting.meeting_type,
      transcript: meeting.raw_transcript,
    });

    const { error: outputError } = await supabase
      .from("generated_outputs")
      .upsert(
        {
          meeting_id: id,
          short_summary: result.shortSummary,
          detailed_summary: result.detailedSummary,
          follow_up_email: result.followUpEmail,
          project_status_update:
            result.projectStatusUpdate,
          open_questions: result.openQuestions,
          risks: result.risks,
          blockers: result.blockers,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "meeting_id",
        },
      );

    if (outputError) {
      throw new Error(
        `Could not update output: ${outputError.message}`,
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

    if (result.tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(
          result.tasks.map((task) => ({
            meeting_id: id,
            title: task.title,
            description: task.description,
            owner_text: task.owner,
            deadline_text: task.deadline,
            priority: task.priority,
            status: task.status,
            source_timestamp: task.sourceTimestamp,
          })),
        );

      if (tasksError) {
        throw new Error(
          `Could not save tasks: ${tasksError.message}`,
        );
      }
    }

    const { error: deleteDecisionsError } =
      await supabase
        .from("decisions")
        .delete()
        .eq("meeting_id", id);

    if (deleteDecisionsError) {
      throw new Error(
        `Could not replace decisions: ${deleteDecisionsError.message}`,
      );
    }

    if (result.decisions.length > 0) {
      const { error: decisionsError } = await supabase
        .from("decisions")
        .insert(
          result.decisions.map((decision) => ({
            meeting_id: id,
            text: decision.text,
            topic: decision.topic,
            source_timestamp: decision.timestamp,
          })),
        );

      if (decisionsError) {
        throw new Error(
          `Could not save decisions: ${decisionsError.message}`,
        );
      }
    }

    const { error: meetingUpdateError } =
      await supabase
        .from("meetings")
        .update({
          status: "ready_for_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (meetingUpdateError) {
      throw new Error(meetingUpdateError.message);
    }

    return NextResponse.json({
      success: true,
      meetingId: id,
      taskCount: result.tasks.length,
      decisionCount: result.decisions.length,
      tasks: result.tasks,
    });
  } catch (error) {
    console.error("Meeting reprocessing failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Meeting reprocessing failed.",
      },
      { status: 500 },
    );
  }
}
