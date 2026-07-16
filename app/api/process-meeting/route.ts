import { NextResponse } from "next/server";
import { extractMeetingOutputs } from "@/lib/extract-meeting";
import { saveMeetingToDatabase } from "@/lib/save-meeting";
import {
  saveSpeakerData,
  type SpeakerData,
} from "@/lib/save-speaker-data";

export const runtime = "nodejs";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const transcript =
      typeof body.transcript === "string"
        ? body.transcript.trim()
        : "";

    const meetingDate =
      typeof body.meetingDate === "string"
        ? body.meetingDate.trim()
        : "";

    const meetingType =
      typeof body.meetingType === "string"
        ? body.meetingType
        : "online";

    if (!title) {
      return NextResponse.json(
        { error: "Meeting title is required." },
        { status: 400 },
      );
    }

    if (transcript.length < 50) {
      return NextResponse.json(
        { error: "The transcript is too short." },
        { status: 400 },
      );
    }

    const result = await extractMeetingOutputs({
      title,
      meetingDate,
      meetingType,
      transcript,
    });

    const meetingId = await saveMeetingToDatabase({
      title,
      meetingDate,
      meetingType,
      transcript,
      output: result,
    });

    if (
      isRecord(body.speakerData) &&
      Array.isArray(
        body.speakerData.utterances,
      ) &&
      Array.isArray(
        body.speakerData.mappings,
      )
    ) {
      await saveSpeakerData(
        meetingId,
        body.speakerData as unknown as SpeakerData,
      );
    }

    return NextResponse.json({
      meetingId,
      ...result,
    });
  } catch (error) {
    console.error(
      "Meeting processing failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Meeting processing failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
