"use client";

import Link from "next/link";
import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import EmailSendPanel from "@/components/EmailSendPanel";

type EditableTask = {
  title: string;
  description: string;
  owner: string;
  deadline: string;
  priority: "unspecified" | "low" | "medium" | "high";
  status: "To Do" | "In Progress" | "Done";
  sourceTimestamp: string | null;
};

type EditableDecision = {
  text: string;
  topic: string;
  timestamp: string | null;
};

type MeetingReviewProps = {
  meeting: {
    id: string;
    title: string;
    meetingDate: string | null;
    meetingType: string;
    status: string;
    rawTranscript: string;
  };

  output: {
    shortSummary: string;

    detailedSummary: {
      meetingPurpose: string;
      mainDiscussionPoints: string[];
      nextSteps: string[];
    };

    followUpEmail: string;
    projectStatusUpdate: string;
    openQuestions: string[];
    risks: string[];
    blockers: string[];
  };

  initialTasks: EditableTask[];
  initialDecisions: EditableDecision[];
};

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not specified";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MeetingReviewClient({
  meeting,
  output,
  initialTasks,
  initialDecisions,
}: MeetingReviewProps) {
  const [shortSummary, setShortSummary] = useState(
    output.shortSummary,
  );

  const [meetingPurpose, setMeetingPurpose] = useState(
    output.detailedSummary.meetingPurpose,
  );

  const [discussionPoints, setDiscussionPoints] = useState(
    output.detailedSummary.mainDiscussionPoints.join("\n"),
  );

  const [nextSteps, setNextSteps] = useState(
    output.detailedSummary.nextSteps.join("\n"),
  );

  const [tasks, setTasks] = useState(initialTasks);
  const [decisions, setDecisions] =
    useState(initialDecisions);

  const [openQuestions, setOpenQuestions] = useState(
    output.openQuestions.join("\n"),
  );

  const [risks, setRisks] = useState(
    output.risks.join("\n"),
  );

  const [blockers, setBlockers] = useState(
    output.blockers.join("\n"),
  );

  const [projectStatusUpdate, setProjectStatusUpdate] =
    useState(output.projectStatusUpdate);

  const [followUpEmail, setFollowUpEmail] = useState(
    output.followUpEmail,
  );

  const [currentStatus, setCurrentStatus] = useState(
    meeting.status,
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateTask(
    index: number,
    field: keyof EditableTask,
    value: string,
  ) {
    setTasks((currentTasks) =>
      currentTasks.map((task, taskIndex) =>
        taskIndex === index
          ? {
              ...task,
              [field]:
                field === "sourceTimestamp"
                  ? value || null
                  : value,
            }
          : task,
      ),
    );
  }

  function removeTask(index: number) {
    setTasks((currentTasks) =>
      currentTasks.filter(
        (_, taskIndex) => taskIndex !== index,
      ),
    );
  }

  function addTask() {
    setTasks((currentTasks) => [
      ...currentTasks,
      {
        title: "",
        description: "",
        owner: "Unassigned",
        deadline: "Not specified",
        priority: "unspecified",
        status: "To Do",
        sourceTimestamp: null,
      },
    ]);
  }

  function updateDecision(
    index: number,
    field: keyof EditableDecision,
    value: string,
  ) {
    setDecisions((currentDecisions) =>
      currentDecisions.map((decision, decisionIndex) =>
        decisionIndex === index
          ? {
              ...decision,
              [field]:
                field === "timestamp"
                  ? value || null
                  : value,
            }
          : decision,
      ),
    );
  }

  function removeDecision(index: number) {
    setDecisions((currentDecisions) =>
      currentDecisions.filter(
        (_, decisionIndex) => decisionIndex !== index,
      ),
    );
  }

  function addDecision() {
    setDecisions((currentDecisions) => [
      ...currentDecisions,
      {
        text: "",
        topic: "General",
        timestamp: null,
      },
    ]);
  }

  async function saveMeeting(
    status: "ready_for_review" | "confirmed",
  ) {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/meetings/${meeting.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            shortSummary,

            detailedSummary: {
              meetingPurpose,
              mainDiscussionPoints:
                linesToArray(discussionPoints),
              nextSteps: linesToArray(nextSteps),
            },

            tasks,
            decisions,
            followUpEmail,
            projectStatusUpdate,
            openQuestions: linesToArray(openQuestions),
            risks: linesToArray(risks),
            blockers: linesToArray(blockers),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not save the meeting.",
        );
      }

      setCurrentStatus(data.status);

      setMessage(
        data.status === "confirmed"
          ? "Final notes confirmed successfully."
          : "Meeting changes saved successfully.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save the meeting.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <Link
              href="/meetings"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Meeting History
            </Link>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  {meeting.title}
                </h1>

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>
                    {formatDate(meeting.meetingDate)}
                  </span>
                  <span>•</span>
                  <span className="capitalize">
                    {meeting.meetingType}
                  </span>
                </div>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  currentStatus === "confirmed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {currentStatus === "confirmed"
                  ? "Confirmed"
                  : "Ready for review"}
              </span>
            </div>
          </header>

          {message && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <EditorSection title="Short summary">
              <textarea
                value={shortSummary}
                onChange={(event) =>
                  setShortSummary(event.target.value)
                }
                rows={5}
                className="w-full rounded-lg border border-slate-300 p-4 leading-7 outline-none focus:border-blue-500"
              />
            </EditorSection>

            <EditorSection title="Detailed summary">
              <FieldLabel label="Meeting purpose">
                <textarea
                  value={meetingPurpose}
                  onChange={(event) =>
                    setMeetingPurpose(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>

              <FieldLabel label="Main discussion points — one per line">
                <textarea
                  value={discussionPoints}
                  onChange={(event) =>
                    setDiscussionPoints(event.target.value)
                  }
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>

              <FieldLabel label="Next steps — one per line">
                <textarea
                  value={nextSteps}
                  onChange={(event) =>
                    setNextSteps(event.target.value)
                  }
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>
            </EditorSection>

            <EditorSection title="Action items">
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <article
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">
                        Task {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="text-sm font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldLabel label="Task title">
                        <input
                          value={task.title}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "title",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>

                      <FieldLabel label="Owner">
                        <input
                          value={task.owner}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "owner",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>

                      <FieldLabel label="Deadline">
                        <input
                          value={task.deadline}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "deadline",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>

                      <FieldLabel label="Source timestamp">
                        <input
                          value={task.sourceTimestamp || ""}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "sourceTimestamp",
                              event.target.value,
                            )
                          }
                          placeholder="00:14:21"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>

                      <FieldLabel label="Priority">
                        <select
                          value={task.priority}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "priority",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="unspecified">Unspecified</option>
                          <option value="low">Low</option>
                          <option value="medium">
                            Medium
                          </option>
                          <option value="high">High</option>
                        </select>
                      </FieldLabel>

                      <FieldLabel label="Status">
                        <select
                          value={task.status}
                          onChange={(event) =>
                            updateTask(
                              index,
                              "status",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">
                            In Progress
                          </option>
                          <option value="Done">Done</option>
                        </select>
                      </FieldLabel>
                    </div>

                    <FieldLabel label="Description">
                      <textarea
                        value={task.description}
                        onChange={(event) =>
                          updateTask(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 p-3"
                      />
                    </FieldLabel>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={addTask}
                  className="rounded-lg border border-blue-300 px-4 py-2 font-semibold text-blue-700"
                >
                  + Add Task
                </button>
              </div>
            </EditorSection>

            <EditorSection title="Decisions">
              <div className="space-y-4">
                {decisions.map((decision, index) => (
                  <article
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">
                        Decision {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          removeDecision(index)
                        }
                        className="text-sm font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <FieldLabel label="Decision">
                      <textarea
                        value={decision.text}
                        onChange={(event) =>
                          updateDecision(
                            index,
                            "text",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 p-3"
                      />
                    </FieldLabel>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldLabel label="Topic">
                        <input
                          value={decision.topic}
                          onChange={(event) =>
                            updateDecision(
                              index,
                              "topic",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>

                      <FieldLabel label="Timestamp">
                        <input
                          value={decision.timestamp || ""}
                          onChange={(event) =>
                            updateDecision(
                              index,
                              "timestamp",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </FieldLabel>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={addDecision}
                  className="rounded-lg border border-blue-300 px-4 py-2 font-semibold text-blue-700"
                >
                  + Add Decision
                </button>
              </div>
            </EditorSection>

            <EditorSection title="Risks, blockers and questions">
              <FieldLabel label="Risks — one per line">
                <textarea
                  value={risks}
                  onChange={(event) =>
                    setRisks(event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>

              <FieldLabel label="Blockers — one per line">
                <textarea
                  value={blockers}
                  onChange={(event) =>
                    setBlockers(event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>

              <FieldLabel label="Open questions — one per line">
                <textarea
                  value={openQuestions}
                  onChange={(event) =>
                    setOpenQuestions(event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </FieldLabel>
            </EditorSection>

            <EditorSection title="Project status update">
              <textarea
                value={projectStatusUpdate}
                onChange={(event) =>
                  setProjectStatusUpdate(event.target.value)
                }
                rows={7}
                className="w-full rounded-lg border border-slate-300 p-4 leading-7"
              />
            </EditorSection>

            <EditorSection title="Follow-up email">
              <textarea
                value={followUpEmail}
                onChange={(event) =>
                  setFollowUpEmail(event.target.value)
                }
                rows={15}
                className="w-full rounded-lg border border-slate-300 p-4 leading-7"
              />
            </EditorSection>

            <EmailSendPanel
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              body={followUpEmail}
              confirmed={currentStatus === "confirmed"}
            />

            <EditorSection title="Full transcript">
              <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-200">
                {meeting.rawTranscript}
              </pre>
            </EditorSection>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-100 py-5">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveMeeting("ready_for_review")
                }
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Save Changes
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveMeeting("confirmed")}
                className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Confirm Final Notes"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

