import { AssemblyAI } from "assemblyai";
import { randomUUID } from "node:crypto";
import {
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  analyzeSpeakerVoice,
  type StoredVoiceProfile,
} from "@/lib/local-voice";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const supportedExtensions = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".mp4",
  ".mov",
  ".webm",
  ".ogg",
  ".aac",
]);

export async function POST(request: Request) {
  let temporaryFilePath = "";

  try {
    const assemblyKey =
      process.env.ASSEMBLYAI_API_KEY;

    if (!assemblyKey) {
      return NextResponse.json(
        {
          error:
            "ASSEMBLYAI_API_KEY is missing.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Choose an audio or video file.",
        },
        { status: 400 },
      );
    }

    const extension =
      path.extname(uploadedFile.name).toLowerCase() ||
      ".mp3";

    if (!supportedExtensions.has(extension)) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 },
      );
    }

    temporaryFilePath = path.join(
      os.tmpdir(),
      `${randomUUID()}${extension}`,
    );

    await writeFile(
      temporaryFilePath,
      Buffer.from(
        await uploadedFile.arrayBuffer(),
      ),
    );

    const parsedSpeakerCount = Number(
      formData.get("expectedSpeakers"),
    );

    const expectedSpeakers =
      Number.isInteger(parsedSpeakerCount)
        ? Math.min(
            8,
            Math.max(1, parsedSpeakerCount),
          )
        : 2;

    const assemblyAI = new AssemblyAI({
      apiKey: assemblyKey,
    });

    const transcript =
      await assemblyAI.transcripts.transcribe({
        audio: temporaryFilePath,
        language_detection: true,
        speaker_labels: true,
        speakers_expected: expectedSpeakers,
      });

    if (transcript.status === "error") {
      throw new Error(
        transcript.error ||
          "AssemblyAI transcription failed.",
      );
    }

    const utterances = (
      transcript.utterances ?? []
    ).map((utterance, index) => ({
      id: `${utterance.speaker}-${index}`,
      speaker: utterance.speaker || "Unknown",
      text: utterance.text || "",
      start:
        typeof utterance.start === "number"
          ? utterance.start
          : 0,
      end:
        typeof utterance.end === "number"
          ? utterance.end
          : 0,
      confidence:
        typeof utterance.confidence === "number"
          ? utterance.confidence
          : null,
    }));

    const supabase =
      getSupabaseAdmin();

    const [
      { data: profileRows },
      { data: peopleRows },
    ] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("person_id,profile_data")
        .is("deleted_at", null)
        .eq(
          "consent_status",
          "confirmed",
        ),

      supabase
        .from("people")
        .select("id,name,email,role"),
    ]);

    const peopleMap = new Map(
      (peopleRows ?? []).map(
        (person) => [
          person.id,
          person,
        ],
      ),
    );

    const storedProfiles: StoredVoiceProfile[] =
      (profileRows ?? [])
        .map((profile) => {
          const person = peopleMap.get(
            profile.person_id,
          );

          if (
            !person ||
            !profile.profile_data
          ) {
            return null;
          }

          return {
            personId: person.id,
            name: person.name,
            email: person.email,
            role: person.role,
            profileJson:
              profile.profile_data,
          };
        })
        .filter(
          (
            profile,
          ): profile is StoredVoiceProfile =>
            profile !== null,
        );

    const voiceResults: Record<
      string,
      Awaited<
        ReturnType<
          typeof analyzeSpeakerVoice
        >
      >
    > = {};

    const speakers = Array.from(
      new Set(
        utterances.map(
          (utterance) =>
            utterance.speaker,
        ),
      ),
    );

    for (const speaker of speakers) {
      voiceResults[speaker] =
        await analyzeSpeakerVoice(
          temporaryFilePath,
          utterances.filter(
            (utterance) =>
              utterance.speaker === speaker,
          ),
          storedProfiles,
        );
    }

    return NextResponse.json({
      transcriptId: transcript.id,
      languageCode:
        transcript.language_code ?? null,
      audioDuration:
        transcript.audio_duration ?? null,
      fullText: transcript.text ?? "",
      utterances,
      voiceResults,
      voiceProfileWarning:
        "Voice matching uses a local MFCC similarity prototype. It is suitable for demonstrating suggested matches, not for identity authentication.",
    });
  } catch (error) {
    console.error(
      "Audio transcription failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Audio transcription failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      { status: 500 },
    );
  } finally {
    if (temporaryFilePath) {
      try {
        await unlink(temporaryFilePath);
      } catch {
        // Temporary file is already unavailable.
      }
    }
  }
}
