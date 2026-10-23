-- Controle de Projetos — rodar no Supabase SQL Editor
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null default 'Novo projeto',
  cliente text default '',
  conta text not null default 'Pessoal' check (conta in ('Pessoal','Lady')),
  tipo text not null default 'Sistema' check (tipo in ('Sistema','Arte gráfica')),
  status text not null default 'Ativo' check (status in ('Ativo','Pausado','Concluído')),
  inicio date default current_date,
  horas numeric default 0,
  valor_hora numeric default 0,
  margem numeric default 30,
  manutencao numeric default 0,
  valor_fechado numeric default 0,
  obs text default '',
  links jsonb not null default '[]',
  acessos jsonb not null default '[]',
  created_at timestamptz default now()
);

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  tipo text not null check (tipo in ('assinatura','custo','receita')),
  descricao text not null,
  moeda text not null default 'BRL' check (moeda in ('BRL','USD')),
  valor numeric not null default 0,
  data date not null default current_date,
  ativo boolean not null default true,
  fim date,
  created_at timestamptz default now()
);

create table if not exists public.config (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  usd numeric not null default 5.4
);

alter table public.projetos enable row level security;
alter table public.lancamentos enable row level security;
alter table public.config enable row level security;

drop policy if exists "dono" on public.projetos;
drop policy if exists "dono" on public.lancamentos;
drop policy if exists "dono" on public.config;
create policy "dono" on public.projetos for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dono" on public.lancamentos for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "dono" on public.config for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists lanc_projeto_idx on public.lancamentos(projeto_id);
