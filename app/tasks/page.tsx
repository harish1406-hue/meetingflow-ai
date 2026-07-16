import AppSidebar from "@/components/AppSidebar";
import TasksClient, {
  type TaskItem,
} from "@/components/TasksClient";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = getSupabaseAdmin();

  const [
    { data: tasks, error: tasksError },
    { data: meetings, error: meetingsError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false }),

    supabase.from("meetings").select("id,title"),
  ]);

  const meetingMap = new Map(
    (meetings ?? []).map((meeting) => [
      meeting.id,
      meeting.title,
    ]),
  );

  const taskItems: TaskItem[] = (tasks ?? []).map(
    (task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      owner: task.owner_text,
      deadline: task.deadline_text,
      priority: task.priority,
      status: task.status,
      sourceTimestamp: task.source_timestamp,
      meetingId: task.meeting_id,
      meetingTitle:
        meetingMap.get(task.meeting_id) ||
        "Unknown meeting",
    }),
  );

  const databaseError =
    tasksError?.message || meetingsError?.message;

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              ALL TASKS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Meeting action items
            </h1>

            <p className="mt-2 text-slate-600">
              Review, filter and update tasks extracted from
              every saved meeting.
            </p>
          </header>

          {databaseError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {databaseError}
            </div>
          ) : (
            <TasksClient initialTasks={taskItems} />
          )}
        </div>
      </main>
    </div>
  );
}
