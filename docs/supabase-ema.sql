-- Mural de ema da estação do fim da linha
-- Rode no Supabase: SQL Editor → New query → cole e execute.
create table if not exists public.ema (
  id         bigint generated always as identity primary key,
  nome       text not null check (char_length(nome) between 1 and 30),
  recado     text not null check (char_length(recado) between 2 and 140),
  cor        text not null default 'madeira',
  aprovado   boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- Ninguém acessa a tabela direto do navegador: só a rota /api/ema, com a chave service_role.
alter table public.ema enable row level security;
