-- 1) Auto-promote winners: flag + cooldown timestamp
alter table public.descriptions add column if not exists high_quality boolean default false;
alter table public.descriptions add column if not exists copied_all_at timestamptz;
create index if not exists idx_desc_high_quality on public.descriptions(high_quality) where high_quality = true;
create index if not exists idx_desc_copied_all on public.descriptions(copied_all_at) where copied_all_at is not null;

-- 2) Bundle vs single segmentation
alter table public.descriptions add column if not exists is_bundle boolean default false;
create index if not exists idx_desc_is_bundle on public.descriptions(is_bundle);

-- 3) Bundle vs single metrics view
create or replace view public.bundle_vs_single_metrics as
select
  d.is_bundle,
  d.platform,
  count(distinct d.id) as total,
  count(distinct f.id) filter (where f.action = 'copy_raw' and f.field = 'all') as copy_all_count,
  count(distinct f.id) filter (where f.action = 'retry') as retries,
  count(distinct f.id) filter (where f.action = 'refine') as refines,
  round(
    count(distinct f.id) filter (where f.action = 'copy_raw' and f.field = 'all')::numeric
    / nullif(count(distinct d.id), 0), 3
  ) as copy_all_rate,
  avg(d.quality_score) as avg_quality_score
from public.descriptions d
left join public.description_feedback f on f.description_id = d.id
group by d.is_bundle, d.platform;
