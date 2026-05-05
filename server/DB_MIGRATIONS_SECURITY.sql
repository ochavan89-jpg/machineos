-- MachineOS security tables
-- Run this SQL in your Supabase SQL editor.

-- 1) Audit trail table for privileged actions
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid null,
  actor_role text null,
  action text not null,
  entity_type text null,
  entity_id text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- 2) Webhook idempotency table
create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  event_type text null,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_type on public.webhook_events (event_type);
create index if not exists idx_webhook_events_received_at on public.webhook_events (received_at desc);
