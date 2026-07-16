import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
  quiet: true,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const demos = [
  {
    title: "[Demo] Product Launch Readiness",
    date: "2026-08-06",
    type: "online",
    transcript: `[00:00:03] Emma: We need to decide whether the September 15 launch remains realistic.
[00:00:15] Daniel: Android is ready. Apple sign-in still fails on iOS, and I need to submit the build by Friday.
[00:00:31] Sofia: The campaign is ready, but the customer announcement email still needs approval.
[00:00:45] Liam: Support training should happen before invitations go out.
[00:01:02] Emma: Decision confirmed: keep September 15 if Apple sign-in is fixed and the iOS build is submitted Friday.`,
    summary:
      "The team kept the September 15 launch date, subject to the iOS authentication fix and Friday build submission.",
    purpose:
      "Confirm launch readiness and assign remaining actions.",
    discussion: [
      "Android is ready.",
      "Apple sign-in remains an iOS blocker.",
      "Campaign approval and support training remain open.",
    ],
    next: [
      "Fix Apple sign-in.",
      "Submit the iOS build Friday.",
      "Approve the announcement email.",
      "Train support before invitations go out.",
    ],
    decision:
      "Keep the September 15 launch date if Apple sign-in is fixed and the iOS build is submitted Friday.",
    tasks: [
      ["Fix Apple sign-in", "Daniel", "Friday", "00:00:15"],
      ["Submit iOS build", "Daniel", "Friday", "00:00:15"],
      ["Approve announcement email", "Unassigned", "Not specified", "00:00:31"],
      ["Schedule support training", "Liam", "Before invitations go out", "00:00:45"],
    ],
    risks: [
      "Campaign approval may delay customer communication.",
    ],
    blockers: [
      "Apple sign-in is failing on iOS.",
    ],
    questions: [
      "Who owns final approval of the announcement email?",
    ],
  },
  {
    title: "[Demo] Customer Onboarding Workshop",
    date: "2026-07-16",
    type: "in-person",
    transcript: `[00:00:00] Sofia: We have eighteen confirmed attendees.
[00:00:15] Daniel: I can demonstrate account setup and data import. Venue Wi-Fi is a minor risk.
[00:00:27] Emma: Decision confirmed: two forty-five-minute blocks with a short break.
[00:00:40] Sofia: I will send the attendee guide by next Wednesday and collect common questions by the end of tomorrow.
[00:00:55] Emma: I will finalize the agenda by Monday, July 20.
[00:01:06] Daniel: I will prepare sandbox accounts by Friday, July 24.`,
    summary:
      "The workshop format was confirmed and four preparation actions were assigned.",
    purpose:
      "Finalize workshop format and assign preparation work.",
    discussion: [
      "Eighteen attendees are confirmed.",
      "The workshop will use two practical blocks.",
      "Venue Wi-Fi is a minor risk.",
    ],
    next: [
      "Send the attendee guide.",
      "Collect common questions.",
      "Finalize the agenda.",
      "Prepare sandbox accounts.",
    ],
    decision:
      "Use two forty-five-minute blocks with a short break.",
    tasks: [
      ["Send attendee guide", "Sofia", "Next Wednesday", "00:00:40"],
      ["Collect onboarding questions", "Sofia", "End of tomorrow", "00:00:40"],
      ["Finalize facilitator agenda", "Emma", "Monday, July 20", "00:00:55"],
      ["Prepare sandbox accounts", "Daniel", "Friday, July 24", "00:01:06"],
    ],
    risks: [
      "Venue Wi-Fi may slow the live import.",
    ],
    blockers: [],
    questions: [
      "Should customer support join the final question period?",
    ],
  },
  {
    title: "[Demo] Eight-Speaker Enterprise Readiness",
    date: "2026-08-18",
    type: "in-person",
    transcript: `[00:00:03] Emma: We need a final readiness decision for the Atlas rollout.
[00:00:16] Daniel: I will run the overnight import test by Thursday.
[00:00:29] Sofia: I will send the final announcement draft by Wednesday.
[00:00:42] Liam: I will publish the escalation guide before training.
[00:00:56] Maya: I need the signed vendor-access exception by Friday.
[00:01:10] Noah: I will update the forecast after the customer confirms seat count.
[00:01:24] Chloe: I will host administrator training next Tuesday.
[00:01:39] Ethan: The data-processing addendum still needs the customer's signature.
[00:01:54] Emma: The unsigned addendum is a blocker.
[00:02:08] Daniel: If the overnight test fails, I will prepare a manual staged-import plan.
[00:02:21] Sofia: Do we announce before the addendum is signed?
[00:02:34] Ethan: No. The announcement should wait.
[00:02:47] Emma: Decision confirmed: rollout remains September 2, but announcement waits for the signed addendum.`,
    summary:
      "Eight stakeholders kept the September 2 rollout date while delaying external announcement until the addendum is signed.",
    purpose:
      "Make a cross-functional enterprise-rollout readiness decision.",
    discussion: [
      "Technical, marketing, support, security, finance, customer success and legal work was reviewed.",
      "The unsigned data-processing addendum is the current blocker.",
      "A conditional staged-import contingency was assigned.",
    ],
    next: [
      "Run the import test.",
      "Obtain required signatures.",
      "Prepare training, support, finance and marketing deliverables.",
    ],
    decision:
      "Keep the September 2 rollout date, but delay external announcement until the addendum is signed.",
    tasks: [
      ["Run overnight import test", "Daniel", "Thursday", "00:00:16"],
      ["Send announcement draft", "Sofia", "Wednesday", "00:00:29"],
      ["Publish escalation guide", "Liam", "Before training", "00:00:42"],
      ["Obtain vendor exception", "Maya", "Friday", "00:00:56"],
      ["Update forecast", "Noah", "After seat-count confirmation", "00:01:10"],
      ["Host administrator training", "Chloe", "Next Tuesday", "00:01:24"],
      ["Obtain signed addendum", "Ethan", "Before external announcement", "00:01:39"],
      ["Conditional: Prepare staged-import plan", "Daniel", "If the overnight test fails", "00:02:08"],
    ],
    risks: [
      "The vendor-access exception may not be signed by Friday.",
    ],
    blockers: [
      "The customer has not signed the data-processing addendum.",
    ],
    questions: [
      "When will the customer confirm the final seat count?",
    ],
  },
];

