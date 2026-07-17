"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";

type MeetingTask = {
  title: string;
  description: string;
  owner: string;
  deadline: string;
  priority: "unspecified" | "low" | "medium" | "high";
  status: "To Do" | "In Progress" | "Done";
  sourceTimestamp: string | null;
};

type Decision = {
  text: string;
  topic: string;
  timestamp: string | null;
};

type MeetingOutput = {
  shortSummary: string;

  detailedSummary: {
    meetingPurpose: string;
    mainDiscussionPoints: string[];
    nextSteps: string[];
  };

  tasks: MeetingTask[];
  decisions: Decision[];
  followUpEmail: string;
  projectStatusUpdate: string;
  openQuestions: string[];
  risks: string[];
  blockers: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizePriority(
  value: unknown,
): "unspecified" | "low" | "medium" | "high" {
  if (
    value === "unspecified" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }

  return "unspecified";
}

function normalizeStatus(
  value: unknown,
): "To Do" | "In Progress" | "Done" {
  if (
    value === "To Do" ||
    value === "In Progress" ||
    value === "Done"
  ) {
    return value;
  }

  return "To Do";
}

function normalizeTasks(value: unknown): MeetingTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((task) => ({
      title: safeString(task.title, "Untitled task"),
      description: safeString(task.description),
      owner: safeString(task.owner, "Unassigned"),
      deadline: safeString(task.deadline, "Not specified"),
      priority: normalizePriority(task.priority),
      status: normalizeStatus(task.status),
      sourceTimestamp: safeNullableString(task.sourceTimestamp),
    }));
}

function normalizeDecisions(value: unknown): Decision[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((decision) => ({
      text: safeString(decision.text, "Decision not specified"),
      topic: safeString(decision.topic, "General"),
      timestamp: safeNullableString(decision.timestamp),
    }));
}

function normalizeMeetingOutput(value: unknown): MeetingOutput {
  const data = isRecord(value) ? value : {};

  const detailedSummary = isRecord(data.detailedSummary)
    ? data.detailedSummary
    : {};

  return {
    shortSummary: safeString(
      data.shortSummary,
      "No summary was generated.",
    ),

    detailedSummary: {
      meetingPurpose: safeString(
        detailedSummary.meetingPurpose,
        "Not specified",
      ),
      mainDiscussionPoints: safeStringArray(
        detailedSummary.mainDiscussionPoints,
      ),
      nextSteps: safeStringArray(detailedSummary.nextSteps),
    },

    tasks: normalizeTasks(data.tasks),
    decisions: normalizeDecisions(data.decisions),

    followUpEmail: safeString(data.followUpEmail),
    projectStatusUpdate: safeString(data.projectStatusUpdate),

    openQuestions: safeStringArray(data.openQuestions),
    risks: safeStringArray(data.risks),
    blockers: safeStringArray(data.blockers),
  };
}

