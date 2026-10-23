-- Simula Alcides: redação com correção por IA (Gemini).
--
-- * Propostas ganham eixo, resumo e textos motivadores estruturados.
-- * O estudante envia pela função enviar_redacao (limite diário); a tabela redacoes deixa de
--   aceitar escrita direta, para o limite não ser contornado.
-- * O servidor do site (Vercel) reserva a correção (reservar_correcao), chama o Gemini e grava
--   o resultado com registrar_correcao_ia, que exige um segredo conhecido só pelo servidor.
--   O hash do segredo fica em privado.segredos (fora da API) e é gravado à parte, fora do repo.
-- * Nada de dados pessoais vai para a IA: só o tema, os textos motivadores e o texto.

-- ---------------------------------------------------------------------------
-- Esquema
-- ---------------------------------------------------------------------------

alter table propostas_redacao
  add column eixo text,
  add column resumo text,
  -- [{"texto": "...", "fonte": "..."}]
  add column textos jsonb not null default '[]'::jsonb,
  add column ordem int not null default 0;

alter table redacoes
  add column tentativas_ia int not null default 0;

alter table correcoes_redacao
  -- [{"trecho": "...", "competencia": 0..4, "tipo": "forte"|"melhorar", "comentario": "..."}]
  add column trechos jsonb not null default '[]'::jsonb,
  -- [{"competencia": 0..4, "titulo": "...", "texto": "..."}]
  add column plano jsonb not null default '[]'::jsonb;

create index redacoes_estudante on redacoes (estudante_id, created_at desc);
create index correcoes_redacao_redacao on correcoes_redacao (redacao_id, created_at desc);

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table privado.segredos (
  nome text primary key,
  hash_sha256 text not null,
  created_at timestamptz not null default now()
);

-- Escrita em redacoes só pelas funções abaixo.
revoke insert, update, delete on redacoes from anon, authenticated;
revoke insert, update, delete on correcoes_redacao from anon;

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------

-- Limite de redações enviadas por estudante por dia (horário do Recife).
create function limite_redacoes_dia() returns int
language sql immutable as $$ select 3 $$;

-- Envia a redação do estudante logado. Devolve o id.
create function enviar_redacao(p_proposta uuid, p_texto text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
  v_hoje int;
  v_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from perfis where id = auth.uid()) then
    raise exception 'sem_login';
  end if;
  if not exists (select 1 from propostas_redacao where id = p_proposta and ativa) then
    raise exception 'proposta_inexistente';
  end if;
  if char_length(v_texto) < 300 then raise exception 'texto_curto'; end if;
  if char_length(v_texto) > 6000 then raise exception 'texto_longo'; end if;

  select count(*) into v_hoje
    from redacoes
   where estudante_id = auth.uid()
     and created_at >= (date_trunc('day', now() at time zone 'America/Recife') at time zone 'America/Recife');
  if v_hoje >= limite_redacoes_dia() then raise exception 'limite_diario'; end if;

  insert into redacoes (estudante_id, proposta_id, texto, palavras, status, enviada_em)
  values (auth.uid(), p_proposta, v_texto,
          coalesce(array_length(regexp_split_to_array(v_texto, '\s+'), 1), 0),
          'enviada', now())
  returning id into v_id;
  return v_id;
end
$$;

