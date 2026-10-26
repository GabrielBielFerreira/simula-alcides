-- Simula Alcides: redação escrita à mão, enviada por foto.
--
-- * O estudante tira foto da folha; o navegador envia a imagem (já reduzida) para o bucket
--   privado redacoes-fotos, na pasta com o próprio id: <uid>/<arquivo>.jpg.
-- * O servidor do site reserva uma leitura (reservar_transcricao, limite diário), baixa as
--   fotos com a sessão do estudante e pede ao Gemini a transcrição. O estudante confere o
--   texto e envia pelo enviar_redacao_com_fotos, que guarda as fotos junto da redação.
-- * Quem vê a redação (o próprio estudante, a coordenação do polo, administração) vê as fotos.

alter table redacoes
  add column fotos text[] not null default '{}';

create table transcricoes_redacao (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null references perfis (id) on delete cascade,
  fotos int not null default 1,
  created_at timestamptz not null default now()
);
create index transcricoes_redacao_estudante on transcricoes_redacao (estudante_id, created_at desc);
alter table transcricoes_redacao enable row level security;
-- Sem políticas: só as funções abaixo (security definer) mexem nela.

-- ---------------------------------------------------------------------------
-- Storage: bucket privado, cada estudante grava só na própria pasta
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('redacoes-fotos', 'redacoes-fotos', false, 6291456,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy redacoes_fotos_envio on storage.objects for insert to authenticated
  with check (bucket_id = 'redacoes-fotos'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy redacoes_fotos_leitura on storage.objects for select to authenticated
  using (bucket_id = 'redacoes-fotos'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or meu_papel() = 'professor'
              or exists (select 1 from perfis p
                          where p.id::text = (storage.foldername(name))[1]
                            and posso_ver_estudante(p.id))));

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------

create function limite_transcricoes_dia() returns int
language sql immutable as $$ select 8 $$;

-- Reserva uma leitura de foto pela IA; devolve o id do estudante (dono da pasta das fotos).
create function reservar_transcricao(p_fotos int) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_hoje int;
begin
  if auth.uid() is null or not exists (select 1 from perfis where id = auth.uid()) then
    raise exception 'sem_login';
  end if;
  if p_fotos is null or p_fotos < 1 or p_fotos > 3 then raise exception 'fotos_invalidas'; end if;
  select count(*) into v_hoje
    from transcricoes_redacao
   where estudante_id = auth.uid()
     and created_at >= (date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife');
  if v_hoje >= limite_transcricoes_dia() then raise exception 'limite_transcricao'; end if;
  insert into transcricoes_redacao (estudante_id, fotos) values (auth.uid(), p_fotos);
  return auth.uid();
end
$$;

-- Envia a redação (mesmas regras do enviar_redacao) e guarda as fotos da folha.
create function enviar_redacao_com_fotos(p_proposta uuid, p_texto text, p_fotos text[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fotos text[] := coalesce(p_fotos, '{}');
  v_id uuid;
  f text;
begin
  if cardinality(v_fotos) > 3 then raise exception 'fotos_invalidas'; end if;
  foreach f in array v_fotos loop
    if f is null
       or split_part(f, '/', 1) <> auth.uid()::text
       or not exists (select 1 from storage.objects o
                       where o.bucket_id = 'redacoes-fotos' and o.name = f) then
      raise exception 'fotos_invalidas';
    end if;
  end loop;
  v_id := enviar_redacao(p_proposta, p_texto);
  update redacoes set fotos = v_fotos where id = v_id;
  return v_id;
end
$$;

revoke all on function limite_transcricoes_dia() from public, anon;
revoke all on function reservar_transcricao(int) from public, anon;
revoke all on function enviar_redacao_com_fotos(uuid, text, text[]) from public, anon;
grant execute on function limite_transcricoes_dia() to authenticated;
grant execute on function reservar_transcricao(int) to authenticated;
grant execute on function enviar_redacao_com_fotos(uuid, text, text[]) to authenticated;
