create table public.decks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  new_per_day int not null default 10,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null,
  note_id uuid,
  front text not null,
  back text not null,
  suspended boolean not null default false,
  due timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days double precision not null,
  scheduled_days double precision not null,
  reps int not null,
  lapses int not null,
  state text not null check (state in ('new','learning','review','relearning')),
  last_review timestamptz,
  content_updated_at timestamptz not null,
  srs_updated_at timestamptz not null,
  created_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  status text not null check (status in ('inbox','converted','archived')),
  card_ids uuid[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.review_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null,
  rating smallint not null check (rating between 1 and 4),
  state_before text not null check (state_before in ('new','learning','review','relearning')),
  due_before timestamptz not null,
  stability_after double precision not null,
  difficulty_after double precision not null,
  scheduled_days_after double precision not null,
  reviewed_at timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = now();
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['decks','cards','notes','review_logs'] loop
    execute format(
      'create trigger trg_%s_touch before insert or update on public.%s
       for each row execute function public.touch_server_updated_at()', t, t);
  end loop;
end
$$;

create or replace function public.upsert_deck(d jsonb)
returns void
language plpgsql
security invoker
as $$
declare nd public.decks;
begin
  nd := jsonb_populate_record(null::public.decks, d);
  insert into public.decks
    (id, user_id, name, new_per_day, created_at, updated_at, deleted_at)
  values
    (nd.id, nd.user_id, nd.name, nd.new_per_day, nd.created_at, nd.updated_at, nd.deleted_at)
  on conflict (id) do update set
    name = excluded.name,
    new_per_day = excluded.new_per_day,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where excluded.updated_at > public.decks.updated_at;
end
$$;

create or replace function public.upsert_note(n jsonb)
returns void
language plpgsql
security invoker
as $$
declare nn public.notes;
begin
  nn := jsonb_populate_record(null::public.notes, n);
  insert into public.notes
    (id, user_id, body, status, card_ids, created_at, updated_at, deleted_at)
  values
    (nn.id, nn.user_id, nn.body, nn.status, nn.card_ids, nn.created_at, nn.updated_at, nn.deleted_at)
  on conflict (id) do update set
    body = excluded.body,
    status = excluded.status,
    card_ids = excluded.card_ids,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where excluded.updated_at > public.notes.updated_at;
end
$$;

create or replace function public.upsert_card(c jsonb)
returns void
language plpgsql
security invoker
as $$
declare nc public.cards;
begin
  nc := jsonb_populate_record(null::public.cards, c);
  insert into public.cards
    (
      id, user_id, deck_id, note_id, front, back, suspended, due, stability,
      difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review,
      content_updated_at, srs_updated_at, created_at, deleted_at
    )
  values
    (
      nc.id, nc.user_id, nc.deck_id, nc.note_id, nc.front, nc.back, nc.suspended, nc.due,
      nc.stability, nc.difficulty, nc.elapsed_days, nc.scheduled_days, nc.reps, nc.lapses,
      nc.state, nc.last_review, nc.content_updated_at, nc.srs_updated_at, nc.created_at,
      nc.deleted_at
    )
  on conflict (id) do update set
    deck_id = case when excluded.content_updated_at > public.cards.content_updated_at then excluded.deck_id else public.cards.deck_id end,
    front = case when excluded.content_updated_at > public.cards.content_updated_at then excluded.front else public.cards.front end,
    back = case when excluded.content_updated_at > public.cards.content_updated_at then excluded.back else public.cards.back end,
    suspended = case when excluded.content_updated_at > public.cards.content_updated_at then excluded.suspended else public.cards.suspended end,
    note_id = case when excluded.content_updated_at > public.cards.content_updated_at then excluded.note_id else public.cards.note_id end,
    content_updated_at = greatest(excluded.content_updated_at, public.cards.content_updated_at),
    due = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.due else public.cards.due end,
    stability = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.stability else public.cards.stability end,
    difficulty = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.difficulty else public.cards.difficulty end,
    elapsed_days = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.elapsed_days else public.cards.elapsed_days end,
    scheduled_days = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.scheduled_days else public.cards.scheduled_days end,
    reps = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.reps else public.cards.reps end,
    lapses = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.lapses else public.cards.lapses end,
    state = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.state else public.cards.state end,
    last_review = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.last_review else public.cards.last_review end,
    srs_updated_at = greatest(excluded.srs_updated_at, public.cards.srs_updated_at),
    deleted_at = case
      when excluded.deleted_at is not null
        and (
          excluded.content_updated_at > public.cards.content_updated_at
          or excluded.srs_updated_at > public.cards.srs_updated_at
        )
      then excluded.deleted_at
      else public.cards.deleted_at
    end;
end
$$;

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.notes enable row level security;
alter table public.review_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['decks','cards','notes','review_logs'] loop
    execute format(
      'create policy %s_owner on public.%s
       for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end
$$;

create index decks_user_server_updated_idx on public.decks (user_id, server_updated_at);
create index cards_user_server_updated_idx on public.cards (user_id, server_updated_at);
create index notes_user_server_updated_idx on public.notes (user_id, server_updated_at);
create index review_logs_user_server_updated_idx on public.review_logs (user_id, server_updated_at);
