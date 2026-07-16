import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MeetingsPage() {
  const supabase = getSupabaseAdmin();

  const [
    { data: meetings, error: meetingsError },
    { data: tasks, error: tasksError },
    { data: decisions, error: decisionsError },
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select(
        "id,title,meeting_date,meeting_type,status,created_at",
      )
      .order("created_at", { ascending: false }),

    supabase.from("tasks").select("meeting_id"),

    supabase.from("decisions").select("meeting_id"),
  ]);

  const databaseError =
    meetingsError?.message ||
    tasksError?.message ||
    decisionsError?.message;

  const taskCounts = new Map<string, number>();
  const decisionCounts = new Map<string, number>();

  for (const task of tasks ?? []) {
    const current = taskCounts.get(task.meeting_id) ?? 0;
    taskCounts.set(task.meeting_id, current + 1);
  }

  for (const decision of decisions ?? []) {
    const current = decisionCounts.get(decision.meeting_id) ?? 0;
    decisionCounts.set(decision.meeting_id, current + 1);
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                MEETING HISTORY
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Previous meetings
              </h1>

              <p className="mt-2 text-slate-600">
                Open saved meetings and review their summaries,
                decisions and action items.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              New Meeting
            </Link>
          </header>

          {databaseError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {databaseError}
            </div>
          )}

          {!meetings || meetings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-bold">
                No meetings saved yet
              </h2>

              <p className="mt-2 text-slate-500">
                Process your first transcript to create a meeting.
              </p>

              <Link
                href="/"
                className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Process a meeting
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">
                        Meeting
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Date
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Type
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Tasks
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Decisions
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Status
                      </th>
                      <th className="px-5 py-4 font-medium" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {meetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {meeting.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Created {formatDate(meeting.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(meeting.meeting_date)}
                        </td>

                        <td className="px-5 py-4 text-sm capitalize text-slate-600">
                          {meeting.meeting_type}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {taskCounts.get(meeting.id) ?? 0}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {decisionCounts.get(meeting.id) ?? 0}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {meeting.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/meetings/${meeting.id}`}
                            className="font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
