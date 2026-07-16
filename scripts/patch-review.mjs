import fs from "node:fs";

const path =
  "components/MeetingReviewClient.tsx";

let source = fs.readFileSync(
  path,
  "utf8",
);

const importLine =
  'import EmailSendPanel from "@/components/EmailSendPanel";';

if (!source.includes(importLine)) {
  source = source.replace(
    'import AppSidebar from "@/components/AppSidebar";',
    'import AppSidebar from "@/components/AppSidebar";\n' +
      importLine,
  );
}

const marker =
  '            <EditorSection title="Full transcript">';

if (
  !source.includes("<EmailSendPanel") &&
  source.includes(marker)
) {
  source = source.replace(
    marker,
    `            <EmailSendPanel
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              body={followUpEmail}
              confirmed={currentStatus === "confirmed"}
            />

` + marker,
  );
}

fs.writeFileSync(
  path,
  source,
  "utf8",
);

console.log(
  "Review page patched.",
);
