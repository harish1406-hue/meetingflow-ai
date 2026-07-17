# MeetingFlow AI

MeetingFlow AI is an upload-based meeting assistant that converts transcripts, audio recordings, and video recordings into structured business actions.

## Features

- Transcript input and transcript file upload
- Audio and video file upload
- Audio/video transcription
- Speaker diarization
- Manual speaker-to-person mapping
- Confirmed voice-profile storage
- Recurring-speaker suggestions
- Short and detailed meeting summaries
- Decisions and action items
- Owners, deadlines, risks, blockers, and open questions
- Editable review workflow
- Approval-required email sending
- Email-send history
- Meeting history
- Cross-meeting task dashboard
- People and voice-profile management
- Voice-profile deletion

## Technology

- Next.js
- TypeScript
- OpenAI
- AssemblyAI
- Supabase PostgreSQL
- Resend
- FFmpeg
- Meyda MFCC acoustic features

## Local setup

Install dependencies:

```powershell
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env.local
```

Add your own credentials to `.env.local`, then start the application:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

Never commit `.env.local`.

## Sample meetings

The `sample-meetings` folder contains staged input transcripts for testing the application.

Sample meetings must be processed through the frontend. The repository does not insert pre-generated meeting records directly into Supabase.

## Voice-profile prototype

The application creates derived numerical acoustic profiles from confirmed speaker audio.

Future recordings are compared with saved profiles to suggest likely recurring speakers. Suggestions require manual confirmation and are not intended for biometric authentication.

## Video support

Video files are supported through their audio track. Video frames, faces, slides, screen content, and gestures are not analysed.

## Quality checks

```powershell
npm run lint
npm run build
```

## Current limitations

- Speaker recognition is a lightweight prototype.
- Accuracy depends on recording quality and sufficient clean speech.
- Overlapping speech can reduce diarization quality.
- Audio/video processing is upload-based rather than real-time.
- Automatic meeting-bot joining is not included.
- Enterprise authentication and permissions are outside the MVP.
- Production use would require additional security and privacy review.

## Recommended next steps

- Replace MFCC-only matching with a production speaker-embedding model.
- Add authentication and organization-level permissions.
- Add background jobs for long audio and video files.
- Add meeting deletion and retention controls.
- Add automated tests and monitoring.
- Add calendar and meeting-platform integrations.