export default function Home() {
  const [title, setTitle] = useState(
    "Landing Page Project Meeting",
  );
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("online");
  const [transcript, setTranscript] = useState("");

  const [result, setResult] = useState<MeetingOutput | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleTranscriptFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Please select a .txt transcript file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();

      if (!text.trim()) {
        throw new Error(
          "The selected transcript file is empty.",
        );
      }

      setTranscript(text);
      setError("");

      if (
        !title.trim() ||
        title === "Landing Page Project Meeting"
      ) {
        setTitle(
          file.name
            .replace(/\.txt$/i, "")
            .replace(/[-_]+/g, " "),
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not read the transcript file.",
      );
    }
  }

  async function processMeeting(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/process-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          meetingDate,
          meetingType,
          transcript,
        }),
      });

      const responseText = await response.text();

      let parsedData: unknown;

      try {
        parsedData = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The server returned an invalid response: ${responseText.slice(
            0,
            300,
          )}`,
        );
      }

      if (!response.ok) {
        const apiError = isRecord(parsedData) ? parsedData : {};

        throw new Error(
          safeString(
            apiError.details,
            safeString(
              apiError.error,
              `Meeting processing failed with status ${response.status}.`,
            ),
          ),
        );
      }

      console.log("Meeting API response:", parsedData);

      const safeResult = normalizeMeetingOutput(parsedData);
      setResult(safeResult);
    } catch (caughtError) {
      console.error("Process meeting error:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "An unexpected error occurred.",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <AppSidebar />

        <main className="min-w-0 flex-1 p-5 md:p-10">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <p className="text-sm font-semibold text-blue-600">
                NEW MEETING
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Convert a meeting into actionable tasks
              </h1>

              <p className="mt-2 text-slate-600">
                Paste a transcript or upload a .txt file to generate summaries,
                decisions, tasks, risks and a follow-up email.
              </p>
            </header>

            <form
              onSubmit={processMeeting}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Meeting title
                  </span>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Meeting date
                  </span>

                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(event) =>
                      setMeetingDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Meeting type
                  </span>

                  <select
                    value={meetingType}
                    onChange={(event) =>
                      setMeetingType(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="online">
                      Online meeting
                    </option>
                    <option value="in-person">
                      In-person meeting
                    </option>
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Upload transcript file
                  </span>

                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleTranscriptFile}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
                  />

                  <p className="text-xs text-slate-500">
                    Choose a UTF-8 .txt file. Its contents will
                    appear below and can still be edited.
                  </p>
                </label>
              </div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium">
                  Meeting transcript
                </span>

                <textarea
                  value={transcript}
                  onChange={(event) =>
                    setTranscript(event.target.value)
                  }
                  required
                  rows={14}
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">
                    Meeting processing failed
                  </p>
                  <p className="mt-1 break-words">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing
                  ? "Processing meeting..."
                  : "Process Meeting"}
              </button>

              {processing && (
                <p className="mt-3 text-sm text-slate-500">
                  The AI is extracting meeting information. This
                  may take several seconds.
                </p>
              )}
            </form>

            {result && (
              <section className="mt-8 space-y-6">
                <ResultCard title="Short summary">
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">
                    {result.shortSummary}
                  </p>
                </ResultCard>

                <ResultCard title="Detailed summary">
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-semibold">
                        Meeting purpose
                      </h3>
                      <p className="mt-2 leading-7 text-slate-700">
                        {
                          result.detailedSummary
                            .meetingPurpose
                        }
                      </p>
                    </div>

                    <ListSection
                      heading="Main discussion points"
                      items={
                        result.detailedSummary
                          .mainDiscussionPoints
                      }
                    />

                    <ListSection
                      heading="Next steps"
                      items={result.detailedSummary.nextSteps}
                    />
                  </div>
                </ResultCard>

                <ResultCard title="Decisions">
                  {result.decisions.length === 0 ? (
                    <EmptyMessage text="No confirmed decisions found." />
                  ) : (
                    <div className="space-y-3">
                      {result.decisions.map(
                        (decision, index) => (
                          <article
                            key={`${decision.text}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="font-medium">
                              {decision.text}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                              Topic: {decision.topic}
                              {decision.timestamp
                                ? ` · ${decision.timestamp}`
                                : ""}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </ResultCard>

                <ResultCard title="Action items">
                  {result.tasks.length === 0 ? (
                    <EmptyMessage text="No tasks found." />
                  ) : (
                    <div className="space-y-4">
                      {result.tasks.map((task, index) => (
                        <article
                          key={`${task.title}-${index}`}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold">
                                {task.title}
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {task.description ||
                                  "No description provided."}
                              </p>
                            </div>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                              {task.priority}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                            <p>
                              <strong className="text-slate-900">
                                Owner:
                              </strong>{" "}
                              {task.owner}
                            </p>

                            <p>
                              <strong className="text-slate-900">
                                Deadline:
                              </strong>{" "}
                              {task.deadline}
                            </p>

                            <p>
                              <strong className="text-slate-900">
                                Status:
                              </strong>{" "}
                              {task.status}
                            </p>
                          </div>

                          {task.sourceTimestamp && (
                            <p className="mt-3 text-xs text-slate-500">
                              Source timestamp:{" "}
                              {task.sourceTimestamp}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </ResultCard>

                <ResultCard title="Risks, blockers and questions">
                  <div className="space-y-5">
                    <ListSection
                      heading="Risks"
                      items={result.risks}
                    />

                    <ListSection
                      heading="Blockers"
                      items={result.blockers}
                    />

                    <ListSection
                      heading="Open questions"
                      items={result.openQuestions}
                    />
                  </div>
                </ResultCard>

                <ResultCard title="Project status update">
                  {result.projectStatusUpdate ? (
                    <p className="whitespace-pre-wrap leading-7 text-slate-700">
                      {result.projectStatusUpdate}
                    </p>
                  ) : (
                    <EmptyMessage text="No project status update generated." />
                  )}
                </ResultCard>

                <ResultCard title="Follow-up email">
                  <p className="mb-3 text-sm text-slate-500">
                    You can edit this email before sending it.
                  </p>

                  <textarea
                    key={result.followUpEmail}
                    defaultValue={result.followUpEmail}
                    rows={14}
                    className="w-full resize-y rounded-lg border border-slate-300 p-4 leading-7 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </ResultCard>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </article>
  );
}

function ListSection({
  heading,
  items,
}: {
  heading: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{heading}</h3>

      {items.length === 0 ? (
        <EmptyMessage text="None identified." />
      ) : (
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}



