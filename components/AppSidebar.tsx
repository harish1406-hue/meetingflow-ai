"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Transcript Meeting"],
  ["/audio-meeting", "Audio / Video Meeting"],
  ["/meetings", "Meeting History"],
  ["/tasks", "All Tasks"],
  ["/people", "People / Voice Profiles"],
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 bg-slate-950 p-6 text-white md:block">
      <p className="text-xl font-bold">
        MeetingFlow AI
      </p>
      <p className="mt-1 mb-10 text-sm text-slate-400">
        Meeting-to-Tasks Agent
      </p>

      <nav className="space-y-2 text-sm">
        {links.map(([href, label]) => {
          const active =
            pathname === href ||
            (href !== "/" &&
              pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-4 py-3 ${
                active
                  ? "bg-blue-600"
                  : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
