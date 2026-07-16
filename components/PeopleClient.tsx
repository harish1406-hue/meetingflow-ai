"use client";

import { useState } from "react";

export type PersonItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  voiceProfileStatus: string;
  createdAt: string;
  lastMatchedAt: string | null;
};

export default function PeopleClient({
  initialPeople,
}: {
  initialPeople: PersonItem[];
}) {
  const [people, setPeople] = useState(initialPeople);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function updateLocal(
    id: string,
    field: "name" | "email" | "role",
    value: string,
  ) {
    setPeople((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, [field]: value }
          : person,
      ),
    );
  }

  async function parseResponse(
    response: Response,
  ): Promise<Record<string, unknown>> {
    const text = await response.text();

    let data: Record<string, unknown> = {};

    try {
      data = text
        ? (JSON.parse(text) as Record<string, unknown>)
        : {};
    } catch {
      throw new Error(
        `The server returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok) {
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "The operation failed.",
      );
    }

    return data;
  }

  async function savePerson(person: PersonItem) {
    setBusyId(person.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/people/${person.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: person.name,
            email: person.email,
            role: person.role,
          }),
        },
      );

      await parseResponse(response);
      setMessage(`${person.name} was updated.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update the person.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteVoiceProfile(
    person: PersonItem,
  ) {
    if (
      !window.confirm(
        `Delete the saved voice profile for ${person.name}?`,
      )
    ) {
      return;
    }

    setBusyId(person.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/people/${person.id}/voice-profile`,
        { method: "DELETE" },
      );

      await parseResponse(response);

      setPeople((current) =>
        current.map((item) =>
          item.id === person.id
            ? {
                ...item,
                voiceProfileStatus: "deleted",
              }
            : item,
        ),
      );

      setMessage(
        `Voice profile deleted for ${person.name}.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete the voice profile.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deletePerson(person: PersonItem) {
    if (
      !window.confirm(
        `Delete ${person.name}? Their voice profile will also be removed.`,
      )
    ) {
      return;
    }

    setBusyId(person.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/people/${person.id}`,
        { method: "DELETE" },
      );

      await parseResponse(response);

      setPeople((current) =>
        current.filter(
          (item) => item.id !== person.id,
        ),
      );

      setMessage(`${person.name} was deleted.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete the person.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {message && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {people.map((person) => {
          const busy = busyId === person.id;

          return (
            <article
              key={person.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {person.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {person.email || "No email"} Â·{" "}
                    {person.role || "No role"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    person.voiceProfileStatus === "confirmed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Voice: {person.voiceProfileStatus}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <input
                  value={person.name}
                  onChange={(event) =>
                    updateLocal(
                      person.id,
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <input
                  value={person.email}
                  onChange={(event) =>
                    updateLocal(
                      person.id,
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <input
                  value={person.role}
                  onChange={(event) =>
                    updateLocal(
                      person.id,
                      "role",
                      event.target.value,
                    )
                  }
                  placeholder="Role"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => savePerson(person)}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    person.voiceProfileStatus !== "confirmed"
                  }
                  onClick={() =>
                    deleteVoiceProfile(person)
                  }
                  className="rounded-lg border border-amber-300 px-4 py-2 font-semibold text-amber-700 disabled:opacity-40"
                >
                  Delete Voice Profile
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deletePerson(person)}
                  className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-50"
                >
                  Delete Person
                </button>
              </div>
            </article>
          );
        })}

        {people.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No people exist yet.
          </div>
        )}
      </div>
    </>
  );
}