-- Beta signup goals: what the organisation wants out of INSYDE.
-- Multi-select from a fixed set of four, capped at three by the API.

alter table public.beta_signups add column if not exists goals text[] not null default '{}';
