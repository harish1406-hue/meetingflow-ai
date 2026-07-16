import { getSupabaseAdmin } from "./supabase-server";

type SpeakerUtterance = {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number | null;
};

type SpeakerMapping = {
  speakerLabel: string;
  name: string;
  email: string;
  role: string;
  identityConfirmed: boolean;
  consentToVoiceProfile: boolean;
  matchedPersonId: string | null;
  profileJson: string | null;
  sampleSeconds: number;
};

export type SpeakerData = {
  utterances: SpeakerUtterance[];
  mappings: SpeakerMapping[];
};

async function findOrCreatePerson(
  mapping: SpeakerMapping,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  if (mapping.matchedPersonId) {
    const { data } = await supabase
      .from("people")
      .select("id")
      .eq("id", mapping.matchedPersonId)
      .maybeSingle();

    if (data) {
      await supabase
        .from("people")
        .update({
          name: mapping.name.trim(),
          email:
            mapping.email.trim().toLowerCase() ||
            null,
          role: mapping.role.trim() || null,
          last_matched_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", data.id);

      return data.id;
    }
  }

  const email =
    mapping.email.trim().toLowerCase();

  if (email) {
    const { data } = await supabase
      .from("people")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (data) {
      return data.id;
    }
  }

  const { data: matches } = await supabase
    .from("people")
    .select("id")
    .ilike("name", mapping.name.trim())
    .limit(1);

  if (matches && matches.length > 0) {
    return matches[0].id;
  }

  const { data, error } = await supabase
    .from("people")
    .insert({
      name: mapping.name.trim(),
      email: email || null,
      role: mapping.role.trim() || null,
      voice_profile_status: "none",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Could not create person: ${
        error?.message || "Unknown error"
      }`,
    );
  }

  return data.id;
}

export async function saveSpeakerData(
  meetingId: string,
  speakerData: SpeakerData,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const personBySpeaker = new Map<
    string,
    string
  >();

  for (const mapping of speakerData.mappings) {
    if (
      !mapping.identityConfirmed ||
      !mapping.name.trim()
    ) {
      continue;
    }

    const personId = await findOrCreatePerson(
      mapping,
    );

    personBySpeaker.set(
      mapping.speakerLabel,
      personId,
    );

    if (
      mapping.consentToVoiceProfile &&
      mapping.profileJson &&
      mapping.sampleSeconds >= 2
    ) {
      const { error } = await supabase
        .from("voice_profiles")
        .upsert(
          {
            person_id: personId,
            profile_type:
              "local_mfcc_v1",
            profile_data:
              mapping.profileJson,
            consent_status: "confirmed",
            deleted_at: null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "person_id",
          },
        );

      if (error) {
        throw new Error(
          `Could not save voice profile: ${error.message}`,
        );
      }

      await supabase
        .from("people")
        .update({
          voice_profile_status:
            "confirmed",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", personId);
    }
  }

  const rows = speakerData.utterances.map(
    (utterance) => ({
      meeting_id: meetingId,
      speaker_label: utterance.speaker,
      person_id:
        personBySpeaker.get(
          utterance.speaker,
        ) || null,
      start_time_ms: Math.round(
        utterance.start,
      ),
      end_time_ms: Math.round(
        utterance.end,
      ),
      text: utterance.text,
      confidence: utterance.confidence,
    }),
  );

  if (rows.length > 0) {
    const { error } = await supabase
      .from("speaker_segments")
      .insert(rows);

    if (error) {
      throw new Error(
        `Could not save speaker segments: ${error.message}`,
      );
    }
  }
}
