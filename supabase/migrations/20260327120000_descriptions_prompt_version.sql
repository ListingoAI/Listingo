-- Wersja promptu przy generacji (metryki, debug, zgodność wyników)
alter table public.descriptions
  add column if not exists prompt_version text;

comment on column public.descriptions.prompt_version is 'Wersja DESCRIPTION_PROMPT_VERSION użyta przy generacji (lib/prompts/description-generator).';
