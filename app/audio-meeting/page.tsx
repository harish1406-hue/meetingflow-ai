"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppSidebar from "@/components/AppSidebar";

type SpeakerUtterance = {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number | null;
};

type VoiceSuggestion = {
  personId: string;
  name: string;
  email: string | null;
  role: string | null;
  confidence: number;
};

type VoiceResult = {
  profileJson: string | null;
  sampleSeconds: number;
  suggestion: VoiceSuggestion | null;
};

type TranscriptionResult = {
  transcriptId: string;
  languageCode: string | null;
  audioDuration: number | null;
  fullText: string;
  utterances: SpeakerUtterance[];
  voiceResults: Record<string, VoiceResult>;
  voiceProfileWarning: string | null;
};

type SpeakerMapping = {
  name: string;
  email: string;
  role: string;
  identityConfirmed: boolean;
  consentToVoiceProfile: boolean;
  matchedPersonId: string | null;
};

function formatTimestamp(
  milliseconds: number,
): string {
  const totalSeconds = Math.floor(
    milliseconds / 1000,
  );

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) =>
      String(value).padStart(2, "0"),
    )
    .join(":");
}

export default function AudioMeetingPage() {
  const [title, setTitle] = useState(
    "In-Person Project Meeting",
  );
  const [meetingDate, setMeetingDate] =
    useState("");
  const [
    expectedSpeakers,
    setExpectedSpeakers,
  ] = useState(2);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [audioUrl, setAudioUrl] =
    useState("");
  const [
    transcription,
    setTranscription,
  ] = useState<TranscriptionResult | null>(
    null,
  );
  const [mappings, setMappings] = useState<
    Record<string, SpeakerMapping>
  >({});
  const [transcribing, setTranscribing] =
    useState(false);
  const [generating, setGenerating] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const detectedSpeakers = useMemo(
    () =>
      transcription
        ? Array.from(
            new Set(
              transcription.utterances.map(
                (item) => item.speaker,
              ),
            ),
          )
        : [],
    [transcription],
  );

  function selectFile(file: File | null) {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setSelectedFile(file);
    setAudioUrl(
      file ? URL.createObjectURL(file) : "",
    );
  }

  async function transcribe(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a recording.");
      return;
    }

    setTranscribing(true);
    setError("");
    setTranscription(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append(
        "expectedSpeakers",
        String(expectedSpeakers),
      );

      const response = await fetch(
        "/api/transcribe",
        {
          method: "POST",
          body: formData,
        },
      );

      const data =
        (await response.json()) as
          | TranscriptionResult
          | {
              error?: string;
              details?: string;
            };

      if (!response.ok) {
        throw new Error(
          "details" in data &&
          data.details
            ? data.details
            : "error" in data &&
                data.error
              ? data.error
              : "Transcription failed.",
        );
      }

      const result =
        data as TranscriptionResult;

      const initialMappings: Record<
        string,
        SpeakerMapping
      > = {};

      for (const speaker of Array.from(
        new Set(
          result.utterances.map(
            (item) => item.speaker,
          ),
        ),
      )) {
        initialMappings[speaker] = {
          name: "",
          email: "",
          role: "",
          identityConfirmed: false,
          consentToVoiceProfile: false,
          matchedPersonId: null,
        };
      }

      setMappings(initialMappings);
      setTranscription(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Transcription failed.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  function updateMapping(
    speaker: string,
    patch: Partial<SpeakerMapping>,
  ) {
    setMappings((current) => ({
      ...current,
      [speaker]: {
        ...current[speaker],
        ...patch,
      },
    }));
  }

  function applySuggestion(
    speaker: string,
    suggestion: VoiceSuggestion,
  ) {
    updateMapping(speaker, {
      name: suggestion.name,
      email: suggestion.email || "",
      role: suggestion.role || "",
      matchedPersonId:
        suggestion.personId,
      identityConfirmed: false,
    });
  }

  async function generateNotes() {
    if (!transcription) {
      return;
    }

    for (const speaker of detectedSpeakers) {
      const mapping = mappings[speaker];

      if (!mapping.name.trim()) {
        setError(
          `Enter a name for Speaker ${speaker}.`,
        );
        return;
      }

      if (!mapping.identityConfirmed) {
        setError(
          `Confirm Speaker ${speaker}.`,
        );
        return;
      }
    }

    setGenerating(true);
    setError("");

    try {
      const mappedTranscript =
        transcription.utterances
          .map((item) => {
            const name =
              mappings[
                item.speaker
              ].name.trim();

            return `[${formatTimestamp(
              item.start,
            )}] ${name}: ${item.text}`;
          })
          .join("\n\n");

      const response = await fetch(
        "/api/process-meeting",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            title,
            meetingDate,
            meetingType: "in-person",
            transcript: mappedTranscript,
            speakerData: {
              utterances:
                transcription.utterances,
              mappings:
                detectedSpeakers.map(
                  (speaker) => {
                    const voice =
                      transcription
                        .voiceResults[
                        speaker
                      ];

                    return {
                      speakerLabel:
                        speaker,
                      ...mappings[speaker],
                      profileJson:
                        voice?.profileJson ||
                        null,
                      sampleSeconds:
                        voice
                          ?.sampleSeconds ||
                        0,
                    };
                  },
                ),
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            "Meeting processing failed.",
        );
      }

      window.location.href =
        `/meetings/${data.meetingId}`;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Meeting processing failed.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              AUDIO / VIDEO MEETING
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Transcribe and map speakers
            </h1>
          </header>

          <form
            onSubmit={transcribe}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                className="rounded-lg border border-slate-300 px-4 py-3"
                placeholder="Meeting title"
              />

              <input
                type="date"
                value={meetingDate}
                onChange={(event) =>
                  setMeetingDate(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-3"
              />

              <select
                value={expectedSpeakers}
                onChange={(event) =>
                  setExpectedSpeakers(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-3"
              >
                {Array.from(
                  { length: 8 },
                  (_, index) => index + 1,
                ).map((number) => (
                  <option
                    key={number}
                    value={number}
                  >
                    {number} speakers
                  </option>
                ))}
              </select>

              <input
                type="file"
                accept="audio/*,video/*"
                onChange={(event) =>
                  selectFile(
                    event.target.files?.[0] ??
                      null,
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>

            {audioUrl && (
              <audio
                controls
                src={audioUrl}
                className="mt-5 w-full"
              />
            )}

            <button
              disabled={transcribing}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {transcribing
                ? "Transcribing..."
                : "Transcribe Meeting"}
            </button>
          </form>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {transcription?.voiceProfileWarning && (
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">
              {
                transcription.voiceProfileWarning
              }
            </div>
          )}

          {transcription && (
            <section className="mt-8 space-y-6">
              {detectedSpeakers.map(
                (speaker) => {
                  const mapping =
                    mappings[speaker];

                  const voice =
                    transcription.voiceResults[
                      speaker
                    ];

                  const examples =
                    transcription.utterances
                      .filter(
                        (item) =>
                          item.speaker ===
                          speaker,
                      )
                      .slice(0, 3);

                  return (
                    <article
                      key={speaker}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <h2 className="text-xl font-bold">
                        Speaker {speaker}
                      </h2>

                      {voice?.suggestion && (
                        <div className="mt-4 rounded-xl bg-blue-50 p-4">
                          <p className="font-semibold text-blue-900">
                            Suggested:{" "}
                            {
                              voice.suggestion
                                .name
                            }
                          </p>
                          <p className="text-sm text-blue-700">
                            Similarity score:{" "}
                            {
                              voice.suggestion
                                .confidence
                            }
                            %
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              applySuggestion(
                                speaker,
                                voice.suggestion!,
                              )
                            }
                            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white"
                          >
                            Use suggestion
                          </button>
                        </div>
                      )}

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <input
                          value={
                            mapping?.name || ""
                          }
                          onChange={(event) =>
                            updateMapping(
                              speaker,
                              {
                                name: event
                                  .target.value,
                                matchedPersonId:
                                  null,
                              },
                            )
                          }
                          placeholder="Name"
                          className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                        <input
                          value={
                            mapping?.email || ""
                          }
                          onChange={(event) =>
                            updateMapping(
                              speaker,
                              {
                                email:
                                  event.target
                                    .value,
                              },
                            )
                          }
                          placeholder="Email"
                          className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                        <input
                          value={
                            mapping?.role || ""
                          }
                          onChange={(event) =>
                            updateMapping(
                              speaker,
                              {
                                role:
                                  event.target
                                    .value,
                              },
                            )
                          }
                          placeholder="Role"
                          className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <label className="mt-5 flex gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            mapping
                              ?.identityConfirmed ||
                            false
                          }
                          onChange={(event) =>
                            updateMapping(
                              speaker,
                              {
                                identityConfirmed:
                                  event.target
                                    .checked,
                              },
                            )
                          }
                        />
                        Confirm speaker identity
                      </label>

                      <label className="mt-3 flex gap-3 text-sm">
                        <input
                          type="checkbox"
                          disabled={
                            !voice?.profileJson
                          }
                          checked={
                            mapping
                              ?.consentToVoiceProfile ||
                            false
                          }
                          onChange={(event) =>
                            updateMapping(
                              speaker,
                              {
                                consentToVoiceProfile:
                                  event.target
                                    .checked,
                              },
                            )
                          }
                        />
                        Save a derived local voice
                        profile for future
                        suggestions
                      </label>

                      <div className="mt-5 space-y-3">
                        {examples.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg bg-slate-50 p-3"
                          >
                            <p className="text-xs text-slate-500">
                              {formatTimestamp(
                                item.start,
                              )}
                            </p>
                            <p className="mt-1 text-sm">
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                },
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={generateNotes}
                  disabled={generating}
                  className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {generating
                    ? "Generating..."
                    : "Confirm Speakers and Generate Notes"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

