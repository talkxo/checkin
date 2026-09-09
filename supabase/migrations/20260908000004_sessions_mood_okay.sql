-- Mood grid v2 adds 'okay' (neutral). Old values stay valid for history.
alter table public.sessions drop constraint if exists sessions_mood_check;
alter table public.sessions add constraint sessions_mood_check
  check (mood in ('great', 'good', 'okay', 'challenging', 'exhausted', 'productive'));
