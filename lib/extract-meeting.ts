import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  owner: z.string(),
  deadline: z.string(),
  priority: z.enum([
    "unspecified",
    "low",
    "medium",
    "high",
  ]),
  status: z.enum(["To Do", "In Progress", "Done"]),
  sourceTimestamp: z.string().nullable(),
  taskType: z.enum(["standard", "conditional"]),
  condition: z.string().nullable(),
});

const DecisionSchema = z.object({
  text: z.string(),
  topic: z.string(),
  timestamp: z.string().nullable(),
});

const ModelOutputSchema = z.object({
  shortSummary: z.string(),

  detailedSummary: z.object({
    meetingPurpose: z.string(),
    mainDiscussionPoints: z.array(z.string()),
    nextSteps: z.array(z.string()),
  }),

  tasks: z.array(TaskSchema),
  decisions: z.array(DecisionSchema),

  projectStatusUpdate: z.string(),
  openQuestions: z.array(z.string()),
  risks: z.array(z.string()),
  blockers: z.array(z.string()),
});

export type MeetingOutput = z.infer<typeof ModelOutputSchema> & {
  followUpEmail: string;
};

type ExtractMeetingInput = {
  title: string;
  meetingDate: string;
  meetingType: string;
  transcript: string;
};

function normalizeConditionalTask(
  task: z.infer<typeof TaskSchema>,
): z.infer<typeof TaskSchema> {
  if (task.taskType !== "conditional") {
    return task;
  }

  const title = task.title
    .toLowerCase()
    .startsWith("conditional:")
    ? task.title
    : `Conditional: ${task.title}`;

  const condition =
    task.condition?.trim() ||
    "Condition not specified";

  const description = task.description
    .toLowerCase()
    .startsWith("condition:")
    ? task.description
    : `Condition: ${condition}. ${task.description}`;

  return {
    ...task,
    title,
    condition,
    description,
  };
}

function buildFollowUpEmail(
  title: string,
  output: z.infer<typeof ModelOutputSchema>,
): string {
  const decisions =
    output.decisions.length > 0
      ? output.decisions
          .map((item) => `- ${item.text}`)
          .join("\n")
      : "- No confirmed decisions were recorded.";

  const tasks =
    output.tasks.length > 0
      ? output.tasks
          .map((task) => {
            const condition =
              task.taskType === "conditional" &&
              task.condition
                ? `; Condition: ${task.condition}`
                : "";

            return `- ${task.title} — Owner: ${task.owner}; Deadline: ${task.deadline}${condition}`;
          })
          .join("\n")
      : "- No action items were recorded.";

  const risks =
    output.risks.length > 0
      ? output.risks
          .map((item) => `- ${item}`)
          .join("\n")
      : "- None identified.";

  const blockers =
    output.blockers.length > 0
      ? output.blockers
          .map((item) => `- ${item}`)
          .join("\n")
      : "- None identified.";

  const nextSteps =
    output.detailedSummary.nextSteps.length > 0
      ? output.detailedSummary.nextSteps
          .map((item) => `- ${item}`)
          .join("\n")
      : "- Review the action items above.";

  return `Subject: Meeting follow-up — ${title}

Hello everyone,

Thank you for the meeting. Below is the confirmed follow-up.

Summary
${output.shortSummary}

Decisions
${decisions}

Action items
${tasks}

Risks
${risks}

Blockers
${blockers}

Next steps
${nextSteps}

Please reply with any corrections before these notes are treated as final.

Best regards`;
}

export async function extractMeetingOutputs(
  input: ExtractMeetingInput,
): Promise<MeetingOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing from .env.local.",
    );
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",

    input: [
      {
        role: "system",
        content: `
You are an AI Meeting-to-Tasks extraction system.

Extract every genuine action, assignment, commitment,
follow-up, communication action, documentation action,
scheduling action and contingency action.

A task remains valid when it has no deadline, has a relative
deadline, is a small communication or documentation action,
or is conditional on a future event.

Look carefully for: send, post, share, document, prepare,
schedule, contact, confirm, check, review, create, update,
recruit, draft, clean up, follow up, build, coordinate,
arrange and notify.

Never merge separate commitments merely because they share
an owner.

OWNERS
- Never invent an owner.
- Use "Unassigned" when ownership is unclear.

DEADLINES
- Never invent a deadline.
- Preserve relative deadlines exactly as stated.
- Use "Not specified" only when no timing condition exists.

PRIORITY
- Never infer priority.
- Use "unspecified" unless priority is explicitly stated.

CONDITIONAL TASKS
- Extract clear conditional commitments.
- Set taskType to "conditional".
- Store the exact trigger in condition.
- Do not present them as unconditional tasks.

DECISIONS
- Extract only confirmed decisions.

RISKS AND BLOCKERS
- A blocker currently prevents progress.
- A risk could cause a future problem.

Before returning, scan every speaker turn again for small
updates, documentation work, backup plans, relative deadlines,
no-deadline tasks and conditional commitments.

Use source timestamps when present.
        `.trim(),
      },
      {
        role: "user",
        content: `
Meeting title: ${input.title}
Meeting date: ${input.meetingDate || "Not specified"}
Meeting type: ${input.meetingType}

TRANSCRIPT

${input.transcript}
        `.trim(),
      },
    ],

    text: {
      format: zodTextFormat(
        ModelOutputSchema,
        "meeting_output",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error(
      response.output_text ||
        "OpenAI did not return valid structured output.",
    );
  }

  const normalized = {
    ...response.output_parsed,
    tasks: response.output_parsed.tasks.map(
      normalizeConditionalTask,
    ),
  };

  return {
    ...normalized,
    followUpEmail: buildFollowUpEmail(
      input.title,
      normalized,
    ),
  };
}
