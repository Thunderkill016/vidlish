-- A TED talk in English was refused as `VIDEO_LANGUAGE_UNSUPPORTED`.
--
-- The gate was right about what it saw: the transcript came back with
-- `english_share = 0` and detected languages `arb, ilo` across 3080 words. It
-- was a translated caption track, not the speech.
--
-- The caption strategy asks for the "native" track and deliberately sends no
-- language override, because forcing `en` on a Spanish video would fetch an
-- English *translation* — and teaching from a translation breaks the one
-- invariant this product is built on: source quotes are exact spoken English.
--
-- YouTube's own `defaultAudioLanguage` settles it. When YouTube says the audio
-- is English, an English caption track is the original rather than a
-- translation, and asking for it is safe. It was read at validation time and
-- thrown away; now it is kept.
--
-- Nullable: plenty of videos declare nothing, and those keep the old behaviour
-- of taking whatever the native endpoint returns.

alter table public.videos
  add column if not exists declared_audio_language text;

alter table public.videos
  drop constraint if exists videos_declared_audio_language_format;

alter table public.videos
  add constraint videos_declared_audio_language_format check (
    declared_audio_language is null
    or declared_audio_language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$'
  );
