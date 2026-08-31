-- LV8 Style Pick — Supabase schema
-- Run this complete file once in Supabase > SQL Editor.
-- Designed for the public browser client + authenticated LV8 administrators.

create table if not exists public.survey_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.styles (
  id text primary key,
  survey_id text not null,
  code text not null,
  audience text not null check (audience in ('men', 'women', 'both')),
  category text not null,
  name_ar text not null,
  name_en text not null,
  description_ar text not null default '',
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comparisons (
  id text primary key,
  survey_id text not null,
  audience text not null check (audience in ('men', 'women', 'both')),
  question_ar text not null,
  note_ar text not null default '',
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key,
  survey_id text not null,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  comparisons jsonb not null default '{}'::jsonb check (jsonb_typeof(comparisons) = 'object'),
  final_ranking jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  user_agent text
);

-- Safe upgrade for projects created before the final Top Five feature.
alter table public.survey_responses
  add column if not exists final_ranking jsonb not null default '[]'::jsonb;
alter table public.survey_responses
  drop constraint if exists survey_responses_final_ranking_check;
alter table public.survey_responses
  add constraint survey_responses_final_ranking_check
  check (jsonb_typeof(final_ranking) = 'array' and jsonb_array_length(final_ranking) <= 5);

create index if not exists styles_survey_status_sort_idx
  on public.styles (survey_id, status, sort_order, created_at);
create index if not exists comparisons_survey_status_sort_idx
  on public.comparisons (survey_id, status, sort_order, created_at);
create index if not exists responses_survey_submitted_idx
  on public.survey_responses (survey_id, submitted_at desc);

-- Keep the privileged admin lookup out of the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_survey_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.survey_admins
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_survey_admin() from public, anon;
grant execute on function private.is_survey_admin() to authenticated;

alter table public.survey_admins enable row level security;
alter table public.styles enable row level security;
alter table public.comparisons enable row level security;
alter table public.survey_responses enable row level security;

-- Explicit grants define the Data API surface; RLS then limits rows.
revoke all on table public.survey_admins from anon, authenticated;
revoke all on table public.styles from anon, authenticated;
revoke all on table public.comparisons from anon, authenticated;
revoke all on table public.survey_responses from anon, authenticated;

grant select on table public.styles, public.comparisons to anon;
grant insert on table public.survey_responses to anon;
grant select on table public.survey_admins to authenticated;
grant select, insert, update, delete on table public.styles, public.comparisons to authenticated;
grant select, insert on table public.survey_responses to authenticated;

drop policy if exists "admins read own admin row" on public.survey_admins;
create policy "admins read own admin row"
on public.survey_admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "public reads published styles" on public.styles;
create policy "public reads published styles"
on public.styles for select to anon, authenticated
using (status = 'published');

drop policy if exists "admins read all styles" on public.styles;
create policy "admins read all styles"
on public.styles for select to authenticated
using ((select private.is_survey_admin()));

drop policy if exists "admins insert styles" on public.styles;
create policy "admins insert styles"
on public.styles for insert to authenticated
with check ((select private.is_survey_admin()));

drop policy if exists "admins update styles" on public.styles;
create policy "admins update styles"
on public.styles for update to authenticated
using ((select private.is_survey_admin()))
with check ((select private.is_survey_admin()));

drop policy if exists "admins delete styles" on public.styles;
create policy "admins delete styles"
on public.styles for delete to authenticated
using ((select private.is_survey_admin()));

drop policy if exists "public reads published comparisons" on public.comparisons;
create policy "public reads published comparisons"
on public.comparisons for select to anon, authenticated
using (status = 'published');

drop policy if exists "admins read all comparisons" on public.comparisons;
create policy "admins read all comparisons"
on public.comparisons for select to authenticated
using ((select private.is_survey_admin()));

drop policy if exists "admins insert comparisons" on public.comparisons;
create policy "admins insert comparisons"
on public.comparisons for insert to authenticated
with check ((select private.is_survey_admin()));

drop policy if exists "admins update comparisons" on public.comparisons;
create policy "admins update comparisons"
on public.comparisons for update to authenticated
using ((select private.is_survey_admin()))
with check ((select private.is_survey_admin()));

drop policy if exists "admins delete comparisons" on public.comparisons;
create policy "admins delete comparisons"
on public.comparisons for delete to authenticated
using ((select private.is_survey_admin()));

drop policy if exists "public submits survey responses" on public.survey_responses;
create policy "public submits survey responses"
on public.survey_responses for insert to anon, authenticated
with check (
  char_length(survey_id) between 1 and 100
  and octet_length(answers::text) < 100000
  and octet_length(profile::text) < 10000
  and octet_length(comparisons::text) < 30000
  and octet_length(final_ranking::text) < 10000
  and jsonb_array_length(final_ranking) = 5
  and (
    select count(distinct ranked.style_id)
    from jsonb_array_elements_text(final_ranking) as ranked(style_id)
  ) = 5
  and not exists (
    select 1
    from jsonb_array_elements_text(final_ranking) as ranked(style_id)
    where not (answers ? ranked.style_id)
  )
);

drop policy if exists "admins read survey responses" on public.survey_responses;
create policy "admins read survey responses"
on public.survey_responses for select to authenticated
using ((select private.is_survey_admin()));

-- Public product imagery. Public retrieval is intentional; write access stays admin-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'survey-styles',
  'survey-styles',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads survey style images" on storage.objects;
drop policy if exists "admins read survey style object metadata" on storage.objects;
create policy "admins read survey style object metadata"
on storage.objects for select to authenticated
using (bucket_id = 'survey-styles' and (select private.is_survey_admin()));

drop policy if exists "admins upload survey style images" on storage.objects;
create policy "admins upload survey style images"
on storage.objects for insert to authenticated
with check (bucket_id = 'survey-styles' and (select private.is_survey_admin()));

drop policy if exists "admins update survey style images" on storage.objects;
create policy "admins update survey style images"
on storage.objects for update to authenticated
using (bucket_id = 'survey-styles' and (select private.is_survey_admin()))
with check (bucket_id = 'survey-styles' and (select private.is_survey_admin()));

drop policy if exists "admins delete survey style images" on storage.objects;
create policy "admins delete survey style images"
on storage.objects for delete to authenticated
using (bucket_id = 'survey-styles' and (select private.is_survey_admin()));

-- AFTER creating the first account in admin.html, copy its UUID from
-- Supabase > Authentication > Users and run this with the real values:
-- insert into public.survey_admins (user_id, email)
-- values ('YOUR-AUTH-USER-UUID', 'YOUR-EMAIL')
-- on conflict (user_id) do update set email = excluded.email;
