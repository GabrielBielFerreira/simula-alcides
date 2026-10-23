-- Simula Alcides: painel da coordenação completo e simulado por área.
--
-- * Simulado por área: cada simulado ganha "filhos", um por área do ENEM, com as mesmas
--   questões daquela área. A prova, a entrega e a correção seguem iguais (o filho é um
--   simulado comum); o catálogo mostra os filhos dentro do cartão do simulado completo.
-- * Painel: lista de estudantes com WhatsApp, e-mail e provas em andamento; ficha de cada
--   estudante com o desempenho por área em cada simulado.

-- ---------------------------------------------------------------------------
-- Simulado por área
-- ---------------------------------------------------------------------------

alter table simulados
  add column pai_id uuid references simulados (id) on delete cascade,
  add column area text references areas (codigo),
  add constraint area_so_no_filho check ((pai_id is null) = (area is null));

create unique index simulado_filho_por_area on simulados (pai_id, area) where pai_id is not null;

-- Cria (uma vez) os simulados por área de um simulado completo. Tempo: 3 min por questão,
-- arredondado para cima de 5 em 5. Nascem despublicados se o pai estiver despublicado.
create function gerar_simulados_por_area(p_pai uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  pai simulados;
  a record;
  v_id uuid;
  v_base text;
  v_criados int := 0;
begin
  select * into pai from simulados where id = p_pai and pai_id is null;
  if not found then
    raise exception 'Simulado completo não encontrado.';
  end if;
  v_base := regexp_replace(pai.titulo, ' · (versão online|\d+ questões)$', '');

  for a in
    select q.area, count(*)::int as n
      from simulado_questoes sq
      join questao_versoes v on v.id = sq.questao_versao_id
      join questoes q on q.id = v.questao_id
     where sq.simulado_id = p_pai
     group by q.area
  loop
    if exists (select 1 from simulados where pai_id = p_pai and area = a.area) then
      continue;
    end if;
    insert into simulados (
      titulo, instrucoes, modalidade, tipo, duracao_min, abre_em, fecha_em, liberacao,
      resultado_liberado, publicado, is_demo, criado_por, pai_id, area
    ) values (
      v_base || ' · ' || case a.area
        when 'LC' then 'Linguagens'
        when 'CH' then 'Ciências Humanas'
        when 'CN' then 'Ciências da Natureza'
        when 'MT' then 'Matemática'
      end,
      pai.instrucoes, pai.modalidade, pai.tipo,
      greatest(10, ceil(a.n * 3 / 5.0)::int * 5),
      pai.abre_em, pai.fecha_em, pai.liberacao, pai.resultado_liberado, pai.publicado,
      pai.is_demo, pai.criado_por, p_pai, a.area
    )
    returning id into v_id;

    insert into simulado_questoes (simulado_id, ordem, questao_versao_id)
    select v_id, row_number() over (order by sq.ordem), sq.questao_versao_id
      from simulado_questoes sq
      join questao_versoes v on v.id = sq.questao_versao_id
      join questoes q on q.id = v.questao_id
     where sq.simulado_id = p_pai and q.area = a.area;

    insert into simulado_polos (simulado_id, polo_id)
    select v_id, polo_id from simulado_polos where simulado_id = p_pai;

    v_criados := v_criados + 1;
  end loop;
  return v_criados;
end;
$$;

revoke all on function gerar_simulados_por_area(uuid) from public, anon, authenticated;

-- Catálogo com o pai e a área de cada simulado (substitui catalogo_simulados, que fica só
-- para o site antigo).
create function catalogo_com_areas()
returns table (
  id uuid, titulo text, instrucoes text, modalidade modalidade_simulado, tipo tipo_simulado,
  duracao_min int, abre_em timestamptz, fecha_em timestamptz, total_questoes int, areas text[],
  tentativa_id uuid, tentativa_status status_tentativa, percentual numeric,
  pai_id uuid, area text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.titulo, s.instrucoes, s.modalidade, s.tipo, s.duracao_min, s.abre_em, s.fecha_em,
         (select count(*)::int from simulado_questoes sq where sq.simulado_id = s.id),
         (select array_agg(distinct q.area) from simulado_questoes sq
            join questao_versoes v on v.id = sq.questao_versao_id
            join questoes q on q.id = v.questao_id
           where sq.simulado_id = s.id),
         t.id, t.status, t.percentual,
         s.pai_id, s.area
    from simulados s
    left join lateral (
      select * from tentativas t
       where t.simulado_id = s.id and t.estudante_id = auth.uid()
       order by t.iniciada_em desc limit 1
    ) t on true
   where s.publicado and auth.uid() is not null
   order by s.created_at, s.area
$$;

revoke all on function catalogo_com_areas() from public;
grant execute on function catalogo_com_areas() to authenticated;

-- O catálogo antigo segue para o site anterior, sem os simulados por área.
create or replace function catalogo_simulados()
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
   where s.publicado and s.pai_id is null and auth.uid() is not null
   order by s.created_at
$$;

-- ---------------------------------------------------------------------------
-- Painel da coordenação
-- ---------------------------------------------------------------------------

-- Lista de estudantes com contato e provas em andamento (substitui painel_estudantes).
create function painel_lista_estudantes(p_polo uuid default null)
returns table (
  estudante_id uuid, nome text, telefone text, email text, polo_id uuid, polo_nome text,
  vinculo vinculo_tipo, cursinho_externo text, cadastrado_em timestamptz,
  provas_entregues int, em_andamento int, media_percentual numeric, ultima_atividade timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.id, e.nome, e.telefone, u.email::text, e.polo_id, po.nome, e.vinculo, e.cursinho_externo,
         e.created_at,
         count(t.id) filter (where t.status <> 'em_andamento')::int,
         count(t.id) filter (where t.status = 'em_andamento')::int,
         round(avg(t.percentual) filter (where t.status <> 'em_andamento'), 1),
         greatest(max(t.entregue_em), max(t.iniciada_em))
    from perfis e
    left join polos po on po.id = e.polo_id
    left join auth.users u on u.id = e.id
    left join tentativas t on t.estudante_id = e.id
   where e.papel = 'estudante'
     and (p_polo is null or e.polo_id = p_polo)
     and (meu_papel() = 'admin' or (meu_papel() = 'coord_polo' and e.polo_id = meu_polo()))
   group by e.id, po.nome, u.email
   order by e.created_at desc
$$;

revoke all on function painel_lista_estudantes(uuid) from public;
grant execute on function painel_lista_estudantes(uuid) to authenticated;

-- Ficha de um estudante: perfil e cada simulado com acertos por área (só depois de entregue).
create function ficha_estudante(p_estudante uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when meu_papel() in ('admin', 'coord_polo') and posso_ver_estudante(p_estudante) then
    jsonb_build_object(
      'perfil', (
        select jsonb_build_object(
          'id', e.id, 'nome', e.nome, 'telefone', e.telefone, 'email', u.email,
          'papel', e.papel, 'vinculo', e.vinculo, 'polo_id', e.polo_id, 'polo', po.nome,
          'cursinho_externo', e.cursinho_externo, 'data_nascimento', e.data_nascimento,
          'cadastrado_em', e.created_at)
          from perfis e
          left join polos po on po.id = e.polo_id
          left join auth.users u on u.id = e.id
         where e.id = p_estudante),
      'tentativas', coalesce((
        select jsonb_agg(
                 jsonb_build_object(
                   'id', t.id, 'simulado', s.titulo, 'area', s.area, 'status', t.status,
                   'iniciada_em', t.iniciada_em, 'prazo_em', t.prazo_em,
                   'entregue_em', t.entregue_em, 'total', t.total, 'acertos', t.acertos,
                   'erros', t.erros, 'em_branco', t.em_branco, 'percentual', t.percentual,
                   'questoes', (select count(*) from simulado_questoes x where x.simulado_id = t.simulado_id),
                   'respondidas', (select count(*) from respostas r
                                    where r.tentativa_id = t.id and r.alternativa is not null),
                   'por_area', case when t.status <> 'em_andamento' then (
                     select jsonb_object_agg(pa.area, jsonb_build_object('total', pa.total, 'acertos', pa.acertos))
                       from (
                         select q.area, count(*) as total,
                                count(*) filter (where r.alternativa = v.gabarito) as acertos
                           from simulado_questoes sq
                           join questao_versoes v on v.id = sq.questao_versao_id
                           join questoes q on q.id = v.questao_id
                           left join respostas r on r.tentativa_id = t.id and r.questao_versao_id = v.id
                          where sq.simulado_id = t.simulado_id
                          group by q.area
                       ) pa
                   ) end
                 )
                 order by t.iniciada_em desc)
          from tentativas t
          join simulados s on s.id = t.simulado_id
         where t.estudante_id = p_estudante), '[]'::jsonb)
    )
  end
$$;

revoke all on function ficha_estudante(uuid) from public;
grant execute on function ficha_estudante(uuid) to authenticated;

-- Simulados por área dos simulados já publicados.
select gerar_simulados_por_area(id) from simulados where pai_id is null and publicado;
