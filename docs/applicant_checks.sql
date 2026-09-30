-- 지원자 체크리스트 저장용 표 (applicant.html)
-- 실행: Supabase 대시보드 → 교육 사이트 프로젝트(xvtixgncxzhqgjtcyngb) → SQL Editor 에 붙여 넣고 Run
-- 다른 프로젝트·다른 표는 건드리지 않습니다. 새 표 하나와 그 표의 접근 규칙만 만듭니다.

create table if not exists public.applicant_checks (
  id              text primary key,             -- 앱이 만드는 고유 id
  name            text not null,                -- 이름만 저장 (연락처·나이 등 개인정보는 넣지 않음)
  interview_date  date,
  status          text not null default 'self', -- self(지원자 작성 중) · review(면접관 확인 대기) · done(확인 완료)
  self            jsonb not null default '{}',  -- 지원자가 고른 답
  confirmed       jsonb not null default '{}',  -- 면접관이 확인한 답
  memo            text default '',
  self_done_at    timestamptz,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.applicant_checks enable row level security;

-- 접근 규칙: 교육 사이트는 비밀번호로 막혀 있고, 페이지는 공개(anon) 키로 이 표를 읽고 씁니다.
-- training_progress 와 같은 방식입니다. 공개 키를 아는 사람은 이 표를 읽을 수 있으니,
-- 이름 외의 개인정보는 넣지 말고, 채용이 끝난 기록은 앱의 '삭제' 버튼으로 지우세요.
create policy "applicant_checks anon read"   on public.applicant_checks for select to anon using (true);
create policy "applicant_checks anon insert" on public.applicant_checks for insert to anon with check (true);
create policy "applicant_checks anon update" on public.applicant_checks for update to anon using (true) with check (true);
create policy "applicant_checks anon delete" on public.applicant_checks for delete to anon using (true);
