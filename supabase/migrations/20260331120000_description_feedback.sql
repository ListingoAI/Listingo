-- Feedback tracking: copy / retry / refine events per description
create table public.description_feedback (
  id uuid primary key default gen_random_uuid(),
  description_id uuid references public.descriptions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null,
  prompt_version text,
  action text not null check (action in ('copy_raw', 'copy_edited', 'retry', 'refine')),
  field text check (field is null or field in ('seoTitle', 'shortDescription', 'longDescription', 'tags', 'meta', 'all')),
  edit_diff text,
  created_at timestamptz default now()
);

create index idx_df_desc on public.description_feedback(description_id);
create index idx_df_user on public.description_feedback(user_id);
create index idx_df_action on public.description_feedback(action);

-- Aggregate view: prompt quality metrics per version + platform
create or replace view public.prompt_version_metrics as
select
  d.prompt_version,
  d.platform,
  count(distinct d.id) as total_generations,
  avg(d.quality_score) as avg_quality_score,
  count(distinct f.id) filter (where f.action = 'copy_raw') as copies_raw,
  count(distinct f.id) filter (where f.action = 'retry') as retries,
  count(distinct f.id) filter (where f.action = 'refine') as refines
from public.descriptions d
left join public.description_feedback f on f.description_id = d.id
group by d.prompt_version, d.platform;