-- O servidor pede para corrigir uma redação do estudante logado: confere dono e status,
-- conta a tentativa (até 4 por redação) e devolve só o que vai para a IA.
create function reservar_correcao(p_redacao uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r redacoes;
  p propostas_redacao;
begin
  select * into r from redacoes where id = p_redacao for update;
  if r.id is null or r.estudante_id is distinct from auth.uid() then
    raise exception 'redacao_inexistente';
  end if;
  if r.status <> 'enviada' then raise exception 'ja_corrigida'; end if;
  if r.tentativas_ia >= 4 then raise exception 'tentativas_esgotadas'; end if;
  update redacoes set tentativas_ia = tentativas_ia + 1 where id = r.id;
  select * into p from propostas_redacao where id = r.proposta_id;
  return jsonb_build_object(
    'tema', p.titulo,
    'textos', coalesce((select jsonb_agg(t ->> 'texto') from jsonb_array_elements(p.textos) t),
                       '[]'::jsonb),
    'texto', r.texto);
end
$$;

-- Grava a correção da IA. Só o servidor conhece o segredo.
create function registrar_correcao_ia(
  p_segredo text,
  p_redacao uuid,
  p_modelo text,
  p_competencias jsonb,
  p_trechos jsonb,
  p_plano jsonb,
  p_tokens_entrada int,
  p_tokens_saida int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_nota int;
begin
  if not exists (
    select 1 from privado.segredos
     where nome = 'correcao_ia'
       and hash_sha256 = encode(extensions.digest(coalesce(p_segredo, ''), 'sha256'), 'hex')
  ) then
    raise exception 'nao_autorizado';
  end if;
  perform 1 from redacoes where id = p_redacao and status = 'enviada' for update;
  if not found then raise exception 'ja_corrigida'; end if;
  if jsonb_typeof(p_competencias) <> 'array' or jsonb_array_length(p_competencias) <> 5 then
    raise exception 'competencias_invalidas';
  end if;
  select sum(least(200, greatest(0, (c ->> 'nota')::int))) into v_nota
    from jsonb_array_elements(p_competencias) c;

  insert into correcoes_redacao
    (redacao_id, tipo, modelo, versao_rubrica, competencias, nota_total, trechos, plano,
     tokens_entrada, tokens_saida)
  values
    (p_redacao, 'ia', p_modelo, 'enem-ia-v1', p_competencias, v_nota,
     coalesce(p_trechos, '[]'::jsonb), coalesce(p_plano, '[]'::jsonb),
     p_tokens_entrada, p_tokens_saida)
  returning id into v_id;
  update redacoes set status = 'corrigida' where id = p_redacao;
  return v_id;
end
$$;

revoke all on function limite_redacoes_dia() from public, anon;
revoke all on function enviar_redacao(uuid, text) from public, anon;
revoke all on function reservar_correcao(uuid) from public, anon;
revoke all on function registrar_correcao_ia(text, uuid, text, jsonb, jsonb, jsonb, int, int) from public, anon;
grant execute on function limite_redacoes_dia() to authenticated;
grant execute on function enviar_redacao(uuid, text) to authenticated;
grant execute on function reservar_correcao(uuid) to authenticated;
grant execute on function registrar_correcao_ia(text, uuid, text, jsonb, jsonb, jsonb, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Propostas
-- ---------------------------------------------------------------------------

update propostas_redacao
   set eixo = 'Tecnologia e cidadania',
       resumo = 'Deepfakes, notícias falsas e o papel da educação digital.',
       ordem = 1,
       textos = jsonb_build_array(
         jsonb_build_object('fonte', 'UNESCO, Recomendação sobre a Ética da Inteligência Artificial (2021).',
           'texto', 'Em 2021, a Conferência Geral da UNESCO aprovou a Recomendação sobre a Ética da Inteligência Artificial, primeiro instrumento normativo global dedicado ao tema. O documento estabelece que o desenvolvimento e a utilização da IA devem respeitar os direitos humanos, a dignidade da pessoa humana, a transparência, a responsabilização e a supervisão humana. Além disso, recomenda que os Estados promovam a alfabetização midiática e informacional para que a população seja capaz de identificar conteúdos manipulados e utilizar as tecnologias digitais de forma crítica e ética.'),
         jsonb_build_object('fonte', 'Texto de apoio do simulado da Rede.',
           'texto', 'A rápida evolução da inteligência artificial tornou possível a criação de imagens, vídeos e áudios sintéticos, conhecidos como deepfakes, que podem ser utilizados para desinformar a população, fraudar identidades e comprometer processos democráticos. Diante desse cenário, organismos internacionais destacam que o enfrentamento desse problema depende não apenas da regulamentação tecnológica, mas também da educação digital da população e da cooperação entre governos, empresas e sociedade civil.'))
 where titulo = 'Os desafios para combater a desinformação produzida por inteligência artificial no Brasil';

insert into propostas_redacao (titulo, eixo, resumo, ordem, textos) values
('Desafios para garantir mobilidade urbana inclusiva no Brasil', 'Cidade e direitos',
 'Transporte, acessibilidade e o direito de circular pela cidade.', 2,
 jsonb_build_array(
   jsonb_build_object('texto', 'Em muitas capitais brasileiras, quem mora nas periferias passa mais de duas horas por dia no transporte coletivo. Esse tempo deixa de ser dedicado ao estudo, ao descanso e à convivência com a família.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'),
   jsonb_build_object('texto', 'Uma calçada sem rampa, um ônibus sem elevador ou um terminal sem informação sonora transformam o deslocamento em barreira para pessoas com deficiência e pessoas idosas.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'),
   jsonb_build_object('texto', 'São direitos sociais a educação, a saúde, a alimentação, o trabalho, a moradia, o transporte, o lazer, a segurança […].', 'fonte', 'Constituição Federal de 1988, art. 6º (redação dada pela Emenda Constitucional nº 90, de 2015).'))),
('Caminhos para democratizar o acesso à leitura nas periferias', 'Cultura e educação',
 'Bibliotecas, rodas de leitura e o direito ao livro em todos os bairros.', 3,
 jsonb_build_array(
   jsonb_build_object('texto', 'Em muitos bairros, a biblioteca pública mais próxima fica a mais de uma hora de ônibus. Para quem trabalha e estuda, essa distância pesa tanto quanto o preço de um livro.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'),
   jsonb_build_object('texto', 'Rodas de leitura em praças, escolas e associações de moradores aproximam os livros da vida cotidiana e formam novos leitores de todas as idades.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'),
   jsonb_build_object('texto', 'Ler é também um modo de participar da vida pública: quem lê compreende melhor seus direitos e encontra mais caminhos para expressá-los.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'))),
('A valorização do trabalho de cuidado na sociedade brasileira', 'Trabalho e sociedade',
 'Quem cuida de crianças, idosos e doentes, e quem reconhece esse trabalho.', 4,
 jsonb_build_array(
   jsonb_build_object('texto', 'Cuidar de crianças, de pessoas idosas e de pessoas doentes é um trabalho que sustenta a vida em sociedade, mas, quando é feito em casa, raramente é remunerado ou reconhecido.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.'),
   jsonb_build_object('texto', 'As mulheres dedicam, em média, muito mais horas semanais aos afazeres domésticos e ao cuidado de pessoas do que os homens, segundo as pesquisas de uso do tempo do IBGE.', 'fonte', 'Texto de apoio escrito para o Simula Alcides, com base em dados do IBGE.'),
   jsonb_build_object('texto', 'Creches, centros-dia para pessoas idosas e licenças parentais ampliadas são exemplos de políticas que dividem a responsabilidade do cuidado entre famílias, Estado e sociedade.', 'fonte', 'Texto de apoio escrito para o Simula Alcides.')));
