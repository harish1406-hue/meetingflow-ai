import { getSupabaseAdmin } from "./supabase-server";
import type { MeetingOutput } from "./extract-meeting";

type SaveMeetingInput = {
  title: string;
  meetingDate: string;
  meetingType: string;
  transcript: string;
  output: MeetingOutput;
};

export async function saveMeetingToDatabase(
  input: SaveMeetingInput,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: meeting, error: meetingError } =
    await supabase
      .from("meetings")
      .insert({
        title: input.title,
        meeting_date: input.meetingDate || null,
        meeting_type: input.meetingType,
        status: "ready_for_review",
        raw_transcript: input.transcript,
      })
      .select("id")
      .single();

  if (meetingError || !meeting) {
    throw new Error(
      `Could not save meeting: ${
        meetingError?.message || "Unknown database error"
      }`,
    );
  }

  const meetingId = meeting.id as string;

  const { error: outputError } = await supabase
    .from("generated_outputs")
    .insert({
      meeting_id: meetingId,
      short_summary: input.output.shortSummary,
      detailed_summary: input.output.detailedSummary,
      follow_up_email: input.output.followUpEmail,
      project_status_update:
        input.output.projectStatusUpdate,
      open_questions: input.output.openQuestions,
      risks: input.output.risks,
      blockers: input.output.blockers,
    });

  if (outputError) {
    throw new Error(
      `Could not save generated output: ${outputError.message}`,
    );
  }

  if (input.output.tasks.length > 0) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .insert(
        input.output.tasks.map((task) => ({
          meeting_id: meetingId,
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

  if (input.output.decisions.length > 0) {
    const { error: decisionsError } = await supabase
      .from("decisions")
      .insert(
        input.output.decisions.map((decision) => ({
          meeting_id: meetingId,
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

  return meetingId;
}
