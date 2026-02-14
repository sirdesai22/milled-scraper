-- Job logs for run view (Trigger.dev-style UI)
create table if not exists job_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references scrape_jobs(id) on delete cascade,
  source text not null,
  message text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists job_logs_job_id_idx on job_logs(job_id);
create index if not exists job_logs_created_at_idx on job_logs(created_at);

-- RLS: table only accessible via service role (Next.js API uses service role; RLS is bypassed).
-- No policy = no access for anon/authenticated; service role still has full access.
alter table job_logs enable row level security;
