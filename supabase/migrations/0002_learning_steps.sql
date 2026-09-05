alter table public.cards add column if not exists learning_steps integer not null default 0;

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
      difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, learning_steps,
      content_updated_at, srs_updated_at, created_at, deleted_at
    )
  values
    (
      nc.id, nc.user_id, nc.deck_id, nc.note_id, nc.front, nc.back, nc.suspended, nc.due,
      nc.stability, nc.difficulty, nc.elapsed_days, nc.scheduled_days, nc.reps, nc.lapses,
      nc.state, nc.last_review, coalesce(nc.learning_steps, 0), nc.content_updated_at, nc.srs_updated_at, nc.created_at,
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
    learning_steps = case when excluded.srs_updated_at > public.cards.srs_updated_at then excluded.learning_steps else public.cards.learning_steps end,
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


