"use client";

import { useMemo, useState } from "react";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  owner: string;
  deadline: string;
  priority: string;
  status: string;
  sourceTimestamp: string | null;
  meetingId: string;
  meetingTitle: string;
};

const taskStatuses = ["To Do", "In Progress", "Done"];

export default function TasksClient({
  initialTasks,
}: {
  initialTasks: TaskItem[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState("all");
  const [error, setError] = useState("");

  const owners = useMemo(
    () =>
      Array.from(
        new Set(
          tasks
            .map((task) => task.owner)
            .filter((owner) => owner.trim().length > 0),
        ),
      ).sort(),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const ownerMatches =
        ownerFilter === "all" || task.owner === ownerFilter;

      const statusMatches =
        statusFilter === "all" ||
        task.status === statusFilter;

      const priorityMatches =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return (
        ownerMatches &&
        statusMatches &&
        priorityMatches
      );
    });
  }, [
    tasks,
    ownerFilter,
    statusFilter,
    priorityFilter,
  ]);

  async function updateStatus(
    taskId: string,
    newStatus: string,
  ) {
    const previousTasks = tasks;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task,
      ),
    );

    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update task status.",
        );
      }
    } catch (caughtError) {
      setTasks(previousTasks);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update task status.",
      );
    }
  }

  return (
    <>
      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium">Owner</span>

          <select
            value={ownerFilter}
            onChange={(event) =>
              setOwnerFilter(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All owners</option>

            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Status</span>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">
              In Progress
            </option>
            <option value="Done">Done</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">
            Priority
          </span>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All priorities</option>
            <option value="unspecified">Unspecified</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm text-slate-500">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">
                  Task
                </th>
                <th className="px-5 py-4 font-medium">
                  Meeting
                </th>
                <th className="px-5 py-4 font-medium">
                  Owner
                </th>
                <th className="px-5 py-4 font-medium">
                  Deadline
                </th>
                <th className="px-5 py-4 font-medium">
                  Priority
                </th>
                <th className="px-5 py-4 font-medium">
                  Status
                </th>
                <th className="px-5 py-4 font-medium">
                  Source
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold">
                      {task.title}
                    </p>

                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      {task.description}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    <a
                      href={`/meetings/${task.meetingId}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {task.meetingTitle}
                    </a>
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {task.owner}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {task.deadline}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                      {task.priority}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <select
                      value={task.status}
                      onChange={(event) =>
                        updateStatus(
                          task.id,
                          event.target.value,
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {taskStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {task.sourceTimestamp || "—"}
                  </td>
                </tr>
              ))}

              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No tasks match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

