-- Simula Alcides: redação escrita à mão, enviada só por foto.
--
-- * O estudante escreve na folha, tira foto e o navegador envia a imagem (já reduzida) para o
--   bucket privado redacoes-fotos, na pasta com o próprio id: <uid>/<arquivo>.jpg.
-- * enviar_redacao_foto cria a redação com as fotos (mesmo limite diário do enviar_redacao).
-- * O servidor do site reserva a correção (reservar_correcao), baixa as fotos com a sessão do
--   estudante e manda as imagens ao Gemini, que lê a letra e corrige. registrar_correcao_foto
--   grava a transcrição da IA como texto da redação e a correção (mesmo segredo do servidor).
-- * Foto ilegível: o estudante troca as fotos da mesma redação (trocar_fotos_redacao), sem gastar
--   outra redação do dia.
-- * Quem vê a redação (o próprio estudante, a coordenação do polo, administração, professores)
--   vê as fotos.

alter table redacoes
  add column fotos text[] not null default '{}',
  add column trocas_fotos int not null default 0;

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

-- Confere que as fotos são do estudante logado e já estão no bucket.
create function fotos_validas(p_fotos text[]) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  f text;
begin
  if p_fotos is null or cardinality(p_fotos) < 1 or cardinality(p_fotos) > 3 then
    return false;
  end if;
  foreach f in array p_fotos loop
    if f is null
       or split_part(f, '/', 1) <> auth.uid()::text
       or not exists (select 1 from storage.objects o
                       where o.bucket_id = 'redacoes-fotos' and o.name = f) then
      return false;
    end if;
  end loop;
  return true;
end
$$;

create function enviar_redacao_foto(p_proposta uuid, p_fotos text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_hoje int;
  v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from perfis where id = auth.uid()) then
    raise exception 'sem_login';
  end if;
  if not exists (select 1 from propostas_redacao where id = p_proposta and ativa) then
    raise exception 'proposta_inexistente';
  end if;
  if not fotos_validas(p_fotos) then raise exception 'fotos_invalidas'; end if;

  select count(*) into v_hoje
    from redacoes
   where estudante_id = auth.uid()
     and created_at >= (date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife');
  if v_hoje >= limite_redacoes_dia() then raise exception 'limite_diario'; end if;

  insert into redacoes (estudante_id, proposta_id, texto, palavras, status, enviada_em, fotos)
  values (auth.uid(), p_proposta, '', 0, 'enviada', now(), p_fotos)
  returning id into v_id;
  return v_id;
end
$$;

-- Foto ilegível ou errada: troca as fotos de uma redação ainda sem correção (até 3 vezes).
create function trocar_fotos_redacao(p_redacao uuid, p_fotos text[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  r redacoes;
begin
  select * into r from redacoes where id = p_redacao for update;
  if r.id is null or r.estudante_id is distinct from auth.uid() then
    raise exception 'redacao_inexistente';
  end if;
  if r.status <> 'enviada' or cardinality(r.fotos) = 0 then raise exception 'ja_corrigida'; end if;
  if r.trocas_fotos >= 3 then raise exception 'trocas_esgotadas'; end if;
  if not fotos_validas(p_fotos) then raise exception 'fotos_invalidas'; end if;
  update redacoes
     set fotos = p_fotos, trocas_fotos = trocas_fotos + 1, tentativas_ia = 0
   where id = r.id;
end
$$;

-- Grava a transcrição feita pela IA e a correção (registrar_correcao_ia confere o segredo).
create function registrar_correcao_foto(
  p_segredo text,
  p_redacao uuid,
  p_texto text,
  p_modelo text,
  p_competencias jsonb,
  p_trechos jsonb,
  p_plano jsonb,
  p_tokens_entrada int,
  p_tokens_saida int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_texto text := left(btrim(coalesce(p_texto, '')), 8000);
begin
  if not exists (
    select 1 from privado.segredos
     where nome = 'correcao_ia'
       and hash_sha256 = encode(extensions.digest(coalesce(p_segredo, ''), 'sha256'), 'hex')
  ) then
    raise exception 'nao_autorizado';
  end if;
  update redacoes
     set texto = v_texto,
         palavras = case when v_texto = '' then 0
                         else coalesce(array_length(regexp_split_to_array(v_texto, '\s+'), 1), 0) end
   where id = p_redacao and status = 'enviada' and cardinality(fotos) > 0;
  if not found then raise exception 'ja_corrigida'; end if;
  return registrar_correcao_ia(p_segredo, p_redacao, p_modelo, p_competencias, p_trechos,
                               p_plano, p_tokens_entrada, p_tokens_saida);
end
$$;

revoke all on function fotos_validas(text[]) from public, anon, authenticated;
revoke all on function enviar_redacao_foto(uuid, text[]) from public, anon;
revoke all on function trocar_fotos_redacao(uuid, text[]) from public, anon;
revoke all on function registrar_correcao_foto(text, uuid, text, text, jsonb, jsonb, jsonb, int, int) from public, anon;
grant execute on function enviar_redacao_foto(uuid, text[]) to authenticated;
grant execute on function trocar_fotos_redacao(uuid, text[]) to authenticated;
grant execute on function registrar_correcao_foto(text, uuid, text, text, jsonb, jsonb, jsonb, int, int) to authenticated;
