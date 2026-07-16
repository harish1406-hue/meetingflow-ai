# MeetingFlow AI

MeetingFlow AI converts meeting transcripts and recordings into reviewed and confirmed actions.

## Features

- Transcript processing
- Audio/video transcription
- Speaker diarization
- Manual speaker mapping
- Local MFCC recurring-speaker suggestions
- Summaries, decisions and tasks
- Owners, explicit deadlines and relative deadlines
- Conditional tasks
- Risks, blockers and open questions
- Human review and confirmation
- Follow-up email generation and sending
- Meeting history and task list
- People and voice-profile management
- Voice-profile deletion
- Three seeded demo meetings
- One eight-speaker demo

## Stack

- Next.js
- OpenAI
- AssemblyAI
- Supabase
- Resend
- FFmpeg
- Meyda MFCC features

The voice similarity feature is a lightweight prototype, not biometric authentication.

## Local setup

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required runtime environment variables

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ASSEMBLYAI_API_KEY=
RESEND_API_KEY=
RESEND_FROM=MeetingFlow <onboarding@resend.dev>
```

Never commit `.env.local`.

## Demo data

```powershell
node scripts/seed-demo-data.mjs
node scripts/verify-final.mjs
```

## Quality checks

```powershell
npm run lint
npm run build
```

## Health check

Open `/api/health`.

## Demo limitations

- Speaker suggestions require manual confirmation.
- Similarity scores are not identity probabilities.
- Accuracy depends on clean speech and recording conditions.
- Authentication and enterprise permissions are outside this MVP.