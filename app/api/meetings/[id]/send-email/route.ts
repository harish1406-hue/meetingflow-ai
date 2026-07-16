import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const recipients = Array.isArray(
      requestBody.recipients,
    )
      ? requestBody.recipients
          .filter(
            (value): value is string =>
              typeof value === "string",
          )
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.length > 3 &&
              value.includes("@"),
          )
      : [];

    const subject =
      typeof requestBody.subject === "string"
        ? requestBody.subject.trim()
        : "";

    const emailBody =
      typeof requestBody.body === "string"
        ? requestBody.body.trim()
        : "";

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error:
            "Enter at least one valid recipient email.",
        },
        { status: 400 },
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Email subject is required." },
        { status: 400 },
      );
    }

    if (!emailBody) {
      return NextResponse.json(
        { error: "Email body is empty." },
        { status: 400 },
      );
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const resendFrom =
      process.env.RESEND_FROM;

    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY is missing from .env.local.",
        },
        { status: 500 },
      );
    }

    if (!resendFrom) {
      return NextResponse.json(
        {
          error:
            "RESEND_FROM is missing from .env.local.",
        },
        { status: 500 },
      );
    }

    const supabase = getSupabaseAdmin();

    const {
      data: meeting,
      error: meetingError,
    } = await supabase
      .from("meetings")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();

    if (meetingError) {
      throw new Error(meetingError.message);
    }

    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found." },
        { status: 404 },
      );
    }

    if (meeting.status !== "confirmed") {
      return NextResponse.json(
        {
          error:
            "Confirm the final notes before sending.",
        },
        { status: 409 },
      );
    }

    const resend = new Resend(resendApiKey);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const result = await resend.emails.send({
        from: resendFrom,
        to: recipient,
        subject,
        text: emailBody,
      });

      const status = result.error
        ? "failed"
        : "sent";

      if (result.error) {
        failedCount += 1;
      } else {
        sentCount += 1;
      }

      const { error: logError } =
        await supabase
          .from("email_send_logs")
          .insert({
            meeting_id: id,
            recipient_email: recipient,
            subject,
            sent_at:
              new Date().toISOString(),
            status,
            provider_message_id:
              result.data?.id || null,
            error_message:
              result.error?.message || null,
          });

      if (logError) {
        console.error(
          "Could not save email log:",
          logError,
        );
      }
    }

    return NextResponse.json({
      success: failedCount === 0,
      sentCount,
      failedCount,
    });
  } catch (error) {
    console.error(
      "Email sending failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Email sending failed.",
      },
      { status: 500 },
    );
  }
}
