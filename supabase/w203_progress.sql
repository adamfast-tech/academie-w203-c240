-- Académie W203 : table de progression (projet Supabase partagé avec les autres académies)
create table if not exists public.w203_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  xp integer not null default 0,
  lessons_done integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint w203_state_object check (jsonb_typeof(state) = 'object'),
  constraint w203_state_size check (octet_length(state::text) <= 400000)
);

create or replace function public.w203_progress_summary()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.xp := least(greatest(coalesce(case when jsonb_typeof(new.state -> 'xp') = 'number' then (new.state ->> 'xp')::numeric end, 0), 0), 100000)::int;
  new.lessons_done := case when jsonb_typeof(new.state -> 'done') = 'object'
    then (select count(*) from jsonb_each(new.state -> 'done') d where d.value = 'true'::jsonb)::int else 0 end;
  new.updated_at := now();
  return new;
end $$;

create trigger w203_progress_summary before insert or update on public.w203_progress
  for each row execute function public.w203_progress_summary();

alter table public.w203_progress enable row level security;
create policy "Lire sa progression W203" on public.w203_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Créer sa progression W203" on public.w203_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Mettre à jour sa progression W203" on public.w203_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
