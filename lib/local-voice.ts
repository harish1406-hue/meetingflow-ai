import ffmpegPath from "ffmpeg-static";
import Meyda from "meyda";
import { spawn } from "node:child_process";

export type VoiceUtterance = {
  speaker: string;
  start: number;
  end: number;
  text: string;
};

export type StoredVoiceProfile = {
  personId: string;
  name: string;
  email: string | null;
  role: string | null;
  profileJson: string;
};

export type VoiceSuggestion = {
  personId: string;
  name: string;
  email: string | null;
  role: string | null;
  confidence: number;
};

export type VoiceResult = {
  profileJson: string | null;
  sampleSeconds: number;
  suggestion: VoiceSuggestion | null;
};

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 512;
const COEFFICIENTS = 13;

async function extractPcm(
  sourcePath: string,
  startMilliseconds: number,
  endMilliseconds: number,
): Promise<Float32Array> {
  if (!ffmpegPath) {
    throw new Error(
      "FFmpeg binary was not found.",
    );
  }

  const startSeconds = Math.max(
    0,
    startMilliseconds / 1000,
  );

  const durationSeconds = Math.min(
    12,
    Math.max(
      0.8,
      (endMilliseconds - startMilliseconds) / 1000,
    ),
  );

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(startSeconds),
    "-t",
    String(durationSeconds),
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    String(SAMPLE_RATE),
    "-f",
    "s16le",
    "pipe:1",
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            Buffer.concat(errors).toString("utf8") ||
              `FFmpeg exited with code ${code}.`,
          ),
        );
        return;
      }

      const buffer = Buffer.concat(chunks);
      const sampleCount = Math.floor(
        buffer.byteLength / 2,
      );

      const output = new Float32Array(
        sampleCount,
      );

      for (
        let index = 0;
        index < sampleCount;
        index += 1
      ) {
        output[index] =
          buffer.readInt16LE(index * 2) /
          32768;
      }

      resolve(output);
    });
  });
}

async function collectSpeakerAudio(
  sourcePath: string,
  utterances: VoiceUtterance[],
): Promise<Float32Array> {
  const selected = utterances
    .filter(
      (item) =>
        item.end - item.start >= 800,
    )
    .sort(
      (left, right) =>
        right.end -
        right.start -
        (left.end - left.start),
    )
    .slice(0, 8);

  const chunks: Float32Array[] = [];
  let totalSamples = 0;

  for (const item of selected) {
    if (
      totalSamples / SAMPLE_RATE >=
      40
    ) {
      break;
    }

    const chunk = await extractPcm(
      sourcePath,
      item.start,
      item.end,
    );

    if (chunk.length > 0) {
      chunks.push(chunk);
      totalSamples += chunk.length;
    }
  }

  const combined = new Float32Array(
    totalSamples,
  );

  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0,
    ) / values.length
  );
}

function standardDeviation(
  values: number[],
  average: number,
): number {
  if (values.length === 0) {
    return 0;
  }

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        (value - average) *
          (value - average),
      0,
    ) / values.length;

  return Math.sqrt(variance);
}

function normalizeVector(
  vector: number[],
): number[] {
  const magnitude = Math.sqrt(
    vector.reduce(
      (sum, value) =>
        sum + value * value,
      0,
    ),
  );

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(
    (value) => value / magnitude,
  );
}

function buildProfile(
  audio: Float32Array,
): {
  vector: number[];
  frameCount: number;
} | null {
  Meyda.sampleRate = SAMPLE_RATE;
  Meyda.bufferSize = FRAME_SIZE;
  Meyda.numberOfMFCCCoefficients =
    COEFFICIENTS;

  const coefficientValues = Array.from(
    { length: COEFFICIENTS },
    () => [] as number[],
  );

  const centroidValues: number[] = [];
  const flatnessValues: number[] = [];
  let frameCount = 0;

  for (
    let offset = 0;
    offset + FRAME_SIZE <= audio.length;
    offset += FRAME_SIZE
  ) {
    const frame = audio.slice(
      offset,
      offset + FRAME_SIZE,
    );

    const features = Meyda.extract(
      [
        "mfcc",
        "rms",
        "spectralCentroid",
        "spectralFlatness",
      ],
      frame,
    );

    if (
      !features ||
      typeof features.rms !== "number" ||
      features.rms < 0.01 ||
      !Array.isArray(features.mfcc)
    ) {
      continue;
    }

    frameCount += 1;

    for (
      let index = 0;
      index < COEFFICIENTS;
      index += 1
    ) {
      coefficientValues[index].push(
        features.mfcc[index] || 0,
      );
    }

    if (
      typeof features.spectralCentroid ===
      "number"
    ) {
      centroidValues.push(
        features.spectralCentroid /
          SAMPLE_RATE,
      );
    }

    if (
      typeof features.spectralFlatness ===
      "number"
    ) {
      flatnessValues.push(
        features.spectralFlatness,
      );
    }
  }

  if (frameCount < 20) {
    return null;
  }

  const vector: number[] = [];

  for (
    let index = 0;
    index < COEFFICIENTS;
    index += 1
  ) {
    const average = mean(
      coefficientValues[index],
    );

    vector.push(average);
    vector.push(
      standardDeviation(
        coefficientValues[index],
        average,
      ),
    );
  }

  vector.push(mean(centroidValues));
  vector.push(mean(flatnessValues));

  return {
    vector: normalizeVector(vector),
    frameCount,
  };
}

function cosineSimilarity(
  left: number[],
  right: number[],
): number {
  if (
    left.length === 0 ||
    left.length !== right.length
  ) {
    return -1;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    dot += left[index] * right[index];
    leftMagnitude +=
      left[index] * left[index];
    rightMagnitude +=
      right[index] * right[index];
  }

  if (
    leftMagnitude === 0 ||
    rightMagnitude === 0
  ) {
    return -1;
  }

  return (
    dot /
    Math.sqrt(
      leftMagnitude * rightMagnitude,
    )
  );
}

function suggestMatch(
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

export async function analyzeSpeakerVoice(
  sourcePath: string,
  utterances: VoiceUtterance[],
  storedProfiles: StoredVoiceProfile[],
): Promise<VoiceResult> {
  const audio = await collectSpeakerAudio(
    sourcePath,
    utterances,
  );

  const sampleSeconds =
    audio.length / SAMPLE_RATE;

  const profile = buildProfile(audio);

  if (!profile) {
    return {
      profileJson: null,
      sampleSeconds,
      suggestion: null,
    };
  }

  const profileJson = JSON.stringify({
    version: "local_mfcc_v1",
    sampleRate: SAMPLE_RATE,
    frameCount: profile.frameCount,
    vector: profile.vector,
  });

  return {
    profileJson,
    sampleSeconds,
    suggestion: suggestMatch(
      profile.vector,
      storedProfiles,
    ),
  };
}
