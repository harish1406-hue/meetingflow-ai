import fs from "node:fs";

const voicePath = "lib/local-voice.ts";
let voiceSource = fs.readFileSync(
  voicePath,
  "utf8",
);

const functionStart =
  voiceSource.indexOf(
    "function suggestMatch(",
  );

const functionEnd =
  voiceSource.indexOf(
    "\nexport async function analyzeSpeakerVoice",
    functionStart,
  );

if (
  functionStart === -1 ||
  functionEnd === -1
) {
  throw new Error(
    "Could not locate suggestMatch in lib/local-voice.ts.",
  );
}

const replacement = `function suggestMatch(
  vector: number[],
  storedProfiles: StoredVoiceProfile[],
): VoiceSuggestion | null {
  const candidates: Array<{
    person: StoredVoiceProfile;
    similarity: number;
  }> = [];

  for (const person of storedProfiles) {
    try {
      const parsed = JSON.parse(
        person.profileJson,
      ) as {
        vector?: number[];
      };

      if (!Array.isArray(parsed.vector)) {
        continue;
      }

      const similarity = cosineSimilarity(
        vector,
        parsed.vector,
      );

      if (Number.isFinite(similarity)) {
        candidates.push({
          person,
          similarity,
        });
      }
    } catch {
      // Ignore invalid stored profiles.
    }
  }

  candidates.sort(
    (left, right) =>
      right.similarity - left.similarity,
  );

  const best = candidates[0];

  if (!best) {
    return null;
  }

  const second = candidates[1];

  const margin = second
    ? best.similarity - second.similarity
    : 1;

  const minimumSimilarity = 0.985;

  const minimumMargin =
    candidates.length > 1
      ? 0.012
      : 0;

  if (
    best.similarity < minimumSimilarity ||
    margin < minimumMargin
  ) {
    return null;
  }

  const similarityComponent = Math.max(
    0,
    Math.min(
      70,
      ((best.similarity - 0.9) / 0.1) *
        70,
    ),
  );

  const separationComponent = Math.max(
    0,
    Math.min(
      30,
      (margin / 0.05) * 30,
    ),
  );

  const score = Math.min(
    95,
    Math.round(
      similarityComponent +
        separationComponent,
    ),
  );

  return {
    personId: best.person.personId,
    name: best.person.name,
    email: best.person.email,
    role: best.person.role,
    confidence: score,
  };
}
`;

voiceSource =
  voiceSource.slice(0, functionStart) +
  replacement +
  voiceSource.slice(functionEnd);

fs.writeFileSync(
  voicePath,
  voiceSource,
  "utf8",
);

const pagePath =
  "app/audio-meeting/page.tsx";

let pageSource = fs.readFileSync(
  pagePath,
  "utf8",
);

pageSource = pageSource.replaceAll(
  "Prototype confidence:",
  "Similarity score:",
);

fs.writeFileSync(
  pagePath,
  pageSource,
  "utf8",
);

console.log(
  "Voice-match ambiguity protection installed.",
);
