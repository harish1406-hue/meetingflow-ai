# Sample meetings

The files in this folder are staged demonstration inputs.

They are not processed meeting records and are not inserted directly into Supabase.

## Meeting 1 â€” Online agency campaign

File:

```text
01-online-agency-campaign-transcript.txt
```

Four participants. Process this sample through Transcript Meeting.

## Meeting 2 â€” Client AI automation project

File:

```text
02-client-ai-automation-transcript.txt
```

Five participants. Record it with consenting participants and process the recording through Audio / Video Meeting.

## Meeting 3 â€” In-person room meeting

File:

```text
03-eight-speaker-room-transcript.txt
```

Eight participants. Record it in one room and process the recording through Audio / Video Meeting.

## Meeting 4 â€” Recurring-speaker test

File:

```text
04-recurring-speaker-test-transcript.txt
```

Use some of the same consenting participants from Meeting 2 with different sentences. This demonstrates recurring-speaker suggestions and manual confirmation.

## Reviewer workflow

1. Install dependencies.
2. Configure `.env.local`.
3. Run `npm run dev`.
4. Process Meeting 1 through transcript input.
5. Process recorded Meetings 2 and 3 through audio upload.
6. Confirm speaker mappings and save voice profiles.
7. Review and confirm generated outputs.
8. Send the approved follow-up email.
9. Inspect Meeting History, All Tasks, and People.
10. Upload Meeting 4 and review recurring-speaker suggestions.

Audio recordings are not automatically generated or injected by the repository.