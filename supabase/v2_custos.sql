-- v2: custos mensais com rateio entre projetos
create table if not exists public.custos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null,
  conta text not null default 'Pessoal' check (conta in ('Pessoal','Lady')),
  moeda text not null default 'BRL' check (moeda in ('BRL','USD')),
  valor numeric not null default 0,
  data date not null default current_date,
  ativo boolean not null default true,
  fim date,
  rateio jsonb not null default '[]',
  created_at timestamptz default now()
);
alter table public.custos enable row level security;
drop policy if exists "dono" on public.custos;
create policy "dono" on public.custos for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
