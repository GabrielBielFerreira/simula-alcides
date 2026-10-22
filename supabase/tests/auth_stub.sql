-- Imitação mínima do esquema `auth` do Supabase, para rodar os testes do
-- banco num PostgreSQL comum (ver README, "Testes do banco").
-- NÃO rodar num projeto Supabase de verdade.

-- Papéis são globais no servidor: só cria se ainda não existirem.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
