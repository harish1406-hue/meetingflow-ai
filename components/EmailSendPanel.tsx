"use client";

import { useState } from "react";

type Log = {
  id: string;
  recipient_email: string;
  sent_at: string;
  status: string;
  error_message: string | null;
};

export default function EmailSendPanel({
  meetingId,
  meetingTitle,
  body,
  confirmed,
}: {
  meetingId: string;
  meetingTitle: string;
  body: string;
  confirmed: boolean;
}) {
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState(
    `Meeting notes — ${meetingTitle}`,
  );

  const [logs, setLogs] = useState<Log[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoadingLogs(true);
    setError("");

    try {
      const response = await fetch(
        `/api/meetings/${meetingId}/email-logs`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load email history.",
        );
      }

      setLogs(data.logs || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load email history.",
      );
    } finally {
      setLoadingLogs(false);
    }
  }

  async function send() {
    setSending(true);
    setMessage("");
    setError("");

    try {
      const list = recipients
        .split(/[,\n;]/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (list.length === 0) {
        throw new Error(
          "Enter at least one recipient email.",
        );
      }

      if (!subject.trim()) {
        throw new Error(
          "Enter an email subject.",
        );
      }

      if (!body.trim()) {
        throw new Error(
          "The follow-up email body is empty.",
        );
      }

      const response = await fetch(
        `/api/meetings/${meetingId}/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipients: list,
            subject,
            body,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Email sending failed.",
        );
      }

      setMessage(
        `${data.sentCount} email(s) sent. ${data.failedCount} failed.`,
      );

      await loadLogs();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Email sending failed.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        Confirm and send
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Notes must be confirmed before email sending is enabled.
      </p>

      <label className="mt-5 block space-y-2">
        <span className="text-sm font-medium">
          Recipients
        </span>

        <textarea
          value={recipients}
          onChange={(event) =>
            setRecipients(event.target.value)
          }
          placeholder="person@example.com, another@example.com"
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3"
        />
      </label>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-medium">
          Subject
        </span>

        <input
          value={subject}
          onChange={(event) =>
            setSubject(event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {message && (
        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!confirmed || sending}
          onClick={send}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending
            ? "Sending..."
            : "Send Confirmed Notes"}
        </button>

        <button
          type="button"
          disabled={loadingLogs}
          onClick={loadLogs}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold disabled:opacity-40"
        >
          {loadingLogs
            ? "Loading..."
            : "Refresh Sending History"}
        </button>
      </div>

      <div className="mt-7">
        <h3 className="font-semibold">
          Sending history
        </h3>

        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Click “Refresh Sending History” to load previous sends.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <p className="font-medium">
                  {log.recipient_email}
                </p>

                <p className="mt-1 text-slate-500">
                  {log.status} ·{" "}
                  {new Date(
                    log.sent_at,
                  ).toLocaleString()}
                </p>

                {log.error_message && (
                  <p className="mt-1 text-red-600">
                    {log.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
