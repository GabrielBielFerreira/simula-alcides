-- Simula Alcides: funções para a primeira versão em produção.
--
-- * Cria o perfil automaticamente no cadastro (e-mail ou Google).
-- * Catálogo com total de questões sem expor o gabarito.
-- * Correção questão a questão só depois da entrega.
-- * Painel da coordenação: admin vê todos os polos, coordenador vê o próprio.

-- ---------------------------------------------------------------------------
-- Perfil criado junto com o usuário
-- ---------------------------------------------------------------------------

create function criar_perfil_do_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_vinculo vinculo_tipo := 'independente';
  v_polo uuid;
  v_externo text := nullif(trim(m ->> 'cursinho_externo'), '');
  v_nasc date;
begin
  begin
    v_vinculo := coalesce(nullif(m ->> 'vinculo', '')::vinculo_tipo, 'independente');
  exception when others then
    v_vinculo := 'independente';
  end;
  select id into v_polo from polos where id::text = m ->> 'polo_id';
  begin
    v_nasc := nullif(m ->> 'data_nascimento', '')::date;
  exception when others then
    v_nasc := null;
  end;
  if v_vinculo = 'rede' and v_polo is null then v_vinculo := 'independente'; end if;
  if v_vinculo = 'outro_cursinho' and v_externo is null then v_vinculo := 'independente'; end if;

  insert into perfis (id, nome, data_nascimento, vinculo, polo_id, cursinho_externo)
  values (
    new.id,
    coalesce(nullif(trim(m ->> 'nome'), ''), nullif(trim(m ->> 'full_name'), ''),
             nullif(trim(m ->> 'name'), ''), split_part(new.email, '@', 1), 'Estudante'),
    v_nasc,
    v_vinculo,
    case when v_vinculo = 'rede' then v_polo end,
    case when v_vinculo = 'outro_cursinho' then v_externo end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger perfil_no_cadastro
  after insert on auth.users
  for each row execute function criar_perfil_do_usuario();

-- O estudante completa o perfil depois do login com Google.
create function atualizar_meu_perfil(
  p_nome text, p_data_nascimento date, p_vinculo vinculo_tipo, p_polo uuid, p_cursinho_externo text
) returns perfis
language plpgsql security definer set search_path = public as $$
declare
  p perfis;
begin
  if auth.uid() is null then
    raise exception 'Faça login para continuar.';
  end if;
  update perfis set
    nome = coalesce(nullif(trim(p_nome), ''), nome),
    data_nascimento = coalesce(p_data_nascimento, data_nascimento),
    vinculo = p_vinculo,
    polo_id = case when p_vinculo = 'rede' or papel = 'coord_polo' then coalesce(p_polo, polo_id) else polo_id end,
    cursinho_externo = case when p_vinculo = 'outro_cursinho' then p_cursinho_externo end
  where id = auth.uid()
  returning * into p;
  return p;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estudante
-- ---------------------------------------------------------------------------

create function catalogo_simulados()
returns table (
  id uuid, titulo text, instrucoes text, modalidade modalidade_simulado, tipo tipo_simulado,
  duracao_min int, abre_em timestamptz, fecha_em timestamptz, total_questoes int, areas text[],
  tentativa_id uuid, tentativa_status status_tentativa, percentual numeric
)
language sql stable security definer set search_path = public as $$
  select s.id, s.titulo, s.instrucoes, s.modalidade, s.tipo, s.duracao_min, s.abre_em, s.fecha_em,
         (select count(*)::int from simulado_questoes sq where sq.simulado_id = s.id),
         (select array_agg(distinct q.area) from simulado_questoes sq
            join questao_versoes v on v.id = sq.questao_versao_id
            join questoes q on q.id = v.questao_id
           where sq.simulado_id = s.id),
         t.id, t.status, t.percentual
    from simulados s
    left join lateral (
      select * from tentativas t
       where t.simulado_id = s.id and t.estudante_id = auth.uid()
       order by t.iniciada_em desc limit 1
    ) t on true
   where s.publicado and auth.uid() is not null
   order by s.created_at
$$;

-- Correção questão a questão, só para tentativas entregues.
create function resultado_da_tentativa(p_tentativa uuid)
returns table (
  ordem int, area text, enunciado text, imagem_path text, alternativas jsonb,
  resposta alternativa, gabarito alternativa
)
language sql stable security definer set search_path = public as $$
  select sq.ordem, q.area, v.enunciado, v.imagem_path, v.alternativas, r.alternativa, v.gabarito
    from tentativas t
    join simulados s on s.id = t.simulado_id
    join simulado_questoes sq on sq.simulado_id = t.simulado_id
    join questao_versoes v on v.id = sq.questao_versao_id
    join questoes q on q.id = v.questao_id
    left join respostas r on r.tentativa_id = t.id and r.questao_versao_id = v.id
   where t.id = p_tentativa
     and posso_ver_estudante(t.estudante_id)
     and t.status <> 'em_andamento'
     and (s.liberacao = 'imediata' or s.resultado_liberado or sou_equipe())
   order by sq.ordem
$$;

-- ---------------------------------------------------------------------------
-- Coordenação
-- ---------------------------------------------------------------------------

create function painel_polos()
returns table (
  polo_id uuid, nome text, bairro text, estudantes int, ativos int,
  provas_entregues int, media_percentual numeric
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.bairro,
         (select count(*)::int from perfis e where e.polo_id = p.id and e.papel = 'estudante'),
         (select count(distinct t.estudante_id)::int from tentativas t join perfis e on e.id = t.estudante_id
           where e.polo_id = p.id and t.status = 'entregue'),
         (select count(*)::int from tentativas t join perfis e on e.id = t.estudante_id
           where e.polo_id = p.id and t.status = 'entregue'),
         (select round(avg(t.percentual), 1) from tentativas t join perfis e on e.id = t.estudante_id
           where e.polo_id = p.id and t.status = 'entregue')
    from polos p
   where p.ativo
     and (meu_papel() = 'admin' or (meu_papel() = 'coord_polo' and p.id = meu_polo()))
   order by p.ordem
$$;

create function painel_estudantes(p_polo uuid default null)
returns table (
  estudante_id uuid, nome text, polo_id uuid, vinculo vinculo_tipo, cadastrado_em timestamptz,
  provas_entregues int, media_percentual numeric, ultima_prova timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.id, e.nome, e.polo_id, e.vinculo, e.created_at,
         count(t.id) filter (where t.status = 'entregue')::int,
         round(avg(t.percentual) filter (where t.status = 'entregue'), 1),
         max(t.entregue_em)
    from perfis e
    left join tentativas t on t.estudante_id = e.id
   where e.papel = 'estudante'
     and (p_polo is null or e.polo_id = p_polo)
     and (meu_papel() = 'admin' or (meu_papel() = 'coord_polo' and e.polo_id = meu_polo()))
   group by e.id
   order by e.nome
$$;

revoke all on function atualizar_meu_perfil(text, date, vinculo_tipo, uuid, text) from public;
revoke all on function catalogo_simulados() from public;
revoke all on function resultado_da_tentativa(uuid) from public;
revoke all on function painel_polos() from public;
revoke all on function painel_estudantes(uuid) from public;
grant execute on function atualizar_meu_perfil(text, date, vinculo_tipo, uuid, text) to authenticated;
grant execute on function catalogo_simulados() to authenticated;
grant execute on function resultado_da_tentativa(uuid) to authenticated;
grant execute on function painel_polos() to authenticated;
grant execute on function painel_estudantes(uuid) to authenticated;
