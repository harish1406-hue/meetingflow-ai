import AppSidebar from "@/components/AppSidebar";
import PeopleClient, {
  type PersonItem,
} from "@/components/PeopleClient";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = getSupabaseAdmin();

  const { data: people, error } = await supabase
    .from("people")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  const items: PersonItem[] = (people ?? []).map(
    (person) => ({
      id: person.id,
      name: person.name,
      email: person.email || "",
      role: person.role || "",
      voiceProfileStatus:
        person.voice_profile_status || "none",
      createdAt: person.created_at,
      lastMatchedAt: person.last_matched_at,
    }),
  );

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar />

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              PEOPLE / VOICE PROFILES
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Known meeting participants
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Profiles store derived acoustic features, not
              meeting content. Suggested matches require
              manual confirmation.
            </p>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error.message}
            </div>
          ) : (
            <PeopleClient initialPeople={items} />
          )}
        </div>
      </main>
    </div>
  );
}