function followUp(demo) {
  const tasks = demo.tasks
    .map(
      ([title, owner, deadline]) =>
        `- ${title} â€” Owner: ${owner}; Deadline: ${deadline}`,
    )
    .join("\n");

  return `Subject: Meeting follow-up â€” ${demo.title}

Hello everyone,

Summary
${demo.summary}

Decision
- ${demo.decision}

Action items
${tasks}

Risks
${
  demo.risks.length
    ? demo.risks.map((item) => `- ${item}`).join("\n")
    : "- None identified."
}

Blockers
${
  demo.blockers.length
    ? demo.blockers.map((item) => `- ${item}`).join("\n")
    : "- None identified."
}

Best regards`;
}

for (const demo of demos) {
  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("title", demo.title);

  if (existing?.length) {
    await supabase
      .from("meetings")
      .delete()
      .in(
        "id",
        existing.map((item) => item.id),
      );
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title: demo.title,
      meeting_date: demo.date,
      meeting_type: demo.type,
      status: "confirmed",
      raw_transcript: demo.transcript,
    })
    .select("id")
    .single();

  if (error || !meeting) {
    throw new Error(
      error?.message ||
        `Could not create ${demo.title}.`,
    );
  }

  await supabase
    .from("generated_outputs")
    .insert({
      meeting_id: meeting.id,
      short_summary: demo.summary,
      detailed_summary: {
        meetingPurpose: demo.purpose,
        mainDiscussionPoints: demo.discussion,
        nextSteps: demo.next,
      },
      follow_up_email: followUp(demo),
      project_status_update: demo.summary,
      open_questions: demo.questions,
      risks: demo.risks,
      blockers: demo.blockers,
    });

  await supabase
    .from("tasks")
    .insert(
      demo.tasks.map(
        ([title, owner, deadline, timestamp]) => ({
          meeting_id: meeting.id,
          title,
          description: title,
          owner_text: owner,
          deadline_text: deadline,
          priority: "unspecified",
          status: "To Do",
          source_timestamp: timestamp,
        }),
      ),
    );

  await supabase
    .from("decisions")
    .insert({
      meeting_id: meeting.id,
      text: demo.decision,
      topic: "Demo decision",
      source_timestamp: "00:02:47",
    });

  console.log(`Created ${demo.title}`);
}

console.log(
  "Three demo meetings are ready, including one eight-speaker meeting.",
);